import pino from "pino";
import { env } from "../config/env.js";

/**
 * Structured JSON logger (TASK-023, pino). Silent under tests. PII (auth tokens,
 * cookies, passwords) is redacted. `pinoLogger` is exported for pino-http; the
 * `logger` wrapper keeps a stable `(msg, meta)` call surface used across the app.
 */
export const pinoLogger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
  enabled: env.NODE_ENV !== "test",
  base: { service: "jago-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "*.password",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
  formatters: { level: (label) => ({ level: label }) },
});

type Meta = Record<string, unknown>;

export const logger = {
  debug: (msg: string, meta?: Meta) => pinoLogger.debug(meta ?? {}, msg),
  info: (msg: string, meta?: Meta) => pinoLogger.info(meta ?? {}, msg),
  warn: (msg: string, meta?: Meta) => pinoLogger.warn(meta ?? {}, msg),
  error: (msg: string, meta?: Meta) => pinoLogger.error(meta ?? {}, msg),
};
