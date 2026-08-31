import { describe, it, expect } from "vitest";
import {
  buildInvoiceNumber,
  MAX_INVOICE_LENGTH,
} from "../../src/services/payment/invoiceNumber.js";

/**
 * BL-140 + BL-148 regression suite (Wave 1.3).
 *
 * BL-140: the invoice number was the first 8 hex characters of the order UUID.
 * Two orders sharing those 8 characters got the SAME invoice number, and since
 * the webhook resolved it with `findFirst` against a column with no unique
 * constraint, a payment for one order silently fulfilled the other.
 *
 * BL-148: DOKU caps `invoice_number` at 30 characters for credit card channels
 * and rejects symbols for KKI. The hyphen in `JA-` violated the second.
 */

/**
 * The exact shape of the collision BL-140 describes: two different orders whose
 * UUIDs agree on the first 8 hex characters. Under the old scheme both became
 * "JA-DEADBEEF".
 */
const TWIN_A = "deadbeef-1111-4111-8111-111111111111";
const TWIN_B = "deadbeef-2222-4222-8222-222222222222";

describe("BL-140 — invoice numbers must identify exactly one order", () => {
  it("gives two orders sharing the first 8 hex characters different invoice numbers", () => {
    // The whole point. `slice(0, 8)` made these identical.
    expect(buildInvoiceNumber(TWIN_A)).not.toBe(buildInvoiceNumber(TWIN_B));
  });

  it("does not merely prefix the order id, which is what collided", () => {
    const legacy = `JA-${TWIN_A.slice(0, 8).toUpperCase()}`;
    expect(buildInvoiceNumber(TWIN_A)).not.toBe(legacy);
  });

  it("depends on every part of the UUID, including the last character", () => {
    const a = "0123456789ab4cde8f01234567890abc";
    const b = "0123456789ab4cde8f01234567890abd";
    expect(buildInvoiceNumber(a)).not.toBe(buildInvoiceNumber(b));
  });

  it("is deterministic, so a retried checkout reuses one identity", () => {
    expect(buildInvoiceNumber(TWIN_A)).toBe(buildInvoiceNumber(TWIN_A));
  });

  it("accepts the id with or without hyphens, identically", () => {
    expect(buildInvoiceNumber(TWIN_A)).toBe(buildInvoiceNumber(TWIN_A.replace(/-/g, "")));
  });

  it("keeps free and paid identities in separate namespaces", () => {
    expect(buildInvoiceNumber(TWIN_A, "free")).not.toBe(buildInvoiceNumber(TWIN_A, "paid"));
  });

  it("never produces the same invoice number for a thousand distinct orders", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const hex = i.toString(16).padStart(32, "0");
      seen.add(buildInvoiceNumber(hex));
    }
    expect(seen.size).toBe(1000);
  });

  it("refuses an order id that is not a UUID instead of degrading quietly", () => {
    // A weaker fallback here would reintroduce the very class of bug being fixed.
    expect(() => buildInvoiceNumber("not-a-uuid")).toThrow(/UUID/);
    expect(() => buildInvoiceNumber("")).toThrow(/UUID/);
  });
});

describe("BL-148 — DOKU's format constraints", () => {
  it("stays within the 30-character credit card limit", () => {
    expect(buildInvoiceNumber(TWIN_A).length).toBeLessThanOrEqual(MAX_INVOICE_LENGTH);
    expect(buildInvoiceNumber(TWIN_A, "free").length).toBeLessThanOrEqual(MAX_INVOICE_LENGTH);
  });

  it("contains no symbols — the hyphen in the old JA- prefix broke KKI", () => {
    expect(buildInvoiceNumber(TWIN_A)).toMatch(/^[A-Z0-9]+$/);
    expect(buildInvoiceNumber(TWIN_A, "free")).toMatch(/^[A-Z0-9]+$/);
  });

  it("holds both constraints at the extremes of the UUID range", () => {
    for (const hex of ["0".repeat(32), "f".repeat(32)]) {
      for (const kind of ["paid", "free"] as const) {
        const invoice = buildInvoiceNumber(hex, kind);
        expect(invoice.length).toBeLessThanOrEqual(MAX_INVOICE_LENGTH);
        expect(invoice).toMatch(/^[A-Z0-9]+$/);
      }
    }
  });

  it("is fixed width, so a truncated invoice number is visibly wrong", () => {
    const widths = new Set(
      ["0".repeat(32), "f".repeat(32), TWIN_A, TWIN_B].map((id) => buildInvoiceNumber(id).length),
    );
    expect(widths.size).toBe(1);
  });
});
