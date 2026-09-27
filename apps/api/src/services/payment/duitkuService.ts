import { createHmac } from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { safeEqual } from "../../lib/safeEqual.js";

const SANDBOX_URL = "https://sandbox.duitku.com";
const PRODUCTION_URL = "https://passport.duitku.com";

function baseUrl() {
  if (env.DUITKU_BASE_URL) return env.DUITKU_BASE_URL;
  // Fail-safe default: sandbox, never production, when unset (fixes the DOKU-era
  // docker-compose bug where an unset base URL silently defaulted to prod).
  return env.DUITKU_IS_PRODUCTION ? PRODUCTION_URL : SANDBOX_URL;
}

/** Default payment method when none or invalid is specified: BCA Virtual Account. */
export const DEFAULT_DUITKU_PAYMENT_METHOD = "BC";

/**
 * Duitku create-invoice signature (docs.duitku.com/api/en, "Create Invoice").
 * stringToSign = merchantCode + merchantOrderId + paymentAmount (NO separators,
 * amount LAST). Lowercase hex. This field order is DIFFERENT from the callback
 * signature (Section below) — do not share one helper between the two; a past
 * incident (BL-137, DOKU era) happened exactly because two different signing
 * contracts were made to share one function that only implemented one of them.
 */
function signInvoice(merchantCode: string, merchantOrderId: string, paymentAmount: number, apiKey: string): string {
  const stringToSign = `${merchantCode}${merchantOrderId}${paymentAmount}`;
  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

/**
 * Duitku callback signature. stringToSign = merchantCode + amount + merchantOrderId
 * (amount comes BEFORE merchantOrderId here — the reverse order from the invoice
 * signature above). Lowercase hex.
 */
function signCallback(merchantCode: string, amount: string, merchantOrderId: string, apiKey: string): string {
  const stringToSign = `${merchantCode}${amount}${merchantOrderId}`;
  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

/** Duitku transaction-status signature. stringToSign = merchantCode + merchantOrderId (no amount). */
function signStatusInquiry(merchantCode: string, merchantOrderId: string, apiKey: string): string {
  return createHmac("sha256", apiKey).update(`${merchantCode}${merchantOrderId}`).digest("hex");
}

type DuitkuOrderItem = { name: string; price: number; quantity: number };
type DuitkuCreateOrderResult = { invoiceNumber: string; paymentUrl: string };

/**
 * Create a Duitku invoice (POST /webapi/api/merchant/v2/inquiry). Returns a
 * hosted payment URL to redirect the buyer to. Dev fallback mirrors the old
 * DOKU behaviour: no credentials configured -> return a mock success URL so
 * checkout/order-creation can be exercised with zero gateway dependency.
 *
 * Supports dynamic channel codes (e.g., "SP" for QRIS, "BC" for BCA VA, "VC" for CC)
 * with graceful fallback to DEFAULT_DUITKU_PAYMENT_METHOD if a merchant channel is unconfigured.
 */
export async function createDuitkuOrder(
  merchantOrderId: string,
  items: DuitkuOrderItem[],
  totalAmount: number,
  callbackUrl: string,
  returnUrl: string,
  customerName: string,
  customerEmail: string,
  paymentMethod: string = DEFAULT_DUITKU_PAYMENT_METHOD
): Promise<DuitkuCreateOrderResult> {
  if (!env.DUITKU_MERCHANT_CODE || !env.DUITKU_API_KEY) {
    return {
      invoiceNumber: merchantOrderId,
      paymentUrl: `${env.WEB_URL}/payment/success?order=${merchantOrderId}&mock=1`,
    };
  }

  const paymentAmount = Math.round(totalAmount);
  const signature = signInvoice(env.DUITKU_MERCHANT_CODE, merchantOrderId, paymentAmount, env.DUITKU_API_KEY);

  async function executeInquiry(methodCode: string) {
    const body = JSON.stringify({
      merchantCode: env.DUITKU_MERCHANT_CODE,
      paymentAmount,
      paymentMethod: methodCode,
      merchantOrderId,
      productDetails: items.map((i) => i.name).join(", ").slice(0, 255) || "Pembayaran Hazl Academy",
      email: customerEmail,
      customerVaName: customerName,
      callbackUrl,
      returnUrl,
      signature,
    });

    const res = await fetch(`${baseUrl()}/webapi/api/merchant/v2/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Duitku API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      statusCode?: string;
      statusMessage?: string;
      paymentUrl?: string;
      reference?: string;
    };
    return data;
  }

  let data: { statusCode?: string; statusMessage?: string; paymentUrl?: string; reference?: string };
  try {
    data = await executeInquiry(paymentMethod);
    if ((data.statusCode !== "00" || !data.paymentUrl) && paymentMethod !== DEFAULT_DUITKU_PAYMENT_METHOD) {
      logger.warn(`Duitku inquiry non-00 with channel ${paymentMethod}, falling back to ${DEFAULT_DUITKU_PAYMENT_METHOD}`, { data });
      data = await executeInquiry(DEFAULT_DUITKU_PAYMENT_METHOD);
    }
  } catch (err) {
    if (paymentMethod !== DEFAULT_DUITKU_PAYMENT_METHOD) {
      logger.warn(`Duitku inquiry error with channel ${paymentMethod}, retrying with ${DEFAULT_DUITKU_PAYMENT_METHOD}`, { err });
      data = await executeInquiry(DEFAULT_DUITKU_PAYMENT_METHOD);
    } else {
      throw err;
    }
  }

  if (data.statusCode !== "00" || !data.paymentUrl) {
    throw new Error(`Duitku API returned no payment url: ${JSON.stringify(data)}`);
  }
  return { invoiceNumber: merchantOrderId, paymentUrl: data.paymentUrl };
}

type DuitkuOrderStatus = {
  invoiceNumber: string;
  /** "00" successful | "01" processing | "02" failed or expired (Duitku collapses these two). */
  statusCode: string;
  amount: number | null;
};

/**
 * Ask Duitku what really happened to an invoice (POST /transactionStatus, JSON
 * body — NOT a GET-with-path-segment like DOKU's status endpoint was). Returns
 * null when Duitku has no record, or the call fails — caller must treat "no
 * answer" as "changed nothing", never as "expired" (same posture DOKU had).
 */
export async function getDuitkuOrderStatus(merchantOrderId: string): Promise<DuitkuOrderStatus | null> {
  if (!env.DUITKU_MERCHANT_CODE || !env.DUITKU_API_KEY) {
    logger.warn("duitku status inquiry skipped — no credentials configured", { merchantOrderId });
    return null;
  }

  const signature = signStatusInquiry(env.DUITKU_MERCHANT_CODE, merchantOrderId, env.DUITKU_API_KEY);
  const res = await fetch(`${baseUrl()}/webapi/api/merchant/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantCode: env.DUITKU_MERCHANT_CODE, merchantOrderId, signature }),
  });

  if (!res.ok) {
    logger.warn("duitku status inquiry non-2xx", { merchantOrderId, status: res.status });
    return null;
  }

  const body = (await res.json()) as { statusCode?: string; amount?: number | string };
  if (!body.statusCode) {
    logger.warn("duitku status inquiry returned no statusCode", { merchantOrderId });
    return null;
  }

  const rawAmount = body.amount;
  const amount = rawAmount === undefined || rawAmount === null ? null : Number(rawAmount);

  return {
    invoiceNumber: merchantOrderId,
    statusCode: body.statusCode,
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
  };
}

/**
 * Verify a Duitku callback's signature. No requestTarget/timestamp parameters —
 * Duitku's callback signature covers only merchantCode+amount+merchantOrderId,
 * with no per-delivery nonce or timestamp field at all (see docs/BACKLOG.md for
 * the replay-window discussion carried over from the DOKU migration decision).
 */
export function verifyDuitkuCallback(
  merchantCode: string,
  amount: string,
  merchantOrderId: string,
  receivedSignature: string
): boolean {
  if (!env.DUITKU_API_KEY) return env.NODE_ENV !== "production";
  if (!receivedSignature) return false;
  const expected = signCallback(merchantCode, amount, merchantOrderId, env.DUITKU_API_KEY);
  return safeEqual(expected.toLowerCase(), receivedSignature.trim().toLowerCase());
}
