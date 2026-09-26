import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/services/auth/hash.js";

describe("hashPassword", () => {
  it("returns a different string from the plain text", async () => {
    const plain = "TestPassword123";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
  });

  it("generates a bcrypt hash (starts with $2b$)", async () => {
    const hash = await hashPassword("anypassword");
    expect(hash).toMatch(/^\$2[ab]\$12\$/);
  });

  it("produces unique hashes for the same input (salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true when plain matches hash", async () => {
    const plain = "CorrectPassword1";
    const hash = await hashPassword(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });

  it("returns false when plain does not match hash", async () => {
    const hash = await hashPassword("correctPass");
    expect(await verifyPassword("wrongPass", hash)).toBe(false);
  });

  it("returns false for empty string against a valid hash", async () => {
    const hash = await hashPassword("notEmpty");
    expect(await verifyPassword("", hash)).toBe(false);
  });
});
