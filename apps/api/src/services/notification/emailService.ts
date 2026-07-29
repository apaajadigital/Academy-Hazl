import { Resend } from "resend";
import QRCode from "qrcode";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

async function send(to: string, subject: string, html: string) {
  const client = getClient();
  if (!client) {
    logger.info("email not sent — RESEND_API_KEY unset", { to, subject });
    return;
  }
  await client.emails.send({
    from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
}

export async function sendPaymentSuccess(to: string, name: string, orderId: string, courseName: string, amount: number) {
  await send(
    to,
    `Pembayaran Berhasil — ${courseName}`,
    `<p>Halo <b>${name}</b>,</p>
     <p>Pembayaran Anda untuk kursus <b>${courseName}</b> sebesar <b>Rp ${amount.toLocaleString("id-ID")}</b> telah berhasil dikonfirmasi.</p>
     <p>Order ID: <code>${orderId}</code></p>
     <p>Silakan login dan mulai belajar: <a href="${env.WEB_URL}/dashboard/kursus">Mulai Belajar</a></p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

/**
 * Pending-payment reminder. The gateway `paymentUrl` stays the primary action —
 * it is the only thing that can actually take money.
 *
 * The secondary link exists because `/payment/pending` was a fully built page with
 * zero inbound references: nothing anywhere produced its URL, so a buyer who left
 * the gateway had no way back to a status view. That page reads `orderId` (and an
 * optional `expiresAt`) from the query string; only `orderId` is passed here since
 * the gateway expiry is not available at this call site.
 */
export async function sendPaymentPending(to: string, name: string, orderId: string, amount: number, paymentUrl: string) {
  await send(
    to,
    "Selesaikan Pembayaran Anda — Jago Akademi",
    `<p>Halo <b>${name}</b>,</p>
     <p>Order Anda sebesar <b>Rp ${amount.toLocaleString("id-ID")}</b> sedang menunggu pembayaran.</p>
     <p>Order ID: <code>${orderId}</code></p>
     <p><a href="${paymentUrl}">Klik di sini untuk menyelesaikan pembayaran</a></p>
     <p>Atau <a href="${env.WEB_URL}/payment/pending?orderId=${encodeURIComponent(orderId)}">lacak status pesanan</a> Anda.</p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  await send(
    to,
    "Verifikasi Email Anda — Jago Akademi",
    `<p>Halo <b>${name}</b>,</p>
     <p>Terima kasih telah mendaftar di Jago Akademi. Klik tautan berikut untuk memverifikasi email Anda:</p>
     <p><a href="${env.WEB_URL}/verifikasi-email?token=${token}">Verifikasi Email</a></p>
     <p>Tautan ini berlaku selama 24 jam.</p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

/**
 * Password-reset link. Until this shipped, POST /auth/forgot-password minted a
 * token, stored it, and then only `console.info`'d it in dev — so /reset-password
 * was unreachable in production and "Lupa Password" was a dead end for every user.
 *
 * Degrade-safe like the rest of this module (no-op when RESEND_API_KEY is unset):
 * the endpoint still returns its generic 200 so email enumeration stays impossible.
 */
export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  await send(
    to,
    "Reset Kata Sandi Anda — Jago Akademi",
    `<p>Halo <b>${name}</b>,</p>
     <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Klik tautan berikut untuk membuat kata sandi baru:</p>
     <p><a href="${env.WEB_URL}/reset-password?token=${token}">Reset Kata Sandi</a></p>
     <p>Tautan ini berlaku selama <b>1 jam</b>. Jika Anda tidak meminta reset kata sandi, abaikan email ini — kata sandi Anda tidak akan berubah.</p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

/**
 * B2B LMS seat invitation. `/lms/invite/[token]` existed and worked, but nothing
 * ever produced its URL — the invite row was written and the invitee was never
 * told, so the whole invite-a-colleague flow was unreachable.
 */
export async function sendLmsInviteEmail(to: string, tenantName: string, token: string) {
  await send(
    to,
    `Undangan Bergabung — ${tenantName} di Jago Akademi`,
    `<p>Halo,</p>
     <p>Anda diundang untuk bergabung ke ruang belajar <b>${tenantName}</b> di Jago Akademi.</p>
     <p><a href="${env.WEB_URL}/lms/invite/${token}">Terima Undangan</a></p>
     <p>Undangan ini berlaku selama <b>7 hari</b>. Anda perlu masuk (atau mendaftar) dengan alamat email <b>${to}</b> agar undangan dapat diterima.</p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

export async function sendEventFullRefund(to: string, name: string, orderId: string, eventName: string) {
  await send(
    to,
    `Kuota Event Penuh — Dana Dikembalikan | ${eventName}`,
    `<p>Halo <b>${name}</b>,</p>
     <p>Mohon maaf, kuota untuk event <b>${eventName}</b> ternyata sudah penuh saat pembayaran Anda dikonfirmasi.</p>
     <p>Pembayaran Anda akan <b>dikembalikan sepenuhnya (refund)</b> dan sedang kami proses.</p>
     <p>Order ID: <code>${orderId}</code></p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

/**
 * BL-63(c): registration confirmation + e-ticket. Until now the ONLY event email was
 * the failure path (`sendEventFullRefund`) — a successful registrant received
 * nothing at all even though `EventRegistration.ticketCode` is what the check-in
 * desk asks for.
 *
 * The ticket code is rendered as LARGE PLAIN TEXT, never only as a QR: the QR is
 * embedded as a `data:` URI and a lot of mail clients (Gmail web in particular)
 * strip inline data images, so the code must stay readable without it. QR
 * generation is wrapped in its own try/catch for the same reason — a QR failure
 * must not cost the registrant their e-ticket.
 *
 * Degrade-safe like every other template here (no-op when RESEND_API_KEY is unset,
 * BL-31: email is best-effort, registration still succeeds).
 */
export async function sendEventRegistrationConfirmed(
  to: string,
  params: {
    name: string;
    eventTitle: string;
    ticketCode: string;
    /** May arrive as an ISO string after a JSON round-trip through the queue. */
    startDate?: Date | string | null;
    location?: string | null;
    venue?: string | null;
    /** Event.type — "online" | "offline" | "hybrid". */
    eventType?: string | null;
    orderId?: string | null;
  },
) {
  const { name, eventTitle, ticketCode, startDate, location, venue, eventType, orderId } = params;

  // Re-wrap in `new Date` because the value may arrive as an ISO string after a
  // JSON round-trip through the BullMQ queue.
  const scheduleText = startDate
    ? `${new Date(startDate).toLocaleString("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      })} WIB`
    : "Akan diinformasikan menyusul";

  // An online event has no physical venue; show the channel instead of a blank row.
  const placeText =
    eventType === "online"
      ? "Online (tautan akan dikirimkan menjelang acara)"
      : [venue, location].filter(Boolean).join(", ") || "Akan diinformasikan menyusul";

  // Best-effort QR: the printed code above is the authoritative fallback.
  let qrHtml = "";
  try {
    const qrDataUrl = await QRCode.toDataURL(ticketCode, { margin: 1, width: 180 });
    qrHtml = `<p><img src="${qrDataUrl}" width="180" height="180" alt="QR Code Tiket ${ticketCode}" /></p>
     <p style="font-size:12px;color:#666">Jika QR di atas tidak tampil, cukup tunjukkan kode tiket tersebut.</p>`;
  } catch (err) {
    logger.warn("event ticket QR generation failed — sending code-only e-ticket", {
      ticketCode,
      err: String(err),
    });
  }

  await send(
    to,
    `E-Ticket Anda — ${eventTitle}`,
    `<p>Halo <b>${name}</b>,</p>
     <p>Pendaftaran Anda untuk event <b>${eventTitle}</b> telah <b>dikonfirmasi</b>. Berikut e-ticket Anda:</p>
     <p><b>Kode Tiket (tunjukkan saat check-in):</b></p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:2px;font-family:monospace">${ticketCode}</p>
     ${qrHtml}
     <p><b>Detail Event</b></p>
     <ul>
       <li><b>Event:</b> ${eventTitle}</li>
       <li><b>Waktu:</b> ${scheduleText}</li>
       <li><b>Lokasi:</b> ${placeText}</li>
     </ul>
     ${orderId ? `<p>Order ID: <code>${orderId}</code></p>` : ""}
     <p>Tiket Anda juga tersimpan di <a href="${env.WEB_URL}/dashboard/tiket">Dashboard &rsaquo; Tiket Saya</a>.</p>
     <br><p>Sampai jumpa di acara!<br>Tim Jago Akademi</p>`
  );
}

/**
 * Post-purchase onboarding email for Private Class courses. Sent from webhook
 * fulfillment alongside the payment-success email. Degrade-safe like all other
 * templates (no-op when RESEND_API_KEY is unset).
 */
export async function sendPrivateClassWelcome(
  to: string,
  params: {
    name: string;
    courseTitle: string;
    waGroupLink?: string | null;
    onboardingContact?: string | null;
    liveSchedule?: Date | null;
    orderId: string;
  },
) {
  const { name, courseTitle, waGroupLink, onboardingContact, liveSchedule, orderId } = params;
  // Fallback: official admin number when the course has no dedicated contact.
  const adminWa = onboardingContact || "6285283423737";
  // Re-wrap in `new Date` because the value may arrive as an ISO string after a
  // JSON round-trip through the BullMQ queue.
  const scheduleText = liveSchedule
    ? `${new Date(liveSchedule).toLocaleString("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      })} WIB`
    : null;

  await send(
    to,
    `Selamat Bergabung di Private Class — ${courseTitle}`,
    `<p>Halo <b>${name}</b>,</p>
     <p>Selamat! Anda resmi bergabung di Private Class <b>${courseTitle}</b>. Berikut langkah onboarding Anda:</p>
     <ol>
       <li><b>Konfirmasi data &amp; pembayaran</b> — admin kami akan memverifikasi data dan pembayaran Anda.</li>
       <li><b>Join grup mentoring</b> — ${
         waGroupLink
           ? `<a href="${waGroupLink}">Klik di sini untuk bergabung ke grup WhatsApp</a>.`
           : "tautan grup akan dikirimkan oleh admin kami."
       }</li>
       <li><b>Perkenalan mentor</b> — Anda akan diperkenalkan dengan mentor di dalam grup.</li>
       <li><b>Jadwal &amp; teknis</b> — ${
         scheduleText
           ? `sesi live pertama: <b>${scheduleText}</b>.`
           : "jadwal sesi akan diinformasikan di dalam grup."
       }</li>
     </ol>
     <p>Butuh bantuan? Hubungi admin kami di <a href="https://wa.me/${adminWa}">wa.me/${adminWa}</a></p>
     <p>Order ID: <code>${orderId}</code></p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}

export async function sendOrderInvoice(to: string, name: string, orderId: string) {
  await send(
    to,
    `Invoice Pesanan #${orderId.slice(0, 8).toUpperCase()} — Jago Akademi`,
    `<p>Halo <b>${name}</b>,</p>
     <p>Invoice untuk pesanan Anda dapat diunduh melalui tautan berikut:</p>
     <p><a href="${env.WEB_URL}/pesanan/${orderId}">Lihat dan Unduh Invoice</a></p>
     <br><p>Salam,<br>Tim Jago Akademi</p>`
  );
}
