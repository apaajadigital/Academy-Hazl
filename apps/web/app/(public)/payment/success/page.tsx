"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { getValidToken } from "@/lib/auth/token";
import { WA_NUMBER } from "@/lib/config";

// ─── Private Class order data (present only for paid private-class items) ─────
// Older API responses may omit `privateClass` entirely — everything is optional.
type PrivateClassInfo = {
  waGroupLink?: string | null;
  onboardingContact?: string | null;
  liveSchedule?: string | null;
};

type OrderItemLike = {
  id?: string;
  itemTitle?: string | null;
  privateClass?: PrivateClassInfo | null;
};

/**
 * Normalize a free-form admin contact ("+62 812-3456", "0812 3456", …) into
 * the digits-only form wa.me expects; returns null when unusable so callers
 * can fall back to the business WA number.
 */
function toWaDigits(contact: string | null | undefined): string | null {
  if (!contact) return null;
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

// ─── Animated check-mark SVG (CSS stroke-dasharray trick) ─────────────────────
function AnimatedCheckmark() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Outer glow ring */}
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          background: "rgba(22, 163, 74, 0.15)",
          animationDuration: "1.6s",
          animationIterationCount: 1,
        }}
      />
      {/* Icon container */}
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "rgba(22, 163, 74, 0.12)", border: "2px solid rgba(22,163,74,0.35)" }}
      >
        <svg
          viewBox="0 0 52 52"
          className="h-10 w-10"
          fill="none"
          stroke="#16A34A"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: "draw-check 0.5s 0.3s ease forwards" }}
        >
          <path d="M14 27 l9 9 l16 -18" />
        </svg>
      </div>

      <style>{`
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Floating confetti particle ───────────────────────────────────────────────
function ConfettiDots() {
  const dots = [
    { color: "var(--brand-cyan)", x: "-60px", y: "-45px", size: 8, delay: "0.2s" },
    { color: "var(--brand-pink)", x: "60px",  y: "-55px", size: 6, delay: "0.35s" },
    { color: "var(--brand-cyan-strong)", x: "-75px", y: "10px", size: 5, delay: "0.1s" },
    { color: "var(--brand-pink-strong)", x: "80px",  y: "5px",  size: 7, delay: "0.4s" },
    { color: "var(--brand-cyan)", x: "20px",  y: "-70px", size: 5, delay: "0.25s" },
    { color: "var(--brand-pink)", x: "-25px", y: "-68px", size: 4, delay: "0.45s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full opacity-0"
          style={{
            width: d.size,
            height: d.size,
            background: d.color,
            transform: `translate(-50%, -50%)`,
            animation: `burst-dot 0.6s ${d.delay} cubic-bezier(0.16,1,0.3,1) forwards`,
            "--tx": d.x,
            "--ty": d.y,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes burst-dot {
          0%   { opacity: 0; transform: translate(-50%, -50%) translate(0, 0) scale(0); }
          60%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Step item in "next steps" card ──────────────────────────────────────────
function NextStep({ icon, text, delay }: { icon: string; text: string; delay: string }) {
  return (
    <li
      className="flex items-center gap-3 opacity-0"
      style={{ animation: `fade-in-up 0.4s ${delay} ease forwards` }}
    >
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: "var(--surface-accent-soft)", border: "1px solid rgba(0,119,168,0.15)" }}
      >
        {icon}
      </span>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</span>
    </li>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const isMock = params.get("mock") === "1";
  const [mounted, setMounted] = useState(false);

  const [tokenReady, setTokenReady] = useState(false);
  // DOKU redirects the browser here on RETURN — payment is only confirmed later
  // via the webhook. So we must verify the order is actually `paid` before
  // claiming success (previously this page showed "Berhasil" unconditionally).
  const [verified, setVerified] = useState<"checking" | "paid" | "unpaid" | "error">(
    isMock ? "paid" : "checking",
  );
  // Paid order items carrying private-class onboarding data (WA group, admin
  // contact). Empty for regular purchases and for older API responses.
  const [pcItems, setPcItems] = useState<OrderItemLike[]>([]);

  useEffect(() => {
    // Small delay so CSS animations trigger after mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Ensure token is still valid (auto-refresh if needed) AND confirm the order
  // status server-side before showing the success UI.
  useEffect(() => {
    if (isMock) {
      setTokenReady(true);
      return;
    }
    (async () => {
      const token = await getValidToken();
      setTokenReady(!!token);
      if (!orderId || !token) {
        setVerified("error");
        return;
      }
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        const isPaid = body.success && body.data?.status === "paid";
        if (isPaid && Array.isArray(body.data?.items)) {
          // Defensive: `privateClass` only exists on paid private-class items
          // served by the new API — absence simply means no onboarding card.
          setPcItems(
            (body.data.items as OrderItemLike[]).filter(
              (it) => it && typeof it === "object" && it.privateClass,
            ),
          );
        }
        setVerified(isPaid ? "paid" : "unpaid");
      } catch {
        setVerified("error");
      }
    })();
  }, [orderId, isMock]);

  // Still confirming payment — show a neutral loading state.
  if (verified === "checking") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
        style={{ background: "var(--surface-page)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--brand-cyan-strong)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Memverifikasi pembayaran…
        </p>
      </div>
    );
  }

  // Payment not confirmed yet (pending/failed) — do NOT claim success.
  if (verified !== "paid") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-16 text-center"
        style={{ background: "var(--surface-page)" }}
      >
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <div className="text-4xl" aria-hidden="true">⏳</div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Pembayaran Belum Terkonfirmasi
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Kami belum menerima konfirmasi pembayaran untuk pesanan ini. Jika kamu
            sudah membayar, status akan diperbarui otomatis dalam beberapa menit.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row w-full">
            {orderId && (
              <Link href={`/pesanan/${orderId}`} className="btn btn-primary btn-lg flex-1 justify-center">
                Lihat Status Pesanan
              </Link>
            )}
            <Link href="/dashboard/pesanan" className="btn btn-outline btn-lg flex-1 justify-center">
              Pesanan Saya
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Private Class onboarding data (first private-class item on the order).
  const pc = pcItems[0]?.privateClass ?? null;
  const pcAdminHref = `https://wa.me/${toWaDigits(pc?.onboardingContact) ?? WA_NUMBER}?text=${encodeURIComponent(
    `Halo Admin, saya baru saja menyelesaikan pembayaran Private Class${
      orderId ? ` (Order ${orderId.slice(0, 8).toUpperCase()})` : ""
    }. Mohon konfirmasi & info langkah selanjutnya. Terima kasih!`,
  )}`;
  const pcGroupLink =
    pc?.waGroupLink && pc.waGroupLink.startsWith("http") ? pc.waGroupLink : null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--surface-page)" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Icon + confetti area */}
        <div className="relative mb-8 flex justify-center">
          <AnimatedCheckmark />
          <ConfettiDots />
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1
            className="mb-2 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            Pembayaran Berhasil!
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {isMock
              ? "Mode dev: pembayaran dikonfirmasi secara otomatis."
              : "Terima kasih! Akses pembelian kamu sudah aktif."}
          </p>
          {orderId && (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Ref:{" "}
              <span
                className="font-mono font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                {orderId.slice(0, 8).toUpperCase()}
              </span>
            </p>
          )}
        </div>

        {/* Private Class onboarding card (only for paid private-class items) */}
        {pc && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{
              background: "var(--surface-card)",
              border: "1px solid rgba(0,212,255,0.25)",
              boxShadow: "var(--shadow-e1)",
            }}
          >
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--brand-cyan-strong)" }}
            >
              Private Class
            </p>
            <h2
              className="mb-4 text-lg font-extrabold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              Selamat datang di Private Class!
            </h2>
            <ul className="space-y-3">
              <NextStep icon="1" text="Admin akan menghubungi Anda untuk konfirmasi data & pembayaran" delay="0.5s" />
              <NextStep icon="2" text="Join grup mentoring" delay="0.6s" />
              <NextStep icon="3" text="Perkenalan dengan mentor" delay="0.7s" />
              <NextStep icon="4" text="Info jadwal & teknis program" delay="0.8s" />
            </ul>
            {pc.liveSchedule && (
              <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                📅 Jadwal: <span style={{ color: "var(--text-secondary)" }}>{pc.liveSchedule}</span>
              </p>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                id="success-pc-chat-admin-btn"
                href={pcAdminHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex-1 justify-center"
              >
                Chat Admin Sekarang
              </a>
              {pcGroupLink && (
                <a
                  id="success-pc-join-group-btn"
                  href={pcGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline flex-1 justify-center"
                >
                  Join Grup Mentoring
                </a>
              )}
            </div>
          </div>
        )}

        {/* Next steps card */}
        <div
          className="mb-6 rounded-2xl p-5"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-e1)",
          }}
        >
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--brand-cyan-strong)" }}
          >
            Apa selanjutnya?
          </p>
          <ul className="space-y-3">
            <NextStep icon="✅" text="Akses pembelian kamu sudah aktif" delay="0.6s" />
            <NextStep icon="📧" text="Invoice dikirim ke email kamu" delay="0.75s" />
            <NextStep icon="🚀" text="Mulai belajar kapan saja, di mana saja" delay="0.9s" />
          </ul>
        </div>

        {/* CTA buttons */}
        <div
          className="flex flex-col gap-3 sm:flex-row opacity-0"
          style={{ animation: "fade-in-up 0.4s 1s ease forwards" }}
        >
          <Link
            id="success-start-learning-btn"
            href={tokenReady ? "/dashboard/kursus" : "/masuk?redirect=/dashboard/kursus"}
            className="btn btn-primary btn-lg flex-1 justify-center"
          >
            Mulai Belajar
          </Link>
          {orderId && (
            <Link
              id="success-view-order-btn"
              href={`/pesanan/${orderId}`}
              className="btn btn-outline btn-lg flex-1 justify-center"
            >
              Lihat Pesanan
            </Link>
          )}
        </div>

        {/* Back link */}
        <p
          className="mt-6 text-center text-sm opacity-0"
          style={{ animation: "fade-in-up 0.4s 1.1s ease forwards", color: "var(--text-muted)" }}
        >
          <Link href="/" className="hover:underline" style={{ color: "var(--text-muted)" }}>
            Kembali ke Beranda
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Page (Suspense boundary required for useSearchParams) ───────────────────
export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--surface-page)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--brand-cyan-strong)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
