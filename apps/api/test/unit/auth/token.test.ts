import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from "../../../src/services/auth/token.js";

const mockUser = { sub: "user-123", email: "test@example.com", roles: ["student"] as never };
const mockRefresh = { sub: "user-123", jti: "jti-abc" };

describe("signAccessToken / verifyAccessToken", () => {
  it("round-trips correctly", () => {
    const token = signAccessToken(mockUser);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(mockUser.sub);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.roles).toEqual(mockUser.roles);
  });

  it("throws for an invalid secret", () => {
    const token = signAccessToken(mockUser);
    const tampered = token.slice(0, -4) + "xxxx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("signRefreshToken / verifyRefreshToken", () => {
  it("round-trips correctly", () => {
    const token = signRefreshToken(mockRefresh);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(mockRefresh.sub);
    expect(payload.jti).toBe(mockRefresh.jti);
  });

  it("throws for tampered token", () => {
    const token = signRefreshToken(mockRefresh);
    const tampered = token.slice(0, -5) + "zzzzz";
    expect(() => verifyRefreshToken(tampered)).toThrow();
  });
});

describe("hashToken", () => {
  it("is deterministic (same input → same output)", () => {
    const h1 = hashToken("rawtoken");
    const h2 = hashToken("rawtoken");
    expect(h1).toBe(h2);
  });

  it("produces different outputs for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("returns a 64-char hex string (SHA-256)", () => {
    expect(hashToken("test")).toMatch(/^[0-9a-f]{64}$/);
  });
});
