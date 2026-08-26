import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

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
    payment: { payment_due_date: 60 },
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
