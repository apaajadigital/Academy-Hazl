import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { env } from "../../config/env.js";
import type { Role } from "../../types/index.js";

// Reviewed auth policy (H3): short-lived access token, 7-day refresh token.
// Keep refreshTokenExpiry() and the refresh cookie maxAge (modules/auth/shared.ts)
// in sync with REFRESH_TTL.
export const ACCESS_TTL = "15m";
export const REFRESH_TTL = "7d";
export const REFRESH_COOKIE = "jg_refresh";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  roles: Role[];
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // Pin the algorithm so a forged token can't select a weaker/none alg.
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshTokenPayload;
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7); // must match REFRESH_TTL (7d)
  return d;
}
