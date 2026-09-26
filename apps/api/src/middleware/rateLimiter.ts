import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { errorResponse } from "../types/index.js";

const isDev = env.NODE_ENV === "development";

// App-wide limiter. Auth routes additionally get their own stricter limiter
// (authLimiter below, mounted on /api/auth in app.ts), so this ceiling only
// governs non-auth traffic in practice.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi dalam 15 menit."));
  },
});

// H2: mounted on the whole /api/auth router so every auth endpoint (including
// /reset-password, /refresh, /verify-email, and OAuth callbacks) is covered by
// an auth-specific limit instead of falling through to the looser generalLimiter.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("RATE_LIMITED", "Terlalu banyak permintaan autentikasi. Coba lagi dalam 15 menit."));
  },
});

// Per-route limiter for credential-guessing surfaces (login, register,
// forgot-password). Same ceiling as authLimiter; kept separate so those routes
// can be tightened independently without affecting the rest of /api/auth.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("RATE_LIMITED", "Terlalu banyak percobaan login. Coba lagi dalam 15 menit."));
  },
});

