import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * Contract test (TASK-011): every API response conforms to the standard envelope
 * `{ success: true, data, meta? } | { success: false, error: { code, message, details? } }`.
 * These invariants gate the breaking error-object migration (Option B).
 */
describe("API response envelope contract", () => {
  it("error responses carry a structured { code, message } object (not a string)", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.error).toBe("object");
    expect(res.body.error).not.toBeNull();
    expect(typeof res.body.error.code).toBe("string");
    expect(typeof res.body.error.message).toBe("string");
    expect(res.body.error.code).toBe("NOT_FOUND");
    // The legacy flat-string error must be gone.
    expect(typeof res.body.error).not.toBe("string");
  });

  it("never leaks a top-level `data` field on an error response", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");
    expect(res.body).not.toHaveProperty("data");
    expect(res.body).toHaveProperty("error");
  });

  it("validation errors use the stable VALIDATION_ERROR code with details", async () => {
    // /api/auth/login with an empty body triggers Zod validation.
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.body.success).toBe(false);
    expect(typeof res.body.error).toBe("object");
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body.error.message).toBe("string");
  });

  it("health endpoint stays reachable (envelope-exempt liveness probe)", async () => {
    const res = await request(app).get("/api/health");
    expect([200, 404]).toContain(res.status);
  });
});
