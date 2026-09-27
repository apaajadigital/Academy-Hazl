import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison (BL-34). Prevents timing side-channel on
 * payment-gateway signature verification. Compares raw UTF-8 bytes; unequal
 * lengths short-circuit false (both DOKU and Duitku signatures are
 * fixed-length hex/base64 HMAC-SHA256, so length is not itself secret).
 *
 * Gateway-neutral — extracted from the old dokuService.ts so it survives the
 * Duitku migration instead of being duplicated or lost with that file.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
