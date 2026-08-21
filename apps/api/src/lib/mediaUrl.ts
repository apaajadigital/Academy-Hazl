import { z } from "zod";

/**
 * Validation for admin-supplied media URLs (cover images, thumbnails).
 *
 * Those fields used to be `z.string().url()`, which accepts only an ABSOLUTE
 * URL. That was correct while the only way to fill them was pasting a link to
 * an external host, but the admin upload buttons post to `/api/upload/image`
 * and get back a ROOT-RELATIVE path (`/uploads/images/<file>`) — a value the
 * `.url()` rule rejects with a 400, so the freshly uploaded image could never
 * be saved. This accepts both shapes and nothing else.
 *
 * Deliberately NOT `startsWith("/")`: a protocol-relative `//evil.example` also
 * starts with `/` and resolves to a THIRD-PARTY origin when used as an `<img
 * src>`, which would let an admin field become an off-site beacon. Requiring
 * the `/uploads/` prefix keeps a relative value pointing at our own storage.
 */
const UPLOADS_PREFIX = "/uploads/";

export function isLocalUploadUrl(value: string): boolean {
  // `//uploads/...` is protocol-relative, not local — reject before the prefix
  // test, which would otherwise pass it through.
  if (value.startsWith("//")) return false;
  return value.startsWith(UPLOADS_PREFIX);
}

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A cover/thumbnail URL: either a full `http(s)://` URL or a path produced by
 * our own upload endpoints. `.max(2048)` mirrors the practical URL ceiling and
 * stops an unbounded string reaching the database.
 */
export const mediaUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (value) => isLocalUploadUrl(value) || isAbsoluteHttpUrl(value),
    "URL harus berupa tautan http(s) lengkap atau hasil unggahan (/uploads/...).",
  );
