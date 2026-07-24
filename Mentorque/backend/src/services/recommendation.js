import { prisma } from "../lib/prisma.js";
import { embedText, cosineSimilarity, ruleScore, explain, clamp01, DEFAULT_WEIGHTS } from "./embeddings.js";

// Re-exported for callers/tests that only need the pure scoring pieces.
export { DEFAULT_WEIGHTS, cosineSimilarity, embedText };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** Ensure a mentor's cached embedding exists/is fresh; recompute if description changed since last embed. */
export async function ensureMentorEmbedding(mentor) {
  if (mentor.embedding && mentor.embeddingModel) return mentor;
  const { vector, model } = await embedText(mentor.description || "");
  return prisma.user.update({
    where: { id: mentor.id },
    data: { embedding: vector, embeddingModel: model },
    include: { tags: true },
  });
}

/**
 * Stage 1 — vectorless RAG retrieval: embed the user's request, cosine-rank
 * all mentors by semantic similarity to their description, return the top N
 * as candidates for the LLM to reason over (keeps the LLM prompt small and
 * grounded instead of dumping the whole mentor table into context).
 */
export async function retrieveCandidateMentors(userDescription, topN = 8) {
  const { vector: queryVector } = await embedText(userDescription);
  const mentors = await prisma.user.findMany({ where: { role: "MENTOR" }, include: { tags: true } });

  const scored = [];
  for (let mentor of mentors) {
    mentor = await ensureMentorEmbedding(mentor);
    const semantic = cosineSimilarity(queryVector, mentor.embedding || []);
    scored.push({ mentor, semantic });
  }
  scored.sort((a, b) => b.semantic - a.semantic);
  return scored.slice(0, topN);
}

/**
 * Stage 2 — LLM reasoning: given the shortlisted candidates + call-type
 * priorities, ask the model to pick and justify the top 3. Falls back to a
 * transparent deterministic weighted-scoring explanation if no LLM key is
 * configured, so the endpoint always returns a usable, explainable result.
 */
async function rankWithLLM({ user, callType, candidates, weights }) {
  const prompt = buildPrompt({ user, callType, candidates, weights });

  if (OPENAI_API_KEY) {
    try {
      return await callOpenAI(prompt);
    } catch (e) {
      console.warn("[recommendation] OpenAI failed, trying Gemini:", e.message);
    }
  }
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(prompt);
    } catch (e) {
      console.warn("[recommendation] Gemini failed, using deterministic fallback:", e.message);
    }
  }
  return deterministicRanking({ user, callType, candidates, weights });
}

function buildPrompt({ user, callType, candidates, weights }) {
  const candidateBlock = candidates
    .map(
      ({ mentor, semantic }, i) => `
[${i}] ${mentor.name}
  description: ${mentor.description || "(none)"}
  tags: ${(mentor.tags || []).map((t) => t.name).join(", ") || "(none)"}
  domain: ${mentor.domain || "(unknown)"}, company: ${mentor.company || "(unknown)"}, bigTech: ${mentor.isBigTech}
  yearsExperience: ${mentor.yearsExperience ?? "?"}, communicationScore: ${mentor.communicationScore ?? "?"}
  semanticSimilarity: ${semantic.toFixed(3)}`
    )
    .join("\n");

  return `You are a mentor-matching assistant for a mentoring platform. Rank the best 3 mentors for this user.

Call type: ${callType.label} (${callType.key})
Call type priority weights: ${JSON.stringify(weights)}
User description: ${user.description || "(none provided)"}
User tags: ${(user.tags || []).map((t) => t.name).join(", ") || "(none)"}

Candidate mentors:
${candidateBlock}

Respond with ONLY valid JSON, no prose, no markdown fences, in this exact shape:
{"results":[{"candidateIndex":0,"score":0.0,"confidence":0.0,"reasoning":"..."}, ...]}
- Include exactly the top 3 candidates, ranked best first.
- score and confidence are 0-1 floats.
- reasoning is 1-2 sentences explaining the fit for this specific call type.`;
}

async function callOpenAI(prompt) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
  const data = await resp.json();
  return { parsed: JSON.parse(data.choices[0].message.content), model: OPENAI_MODEL };
}

async function callGemini(prompt) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const data = await resp.json();
  const text = data.candidates[0].content.parts[0].text;
  return { parsed: JSON.parse(text), model: GEMINI_MODEL };
}

/** Transparent, explainable fallback when no LLM key is configured. */
function deterministicRanking({ user, callType, candidates, weights }) {
  const userTags = (user.tags || []).map((t) => t.name);
  const scored = candidates.map(({ mentor, semantic }, i) => {
    const rule = ruleScore(mentor, userTags, callType.key, weights);
    const score = 0.6 * rule + 0.4 * semantic;
    return {
      candidateIndex: i,
      score,
      confidence: Math.min(0.95, 0.5 + score / 2),
      reasoning: explain(mentor, callType.key, semantic),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return { parsed: { results: scored.slice(0, 3) }, model: "deterministic-weighted-v1" };
}

/**
 * Full pipeline: retrieve candidates by embedding similarity, then rank the
 * top 3 with reasoning via LLM (or deterministic fallback). Persists the
 * result as a Recommendation row for audit/history.
 */
export async function recommendMentors({ userId, callTypeKey }) {
  const [user, callType] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { tags: true } }),
    prisma.callType.findUnique({ where: { key: callTypeKey } }),
  ]);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (!callType) throw Object.assign(new Error("Unknown call type"), { status: 404 });

  const candidates = await retrieveCandidateMentors(user.description || "", 8);
  if (candidates.length === 0) {
    return { results: [], model: "none", note: "No mentors available" };
  }

  const weights = { ...DEFAULT_WEIGHTS[callType.key], ...(callType.weights || {}) };
  const { parsed, model } = await rankWithLLM({ user, callType, candidates, weights });

  const results = (parsed.results || []).map((r) => {
    const candidate = candidates[r.candidateIndex]?.mentor;
    if (!candidate) return null;
    return {
      mentorId: candidate.id,
      name: candidate.name,
      score: clamp01(r.score),
      confidence: clamp01(r.confidence),
      reasoning: r.reasoning,
    };
  }).filter(Boolean);

  await prisma.recommendation.create({
    data: { userId: user.id, callTypeId: callType.id, results, model },
  });

  return { results, model };
}
