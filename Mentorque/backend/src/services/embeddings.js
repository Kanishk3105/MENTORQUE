import crypto from "crypto";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

// Call-type-specific weighting, editable per row in the CallType table
// (`weights` json). These are the seeded defaults from the brief:
//   Resume Revamp        -> prefer Big Tech mentors
//   Job Market Guidance   -> prefer communication experts
//   Mock Interview        -> prefer same-domain mentors
export const DEFAULT_WEIGHTS = {
  RESUME_REVAMP: { bigTech: 0.45, communication: 0.15, domainMatch: 0.1, semantic: 0.3 },
  JOB_MARKET_GUIDANCE: { bigTech: 0.1, communication: 0.45, domainMatch: 0.15, semantic: 0.3 },
  MOCK_INTERVIEW: { bigTech: 0.1, communication: 0.15, domainMatch: 0.45, semantic: 0.3 },
};

/**
 * Turn text into a fixed-length embedding vector.
 * Primary path: HuggingFace Inference API (feature-extraction).
 * Offline fallback: a deterministic hashed bag-of-words vector so the
 * pipeline still produces meaningful (if cruder) semantic similarity without
 * any API key — used in local/dev/seed/test environments. This is the
 * "vectorless RAG" fallback: no vector DB / pgvector extension required,
 * embeddings are just JSON float arrays compared with cosine similarity.
 */
export async function embedText(text) {
  const clean = (text || "").trim();
  if (!clean) return { vector: new Array(384).fill(0), model: "empty" };

  if (HF_API_KEY) {
    try {
      const resp = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: clean, options: { wait_for_model: true } }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const vector = Array.isArray(data[0]) ? meanPool(data) : data;
        return { vector, model: HF_MODEL };
      }
      console.warn("[embeddings] HF embedding failed, falling back:", resp.status);
    } catch (e) {
      console.warn("[embeddings] HF embedding error, falling back:", e.message);
    }
  }

  return { vector: hashEmbed(clean), model: "hashed-fallback-v1" };
}

function meanPool(tokenVectors) {
  const dim = tokenVectors[0].length;
  const out = new Array(dim).fill(0);
  for (const tok of tokenVectors) {
    for (let i = 0; i < dim; i++) out[i] += tok[i];
  }
  return out.map((v) => v / tokenVectors.length);
}

/** Deterministic 384-dim embedding from token hashes — no external calls. */
function hashEmbed(text, dim = 384) {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  for (const tok of tokens) {
    const hash = crypto.createHash("sha256").update(tok).digest();
    for (let i = 0; i < dim; i++) {
      // spread hash bytes across the vector, signed
      vec[i] += (hash[i % hash.length] - 128) / 128;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Rule-based score (0-1ish) combining Big Tech / communication / domain-match against call-type weights. */
export function ruleScore(mentor, tags, callTypeKey, weights) {
  const w = weights || DEFAULT_WEIGHTS[callTypeKey] || DEFAULT_WEIGHTS.MOCK_INTERVIEW;
  const bigTech = mentor.isBigTech ? 1 : 0;
  const communication = (mentor.communicationScore ?? 50) / 100;
  const mentorTagNames = new Set((mentor.tags || []).map((t) => t.name.toLowerCase()));
  const userTagNames = new Set((tags || []).map((t) => t.toLowerCase()));
  const domainMatch =
    (mentor.domain && userTagNames.has(mentor.domain.toLowerCase())) ||
    [...mentorTagNames].some((t) => userTagNames.has(t))
      ? 1
      : 0;
  return bigTech * w.bigTech + communication * w.communication + domainMatch * w.domainMatch;
}

/** Human-readable explanation for the deterministic fallback ranking. */
export function explain(mentor, callTypeKey, semantic) {
  const bits = [];
  if (callTypeKey === "RESUME_REVAMP" && mentor.isBigTech) bits.push(`is a Big Tech mentor (${mentor.company || "top-tier company"})`);
  if (callTypeKey === "JOB_MARKET_GUIDANCE" && (mentor.communicationScore ?? 0) >= 70) bits.push(`has a strong communication score (${mentor.communicationScore}/100)`);
  if (callTypeKey === "MOCK_INTERVIEW" && mentor.domain) bits.push(`works in the same domain (${mentor.domain})`);
  if (semantic > 0.4) bits.push("their profile closely matches your description");
  if (bits.length === 0) bits.push("their profile is a reasonable overall fit");
  return `Recommended because ${bits.join(" and ")}.`;
}

export function clamp01(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}
