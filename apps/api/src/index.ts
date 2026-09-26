// Must be the first import so Sentry instruments everything that follows.
import "./instrument.js";
import { app } from "./app.js";
import { closeQueues } from "./jobs/queues.js";
import { logger } from "./lib/logger.js";

const port = process.env.PORT ?? 4000;

const server = app.listen(Number(port), "0.0.0.0", () => {
  logger.info("API started", { port: Number(port) });
});

async function shutdown(signal: string): Promise<void> {
  logger.info("API shutting down", { signal });
  server.close();
  await closeQueues();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
