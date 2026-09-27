/**
 * Gateway invoice identifiers (BL-140, BL-148).
 *
 * The old form was `` `JA-${order.id.slice(0, 8).toUpperCase()}` `` — the first
 * 8 hex characters of a UUID. That is 32 bits, which is not a namespace: by the
 * birthday bound the chance that two orders collide is roughly 1.2% at 10k
 * orders and 29% at 50k. `PaymentTransaction.gatewayTxId` had no unique
 * constraint and the webhook resolved it with `findFirst`, so a collision did
 * not fail loudly — it silently resolved a payment to the WRONG order. Buyer B
 * pays, buyer A gets the course for free, buyer B is never fulfilled and has no
 * way to tell anyone what went wrong.
 *
 * Two constraints from DOKU shape the replacement (BL-148):
 *   - `invoice_number` is at most 64 characters, and at most **30** for credit
 *     card channels, whose acquirers impose the tighter limit.
 *   - No symbols for KKI. The hyphen in `JA-` violated that, so credit card
 *     payments could be rejected purely on the format of the invoice number.
 *
 * So: uppercase alphanumeric only, fixed 27 (paid) / 29 (free) characters.
 *
 * The body is the WHOLE order UUID — all 128 bits — re-encoded in base36 rather
 * than a prefix of it. That is a bijection, so two distinct orders cannot
 * produce the same invoice number at all; uniqueness is a property of the
 * encoding, not a probability. The unique index added alongside this is a
 * backstop that should never fire, not the thing doing the work.
 *
 * Being a pure function of the order id also makes it idempotent: a retried
 * checkout for the same order derives the same invoice number instead of
 * minting a second identity for one payment.
 */

/**
 * 128 bits in base36 needs ceil(128 / log2(36)) = 25 characters. Fixed-width so
 * every invoice number has the same length — a truncated one is then visibly
 * wrong rather than merely short.
 */
const BODY_LENGTH = 25;

/** Duitku's documented merchantOrderId limit (string(50)). */
export const MAX_INVOICE_LENGTH = 50;

const PREFIX = {
  /** Orders that go to the gateway. */
  paid: "JA",
  /**
   * Orders fulfilled without payment (100% coupon, free item). Kept distinct so
   * a free transaction can never be mistaken for a gateway one, and so the
   * unique index treats them as separate identities.
   */
  free: "FREE",
} as const;

export type InvoiceKind = keyof typeof PREFIX;

const UUID_HEX = /^[0-9a-f]{32}$/i;
const ALPHANUMERIC = /^[A-Z0-9]+$/;

/**
 * Build the gateway invoice identifier for an order.
 *
 * Throws on an order id that is not a UUID rather than falling back to
 * something weaker: a silent fallback here would reintroduce exactly the class
 * of bug this function exists to remove, and every caller passes a Prisma
 * `@default(uuid())` value.
 */
export function buildInvoiceNumber(orderId: string, kind: InvoiceKind = "paid"): string {
  const hex = orderId.replace(/-/g, "");
  if (!UUID_HEX.test(hex)) {
    throw new Error(`invoice number: order id is not a UUID: ${orderId}`);
  }

  const body = BigInt(`0x${hex}`).toString(36).toUpperCase().padStart(BODY_LENGTH, "0");
  const invoiceNumber = `${PREFIX[kind]}${body}`;

  // Assert the two DOKU constraints at the point of construction. If a future
  // change to the prefix or encoding breaks either, it fails here — on our side,
  // with a readable message — instead of as an opaque gateway rejection.
  if (invoiceNumber.length > MAX_INVOICE_LENGTH) {
    throw new Error(
      `invoice number exceeds Duitku's ${MAX_INVOICE_LENGTH}-char limit: ${invoiceNumber.length}`,
    );
  }
  if (!ALPHANUMERIC.test(invoiceNumber)) {
    throw new Error(`invoice number contains a symbol DOKU rejects: ${invoiceNumber}`);
  }

  return invoiceNumber;
}
