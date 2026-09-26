// Standalone DOKU smoke test (BL-137). Calls the Checkout API directly with the
// signature scheme DOKU publishes, so a 401 here means the credentials or the
// scheme are wrong — no app, DB, or auth involved.
//
//   node scripts/doku-smoke.mjs [path/to/.env]
//
// Default env path is apps/api/.env relative to the repo root. Creates a real
// Rp 10.000 order on whichever environment DOKU_BASE_URL points at — keep it on
// the sandbox unless a reviewer has authorised a live transaction (SSOT 9.6).
import { createHmac, createHash, randomUUID } from "node:crypto";

// Read credentials straight from apps/api/.env — never copied to another file.
import { readFileSync } from "node:fs";
const envPath =
  process.argv[2] || new URL("../apps/api/.env", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const envVars = {};
for (const line of readFileSync(envPath, "utf8").split(String.fromCharCode(10))) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) envVars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const clientId = envVars.DOKU_CLIENT_ID;
const secretKey = envVars.DOKU_SECRET_KEY;
const base = envVars.DOKU_BASE_URL || "https://api-sandbox.doku.com";
const webUrl = envVars.WEB_URL || "https://jagoakademi.com";

if (!clientId || !secretKey) {
  console.error("Missing DOKU_CLIENT_ID / DOKU_SECRET_KEY");
  process.exit(1);
}

const invoiceNumber = `SMOKE-${Date.now()}`;
const requestId = randomUUID();
const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const body = JSON.stringify({
  order: {
    invoice_number: invoiceNumber,
    line_items: [{ name: "Smoke Test Item", price: 10000, quantity: 1 }],
    amount: 10000,
    currency: "IDR",
    callback_url: `${webUrl}/payment/success?order=${invoiceNumber}`,
    auto_redirect: true,
    pending_return_url: `${webUrl}/payment/pending?order=${invoiceNumber}`,
  },
  payment: { payment_due_date: 60 },
  customer: { name: "Smoke Test", email: "smoke@example.com" },
});

const digest = createHash("sha256").update(body, "utf8").digest("base64");
const components = [
  `Client-Id:${clientId}`,
  `Request-Id:${requestId}`,
  `Request-Timestamp:${timestamp}`,
  `Request-Target:/checkout/v1/payment`,
  `Digest:${digest}`,
].join("\n");
const signature = createHmac("sha256", secretKey).update(components).digest("base64");

const res = await fetch(`${base}/checkout/v1/payment`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Client-Id": clientId,
    "Request-Id": requestId,
    "Request-Timestamp": timestamp,
    Signature: `HMACSHA256=${signature}`,
  },
  body,
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
if (res.ok) {
  try { console.log("\nPAYMENT URL:", JSON.parse(text).response.payment.url); } catch {}
}
