import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-unit-tests";

let authenticate, requireRole, jwt;

before(async () => {
  jwt = (await import("jsonwebtoken")).default;
  ({ authenticate, requireRole } = await import("../src/middleware/auth.js"));
});

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

describe("authenticate", () => {
  test("rejects requests with no token", () => {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;
    authenticate(req, res, () => (nextCalled = true));
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  test("rejects an invalid/garbage token", () => {
    const req = { headers: { authorization: "Bearer not-a-real-token" } };
    const res = mockRes();
    authenticate(req, res, () => {});
    assert.equal(res.statusCode, 401);
  });

  test("accepts a valid token and attaches user info to req", () => {
    const token = jwt.sign({ userId: "u1", role: "ADMIN", email: "a@b.com" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;
    authenticate(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, true);
    assert.equal(req.userId, "u1");
    assert.equal(req.userRole, "ADMIN");
  });

  test("rejects an expired token", () => {
    const token = jwt.sign({ userId: "u1", role: "USER" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    authenticate(req, res, () => {});
    assert.equal(res.statusCode, 401);
  });
});

describe("requireRole", () => {
  test("allows a matching role through", () => {
    const req = { userRole: "ADMIN" };
    const res = mockRes();
    let nextCalled = false;
    requireRole("ADMIN")(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, true);
  });

  test("blocks a non-matching role with 403", () => {
    const req = { userRole: "USER" };
    const res = mockRes();
    let nextCalled = false;
    requireRole("ADMIN")(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  test("accepts multiple allowed roles", () => {
    const req = { userRole: "MENTOR" };
    const res = mockRes();
    let nextCalled = false;
    requireRole("ADMIN", "MENTOR")(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, true);
  });
});
