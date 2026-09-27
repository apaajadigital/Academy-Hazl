import { Router } from "express";
import { verifyDuitkuCallback } from "../services/payment/duitkuService.js";
import { intakeDuitkuCallback } from "../services/payment/callbackIntake.js";
import { enqueueWebhook } from "../jobs/queues.js";

const router = Router();

router.post("/duitku", async (req, res, next) => {
  try {
    // Duitku's callback is application/x-www-form-urlencoded, parsed by
    // express.urlencoded() (see app.ts). The signature is a BODY field here,
    // not an HTTP header the way DOKU's was — there is no Client-Id/Request-Id/
    // Request-Timestamp header set to read, and no Request-Target to sign over.
    const body = req.body as Record<string, string | undefined>;
    const merchantCode = body.merchantCode ?? "";
    const amount = body.amount ?? "";
    const merchantOrderId = body.merchantOrderId ?? "";
    const signature = body.signature ?? "";

    if (!verifyDuitkuCallback(merchantCode, amount, merchantOrderId, signature)) {
      return res.status(401).send("Invalid signature");
    }

    const intake = await intakeDuitkuCallback(body);
    if (intake.outcome === "rejected") {
      // Deliberately non-2xx: Duitku retries, unhandled notification stays
      // visible instead of being consumed by a cheerful 200.
      return res.status(intake.httpStatus).send(intake.reason);
    }

    // Fulfillment offloaded to the webhook queue so Duitku gets a fast ack;
    // processed idempotently (with Redis disabled in dev/test this runs inline).
    await enqueueWebhook({ ...intake.job });

    return res.status(200).send("OK");
  } catch (err) {
    next(err);
  }
});

export default router;
