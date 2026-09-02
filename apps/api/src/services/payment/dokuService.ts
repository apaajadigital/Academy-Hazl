import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

/**
 * Constant-time string comparison (BL-34). Prevents a timing side-channel on
 * webhook signature verification. Compares the raw UTF-8 bytes; unequal lengths
 * short-circuit to false (DOKU signatures are fixed-length base64 HMAC-SHA256,
 * so length is not secret).
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const SANDBOX_URL = "https://api-sandbox.doku.com";
const PRODUCTION_URL = "https://api.doku.com";

function baseUrl() {
  // Explicit override wins; otherwise derive from the production flag.
  if (env.DOKU_BASE_URL) return env.DOKU_BASE_URL;
  return env.DOKU_IS_PRODUCTION ? PRODUCTION_URL : SANDBOX_URL;
}

/**
 * DOKU non-SNAP signature (developers.doku.com → Signature Component from
 * Request Header). Components are, in this exact order and labelling:
 *   Client-Id, Request-Id, Request-Timestamp, Request-Target, Digest
 * where Digest is the base64 SHA-256 of the raw JSON body and Request-Target is
 * the path only (no host, no query). The header value carries an `HMACSHA256=`
 * prefix; the bare base64 is rejected by DOKU.
 */
function sign(
  clientId: string,
  requestId: string,
  timestamp: string,
  requestTarget: string,
  body: string,
  secretKey: string
): string {
  const digest = createHash("sha256").update(body, "utf8").digest("base64");
  const components = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`,
  ].join("\n");
  return `${SIGNATURE_PREFIX}${createHmac("sha256", secretKey).update(components).digest("base64")}`;
}

/** Path DOKU signs for the Checkout request. */
const CHECKOUT_TARGET = "/checkout/v1/payment";

const SIGNATURE_PREFIX = "HMACSHA256=";

function stripPrefix(sig: string): string {
  return sig.startsWith(SIGNATURE_PREFIX) ? sig.slice(SIGNATURE_PREFIX.length) : sig;
}

export type DokuOrderItem = {
  name: string;
  price: number;
  quantity: number;
};

export type DokuCreateOrderResult = {
  invoiceNumber: string;
  paymentUrl: string;
};

export async function createDokuOrder(
  invoiceNumber: string,
  items: DokuOrderItem[],
  totalAmount: number,
  callbackUrl: string,
  customerName: string,
  customerEmail: string,
  /** Optional URL to redirect the user to if payment fails on DOKU's hosted page */
  failureUrl: string | undefined,
  /**
   * URL to redirect the user to when the payment is still awaiting settlement
   * (VA / bank transfer). Required — an async payment method that has nowhere to
   * return to strands the buyer without their transfer instructions (BL-56).
   */
  pendingUrl: string
): Promise<DokuCreateOrderResult> {
  if (!env.DOKU_CLIENT_ID || !env.DOKU_SECRET_KEY) {
    // Dev fallback: return a mock payment URL (always succeeds in dev)
    return {
      invoiceNumber,
      paymentUrl: `${env.WEB_URL}/payment/success?order=${invoiceNumber}&mock=1`,
    };
  }

  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = JSON.stringify({
    order: {
      invoice_number: invoiceNumber,
      line_items: items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      amount: totalAmount,
      currency: "IDR",
      callback_url: callbackUrl,
      auto_redirect: true,
      // Redirect user to failed page if payment is cancelled/failed on DOKU's page
      ...(failureUrl && { failure_return_url: failureUrl }),
      // Async methods (VA / bank transfer) settle later, so DOKU returns the user
      // here instead of to callback_url. Sent unconditionally — see BL-56.
      pending_return_url: pendingUrl,
    },
    payment: {
      payment_due_date: 60,
      // BL-147: restrict what DOKU displays. Omitting this field means "show
      // everything", which included four paylater methods whose
      // conditional-mandatory fields we never send — a buyer picking one hits
      // case code 02 after we have already written the order and the
      // paymentTransaction. Configured via DOKU_PAYMENT_METHOD_TYPES; an empty
      // list omits the field and restores DOKU's show-everything behaviour.
      ...(env.DOKU_PAYMENT_METHOD_TYPES.length > 0 && {
        payment_method_types: env.DOKU_PAYMENT_METHOD_TYPES,
      }),
    },
    customer: {
      name: customerName,
      email: customerEmail,
    },
  });

  const signature = sign(
    env.DOKU_CLIENT_ID,
    requestId,
    timestamp,
    CHECKOUT_TARGET,
    body,
    env.DOKU_SECRET_KEY
  );

  const res = await fetch(`${baseUrl()}/checkout/v1/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": env.DOKU_CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DOKU API error ${res.status}: ${err}`);
  }

  // DOKU wraps the Checkout payload in a top-level `response` object.
  const data = (await res.json()) as { response?: { payment?: { url?: string } } };
  const paymentUrl = data.response?.payment?.url;
  if (!paymentUrl) {
    throw new Error(`DOKU API returned no payment url: ${JSON.stringify(data)}`);
  }
  return { invoiceNumber, paymentUrl };
}

/**
 * Signature for GET endpoints (BL-144).
 *
 * Transcribed from developers.doku.com → "Signature from API Get Method":
 * FOUR components, one per line, and **no Digest** — "For GET Method, you don't
 * need to generate a Digest." Request-Target is the full path including the
 * invoice segment (their own example: `/orders/v1/status/INV-123123-12313`).
 *
 * Written as its own function rather than making `digest` optional in `sign()`:
 * the two schemes are different contracts, and BL-137 happened because one
 * signature helper quietly stood in for a scheme it did not implement.
 */
function signGet(
  clientId: string,
  requestId: string,
  timestamp: string,
  requestTarget: string,
  secretKey: string
): string {
  const components = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
  ].join("\n");
  return `${SIGNATURE_PREFIX}${createHmac("sha256", secretKey).update(components).digest("base64")}`;
}

/** Path of the non-SNAP Check Status API. The invoice number is a path segment. */
const STATUS_TARGET = "/orders/v1/status";

/**
 * What DOKU says actually happened to an order, as far as this codebase cares.
 * `transactionStatus` is DOKU's own vocabulary, passed through unmapped so the
 * caller decides what each value means.
 */
export type DokuOrderStatus = {
  invoiceNumber: string;
  /** PENDING | SUCCESS | FAILED | EXPIRED | REFUNDED | TIMEOUT | REDIRECT */
  transactionStatus: string;
  /** Settled amount as DOKU states it, or null when the reply omits it. */
  amount: number | null;
  channelId: string | null;
  transactionDate: string | null;
};

/**
 * Ask DOKU what really happened to an invoice (BL-144).
 *
 * `GET /orders/v1/status/{invoice_number}` — the official non-SNAP Check Status
 * API. Verified against the sandbox on 27 Aug 2026 with a real stuck invoice:
 * HTTP 200, `transaction.status: "SUCCESS"`, `order.amount: 1000`. Per §0.2 the
 * scheme is transcribed from the spec and confirmed on the positive path, not
 * inferred from our own outbound signing code.
 *
 * Returns null when DOKU has no record of the invoice, or when the call fails —
 * the caller must treat "no answer" as "changed nothing", never as "expired".
 */
export async function getDokuOrderStatus(invoiceNumber: string): Promise<DokuOrderStatus | null> {
  if (!env.DOKU_CLIENT_ID || !env.DOKU_SECRET_KEY) {
    // Same dev posture as createDokuOrder: without credentials there is no
    // gateway to ask, and inventing an answer here would let the reconciler
    // "resolve" orders in dev on the strength of a fabrication.
    logger.warn("doku status inquiry skipped — no credentials configured", { invoiceNumber });
    return null;
  }

  const requestTarget = `${STATUS_TARGET}/${invoiceNumber}`;
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const res = await fetch(`${baseUrl()}${requestTarget}`, {
    method: "GET",
    headers: {
      "Client-Id": env.DOKU_CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signGet(
        env.DOKU_CLIENT_ID,
        requestId,
        timestamp,
        requestTarget,
        env.DOKU_SECRET_KEY
      ),
    },
  });

  if (!res.ok) {
    // 404 is a legitimate answer ("DOKU never saw this invoice"), everything
    // else is an outage on one side or the other. Both mean: do not act.
    logger.warn("doku status inquiry returned non-2xx", {
      invoiceNumber,
      status: res.status,
      requestId,
    });
    return null;
  }

  const body = (await res.json()) as {
    order?: { invoice_number?: string; amount?: number | string };
    transaction?: { status?: string; date?: string };
    channel?: { id?: string };
  };

  const transactionStatus = body.transaction?.status;
  if (!transactionStatus) {
    logger.warn("doku status inquiry returned no transaction status", { invoiceNumber, requestId });
    return null;
  }

  const rawAmount = body.order?.amount;
  const amount = rawAmount === undefined || rawAmount === null ? null : Number(rawAmount);

  return {
    invoiceNumber: body.order?.invoice_number ?? invoiceNumber,
    transactionStatus: transactionStatus.trim().toUpperCase(),
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    channelId: body.channel?.id ?? null,
    transactionDate: body.transaction?.date ?? null,
  };
}

/**
 * How far off DOKU's stated notification time is from ours, in seconds.
 * Positive = the notification is in the past (the normal case). Returns null
 * when the timestamp is absent or unparseable.
 */
export function dokuTimestampSkewSeconds(timestamp: string): number | null {
  if (!timestamp) return null;
  const stamped = Date.parse(timestamp);
  if (Number.isNaN(stamped)) return null;
  return (Date.now() - stamped) / 1000;
}

/**
 * BL-145 — reject a notification whose signed timestamp is outside the window
 * we are willing to honour.
 *
 * Before this, `Request-Timestamp` was fed into the signature and then never
 * looked at again, so any notification DOKU ever sent stayed valid forever: a
 * captured FAILED/EXPIRED delivery could be replayed at any point in the future.
 *
 * The window is intentionally wide, and the reasoning lives on
 * `DOKU_WEBHOOK_MAX_AGE_SECONDS` in config/env.ts — rejecting a real payment
 * notification is a worse outcome than tolerating a replay that BL-138's atomic
 * claim already renders harmless.
 */
export function isDokuTimestampFresh(timestamp: string): boolean {
  const skew = dokuTimestampSkewSeconds(timestamp);
  // Unparseable or missing: the signature covers this field, so a value we
  // cannot read means we cannot reason about the notification at all.
  if (skew === null) return false;
  if (skew < 0) return -skew <= env.DOKU_WEBHOOK_MAX_FUTURE_SECONDS;
  return skew <= env.DOKU_WEBHOOK_MAX_AGE_SECONDS;
}

export function verifyDokuWebhook(
  clientId: string,
  requestId: string,
  timestamp: string,
  /** Path DOKU called us on, e.g. `/api/webhooks/doku` — part of the signature. */
  requestTarget: string,
  rawBody: string,
  receivedSignature: string
): boolean {
  // Fail closed in production (H9). Env validation already requires the secret
  // in production, so this branch is only reachable in dev/test — never trust an
  // unsigned webhook when running for real.
  if (!env.DOKU_SECRET_KEY) return env.NODE_ENV !== "production";
  if (!receivedSignature) return false;
  const expected = sign(clientId, requestId, timestamp, requestTarget, rawBody, env.DOKU_SECRET_KEY);
  // Compare the bare base64: DOKU documents the `HMACSHA256=` prefix, but
  // tolerating its absence costs nothing (the prefix carries no secret).
  return safeEqual(stripPrefix(expected), stripPrefix(receivedSignature));
}
