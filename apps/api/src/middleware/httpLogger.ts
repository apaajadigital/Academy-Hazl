import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { pinoLogger } from "../lib/logger.js";

/**
 * Request logging + correlation (TASK-023). Assigns/propagates an `X-Request-Id`
 * so every log line for a request shares `req.id`. Reduces noise on health checks.
 */
export const httpLogger = pinoHttp({
  logger: pinoLogger,
  genReqId: (req, res) => {
    const incoming = (req.headers["x-request-id"] as string) || randomUUID();
    res.setHeader("X-Request-Id", incoming);
    return incoming;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  autoLogging: {
    ignore: (req) => req.url === "/api/health" || req.url === "/api/ready",
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
