import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { embedText, cosineSimilarity, DEFAULT_WEIGHTS } from "../src/services/embeddings.js";

describe("cosineSimilarity", () => {
  test("returns 1 for identical vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0, 1], [1, 0, 1]) - 1) < 1e-9);
  });

  test("returns 0 for orthogonal vectors", () => {
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  });

  test("returns 0 for mismatched or empty vectors instead of throwing", () => {
    assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), 0);
    assert.equal(cosineSimilarity([], []), 0);
    assert.equal(cosineSimilarity(null, [1]), 0);
  });
});

describe("embedText (offline fallback — no HF_API_KEY in test env)", () => {
  test("returns a fixed-length vector for empty input", async () => {
    const { vector, model } = await embedText("");
    assert.equal(vector.length, 384);
    assert.equal(model, "empty");
  });

  test("is deterministic: same text -> same vector", async () => {
    const a = await embedText("frontend engineer with react experience");
    const b = await embedText("frontend engineer with react experience");
    assert.deepEqual(a.vector, b.vector);
  });

  test("similar descriptions score higher than unrelated ones", async () => {
    const query = await embedText("looking for a frontend engineer mentor");
    const close = await embedText("frontend engineer mentor with react experience");
    const far = await embedText("world history and ancient civilizations");
    const simClose = cosineSimilarity(query.vector, close.vector);
    const simFar = cosineSimilarity(query.vector, far.vector);
    assert.ok(simClose > simFar, `expected ${simClose} > ${simFar}`);
  });
});

describe("DEFAULT_WEIGHTS", () => {
  test("every call type's weights sum to roughly 1", () => {
    for (const [key, weights] of Object.entries(DEFAULT_WEIGHTS)) {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1) < 0.01, `${key} weights sum to ${sum}, expected ~1`);
    }
  });

  test("Resume Revamp weighs Big Tech highest", () => {
    const w = DEFAULT_WEIGHTS.RESUME_REVAMP;
    assert.ok(w.bigTech > w.communication && w.bigTech > w.domainMatch);
  });

  test("Job Market Guidance weighs communication highest", () => {
    const w = DEFAULT_WEIGHTS.JOB_MARKET_GUIDANCE;
    assert.ok(w.communication > w.bigTech && w.communication > w.domainMatch);
  });

  test("Mock Interview weighs domain match highest", () => {
    const w = DEFAULT_WEIGHTS.MOCK_INTERVIEW;
    assert.ok(w.domainMatch > w.bigTech && w.domainMatch > w.communication);
  });
});
