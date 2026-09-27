// Standalone Duitku smoke test (ported from the DOKU-era doku-smoke.mjs,
// BL-137). Calls Duitku's create-invoice endpoint directly with the
// signature scheme Duitku's own docs publish, so a non-"00" statusCode here
// means the credentials or signature scheme are wrong — no app, DB, or
// checkout route involved at all.
//
//   node scripts/duitku-smoke.mjs [path/to/.env]
//
// Default env path is apps/api/.env relative to the repo root. This creates
// a real Rp 10.000 invoice on whichever environment DUITKU_BASE_URL points
// at — keep it on sandbox unless a reviewer has authorised a live
// transaction (SSOT §9.6).
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

// Read credentials straight from apps/api/.env — never copied into another file.
const envPath =
  process.argv[2] ||
  new URL("../apps/api/.env", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const envVars = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) envVars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const merchantCode = envVars.DUITKU_MERCHANT_CODE;
const apiKey = envVars.DUITKU_API_KEY;
const base = envVars.DUITKU_BASE_URL || "https://sandbox.duitku.com";
const webUrl = envVars.WEB_URL || "https://academy.hazl.id";

if (!merchantCode || !apiKey) {
  console.error("Missing DUITKU_MERCHANT_CODE / DUITKU_API_KEY");
  process.exit(1);
}

const merchantOrderId = `SMOKE-${Date.now()}`;
const paymentAmount = 10000;

// Create-invoice signature: merchantCode + merchantOrderId + paymentAmount
// (no separators, amount LAST). Independently re-derived from Duitku's docs
// here, not imported from duitkuService.ts — same discipline the DOKU-era
// smoke test used, so this script can catch a real regression in the app's
// own signing code instead of just re-confirming it.
const signature = createHmac("sha256", apiKey)
  .update(`${merchantCode}${merchantOrderId}${paymentAmount}`)
  .digest("hex");

const body = JSON.stringify({
  merchantCode,
  paymentAmount,
  paymentMethod: "BC", // Virtual Account BCA — the only method wired so far.
  merchantOrderId,
  productDetails: "Duitku smoke test",
  email: "smoke@example.com",
  customerVaName: "Smoke Test",
  callbackUrl: `${webUrl}/api/webhooks/duitku`,
  returnUrl: `${webUrl}/payment/pending?orderId=${merchantOrderId}`,
  signature,
});

const res = await fetch(`${base}/webapi/api/merchant/v2/inquiry`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
if (res.ok) {
  try {
    const data = JSON.parse(text);
    console.log("\nstatusCode:", data.statusCode, data.statusMessage);
    if (data.paymentUrl) console.log("PAYMENT URL:", data.paymentUrl);
  } catch {}
}
