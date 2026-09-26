import crypto from "node:crypto";
import path from "node:path";
import { env } from "../config/env.js";

/**
 * Signed, short-lived access to purchase-gated e-book files.
 *
 * Why: `/uploads` is served by an unauthenticated `express.static` handler, so a
 * raw `fileUrl` under it is downloadable by anyone who guesses the path — the
 * purchase gate on `GET /api/ebooks/:slug/file` was bypassable. E-book binaries
 * therefore live under `<UPLOAD_DIR>/ebooks/` (blocked in app.ts) and are only
 * reachable through `GET /api/ebooks/:slug/download` with a valid signature.
 *
 * The HMAC key reuses JWT_SECRET on purpose: introducing a new *required* env
 * var would break every existing deploy. Rotating JWT_SECRET invalidates
 * outstanding download links, which is the desired behaviour anyway.
 */

/** URL path prefix under which the static handler exposes `env.UPLOAD_DIR`. */
const UPLOADS_URL_PREFIX = "/uploads/";

/** Sub-directory (inside `env.UPLOAD_DIR`) reserved for gated e-book files. */
export const EBOOK_UPLOAD_SUBDIR = "ebooks";

/** Default validity window for a generated download link. */
export const EBOOK_DOWNLOAD_TTL_SECONDS = 15 * 60;

/**
 * True when the stored `fileUrl` points at our own upload directory (a
 * `/`-relative path) rather than at an absolute third-party `http(s)://` URL.
 */
export function isLocalUploadPath(fileUrl: string): boolean {
  return fileUrl.startsWith("/");
}

/** Canonical string covered by the signature — every field is bound to it. */
function canonicalPayload(slug: string, userId: string, exp: number): string {
  return `${slug}:${userId}:${exp}`;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(payload).digest("hex");
}

/**
 * Mint a signature for `slug` + `userId` valid for `ttlSeconds`.
 * `exp` is a UNIX timestamp in seconds.
 */
export function signEbookDownload(
  slug: string,
  userId: string,
  ttlSeconds: number = EBOOK_DOWNLOAD_TTL_SECONDS,
): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { exp, sig: hmac(canonicalPayload(slug, userId, exp)) };
}

/**
 * Verify a download signature. Returns false for an expired link, a tampered
 * slug/userId/exp, or a malformed signature. The comparison is timing-safe so
 * an attacker cannot recover a valid signature byte-by-byte.
 */
export function verifyEbookDownload(
  slug: string,
  userId: string,
  exp: number,
  sig: string,
): boolean {
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(hmac(canonicalPayload(slug, userId, exp)), "utf8");
  const provided = Buffer.from(sig, "utf8");
  // timingSafeEqual throws on length mismatch, so length is checked first. The
  // length of the expected digest is public knowledge, so this leaks nothing.
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/**
 * Resolve a stored `fileUrl` to an absolute path inside the upload directory.
 * Returns null when the value escapes that directory (path traversal), is not a
 * local upload path, or contains a NUL byte — i.e. anything we refuse to serve.
 */
export function resolveEbookFilePath(fileUrl: string): string | null {
  if (!isLocalUploadPath(fileUrl)) return null;

  const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

  let pathname = fileUrl.split("?")[0]!.split("#")[0]!;
  try {
    // Decode first so percent-encoded traversal (`%2e%2e%2f`) is normalised
    // before path.resolve sees it, not after.
    pathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  // A NUL byte can truncate the path at the syscall boundary on some platforms.
  if (pathname.includes("\0")) return null;

  const relative = pathname.startsWith(UPLOADS_URL_PREFIX)
    ? pathname.slice(UPLOADS_URL_PREFIX.length)
    : pathname.replace(/^\/+/, "");

  const resolved = path.resolve(uploadRoot, relative);
  // Must be strictly *inside* the root: equal-to-root means a directory, and
  // a mere `startsWith(uploadRoot)` would also accept a sibling like `uploads-x`.
  if (!resolved.startsWith(uploadRoot + path.sep)) return null;

  return resolved;
}
