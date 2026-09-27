import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export async function sendWhatsApp(phone: string, message: string) {
  if (!env.FONNTE_TOKEN) {
    logger.info("WhatsApp not sent — FONNTE_TOKEN unset", { phone });
    return;
  }

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: env.FONNTE_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: phone, message }),
  });

  if (!res.ok) {
    logger.error("Fonnte send failed", { phone, status: res.status, body: await res.text() });
  }
}

export async function notifyPaymentSuccess(phone: string, name: string, courseName: string) {
  // `/belajar` has no page.tsx (only /belajar/[slug]) — it 404s. The learner's
  // course list lives at /dashboard/kursus, which is what the sidebar links to.
  const msg = `Halo ${name}! 🎉\n\nPembayaran kursus *${courseName}* telah berhasil dikonfirmasi.\n\nSilakan login dan mulai belajar di: ${env.WEB_URL}/dashboard/kursus\n\nSalam,\nHazl Academy`;
  await sendWhatsApp(phone, msg);
}

/** Private Class post-purchase onboarding (degrade-safe, same as notifyPaymentSuccess). */
export async function notifyPrivateClassWelcome(
  phone: string,
  name: string,
  courseTitle: string,
  waGroupLink?: string | null,
) {
  const groupLine = waGroupLink ? `\n\nJoin grup mentoring Anda di sini: ${waGroupLink}` : "";
  const msg = `Halo ${name}! 🎉\n\nSelamat bergabung di Private Class *${courseTitle}*.${groupLine}\n\nAdmin kami akan menghubungi Anda untuk konfirmasi data dan proses onboarding.\n\nSalam,\nHazl Academy`;
  await sendWhatsApp(phone, msg);
}
