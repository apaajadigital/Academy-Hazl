import { Router } from "express";
import {
  verifyDokuWebhook,
  isDokuTimestampFresh,
  dokuTimestampSkewSeconds,
} from "../services/payment/dokuService.js";
import { intakeDokuNotification } from "../services/payment/webhookIntake.js";
import { enqueueWebhook } from "../jobs/queues.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/doku", async (req, res, next) => {
  try {
    const clientId = req.headers["client-id"] as string;
    const requestId = req.headers["request-id"] as string;
    const timestamp = req.headers["request-timestamp"] as string;
    const signature = req.headers["signature"] as string;

    const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;
    const bodyStr = rawBody ? rawBody.toString("utf8") : JSON.stringify(req.body);

    // DOKU signs Request-Target = the path of the notification URL registered in
    // the DOKU dashboard (e.g. /api/webhooks/doku). nginx proxies /api/* without
    // rewriting, so originalUrl matches what DOKU signed.
    const requestTarget = req.originalUrl.split("?")[0] ?? req.originalUrl;

    if (!verifyDokuWebhook(clientId, requestId, timestamp, requestTarget, bodyStr, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // BL-145: the signature covers `Request-Timestamp`, but nothing ever read it
    // back — so a correctly signed notification stayed valid forever and could be
    // replayed at will. Checked only AFTER the signature, so an unauthenticated
    // caller learns nothing about our clock.
    //
    // The skew is logged on every accepted notification, not just rejected ones:
    // the window in config/env.ts is deliberately wide because DOKU's retry
    // horizon has never been measured, and this log is what will make it
    // measurable from real traffic (BL-150).
    const skewSeconds = dokuTimestampSkewSeconds(timestamp);
    if (!isDokuTimestampFresh(timestamp)) {
      logger.error("doku notification timestamp outside the accepted window", {
        requestId,
        timestamp,
        skewSeconds,
      });
      return res.status(401).json({ error: "stale_timestamp" });
    }
    logger.info("doku notification timestamp skew", { requestId, skewSeconds });

    // BL-139/BL-142: validate, record `gatewayRaw`, and match the settled amount
    // against the order BEFORE anything is queued. This has to happen inline —
    // once the job is on the queue the response has already gone out, so a
    // verdict discovered on the worker could never reach DOKU.
    const intake = await intakeDokuNotification(req.body);
    if (intake.outcome === "rejected") {
      // Deliberately non-2xx: DOKU retries, and an unhandled notification stays
      // visible instead of being consumed by a cheerful 200.
      return res.status(intake.httpStatus).json({ error: intake.reason });
    }

    // Fulfillment (DB update, enrollment, affiliate, notifications) is offloaded
    // to the webhook queue so DOKU gets a fast ack; it is processed idempotently.
    // With Redis disabled (dev/test) it runs inline within this await, so a
    // processor throw surfaces here as a 500 and DOKU retries.
    await enqueueWebhook({ ...intake.job, requestId });

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
