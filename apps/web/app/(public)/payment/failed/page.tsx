"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ─── Animated X mark ─────────────────────────────────────────────────────────
function AnimatedXMark() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Shake ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "rgba(239, 68, 68, 0.1)",
          animation: "error-ring 0.5s 0.2s ease-out both",
        }}
      />
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.3)" }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-10 w-10"
          fill="none"
          stroke="#DC2626"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          {/* First line of X */}
          <line
            x1="6" y1="6" x2="18" y2="18"
            style={{
              strokeDasharray: 17,
              strokeDashoffset: 17,
              animation: "draw-line 0.3s 0.2s ease forwards",
            }}
          />
          {/* Second line of X */}
          <line
            x1="18" y1="6" x2="6" y2="18"
            style={{
              strokeDasharray: 17,
              strokeDashoffset: 17,
              animation: "draw-line 0.3s 0.4s ease forwards",
            }}
          />
        </svg>
      </div>

      <style>{`
        @keyframes error-ring {
          0%   { opacity: 0; transform: scale(0.8); }
          60%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes draw-line {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Common failure reasons map ───────────────────────────────────────────────
const REASON_MAP: Record<string, string> = {
  EXPIRED: "Batas waktu pembayaran telah habis.",
  CANCELLED: "Pembayaran dibatalkan oleh pengguna.",
  DECLINED: "Kartu/rekening ditolak oleh bank.",
  INSUFFICIENT_FUNDS: "Saldo tidak mencukupi.",
  INVALID_CARD: "Data kartu tidak valid.",
};

// ─── Main content ─────────────────────────────────────────────────────────────
function FailedContent() {
  const params = useSearchParams();
  /**
   * returnUrl — URL to send the user back to when they click "Coba Lagi".
   * Set by the payment gateway redirect or our checkout.ts backend.
   * Falls back to /e-course if not provided.
   */
  const returnUrl = params.get("returnUrl") ?? "/e-course";
  const orderId = params.get("orderId");
  const rawReason = params.get("reason");
  const reason = rawReason
    ? (REASON_MAP[rawReason.toUpperCase()] ?? decodeURIComponent(rawReason))
    : null;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--surface-page)" }}
    >
      <div
        className="w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <AnimatedXMark />
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1
            className="mb-2 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            Pembayaran Gagal
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Pembayaran tidak dapat diproses. Silakan coba lagi atau gunakan metode
            pembayaran lain.
          </p>
          {orderId && (
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Ref:{" "}
              <span className="font-mono font-semibold" style={{ color: "var(--text-secondary)" }}>
                {orderId.slice(0, 8).toUpperCase()}
              </span>
            </p>
          )}
        </div>

        {/* Reason card — shown only if reason is provided */}
        {reason && (
          <div
            className="mb-6 rounded-2xl p-4 opacity-0"
            style={{
              animation: "fade-in-up 0.4s 0.5s ease forwards",
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <p className="flex items-start gap-2 text-sm" style={{ color: "#B91C1C" }}>
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              {reason}
            </p>
          </div>
        )}

        {/* Tips card */}
        <div
          className="mb-6 rounded-2xl p-5 opacity-0"
          style={{
            animation: "fade-in-up 0.4s 0.6s ease forwards",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-e1)",
          }}
        >
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--brand-cyan-strong)" }}
          >
            Yang bisa kamu lakukan
          </p>
          <ul className="space-y-2">
            {[
              { icon: "🔄", text: "Coba lagi dengan metode pembayaran yang sama" },
              { icon: "💳", text: "Gunakan metode pembayaran lain (transfer bank, e-wallet)" },
              { icon: "📞", text: "Hubungi bank jika kartu kamu diblokir" },
              { icon: "🎧", text: "Hubungi support kami jika masalah berlanjut" },
            ].map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 opacity-0"
                style={{ animation: `fade-in-up 0.3s ${0.7 + i * 0.1}s ease forwards` }}
              >
                <span className="flex-shrink-0">{tip.icon}</span>
                <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {tip.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA buttons */}
        <div
          className="flex flex-col gap-3 sm:flex-row opacity-0"
          style={{ animation: "fade-in-up 0.4s 1.1s ease forwards" }}
        >
          {/* Dynamic "Coba Lagi" — goes back to the checkout page that failed */}
          <Link
            id="payment-failed-retry-btn"
            href={returnUrl}
            className="btn bg-brand-gradient btn-lg flex-1 justify-center text-white shadow-e1 hover:opacity-90 hover:shadow-e2"
          >
            Coba Lagi
          </Link>
          <Link
            id="payment-failed-orders-btn"
            href="/pesanan"
            className="btn btn-outline btn-lg flex-1 justify-center"
          >
            Lihat Pesanan
          </Link>
        </div>

        {/* Support + home links */}
        <div
          className="mt-6 flex justify-center gap-4 text-sm opacity-0"
          style={{ animation: "fade-in-up 0.4s 1.2s ease forwards", color: "var(--text-muted)" }}
        >
          <Link href="/contact" className="hover:underline" style={{ color: "var(--text-muted)" }}>
            Hubungi Support
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/" className="hover:underline" style={{ color: "var(--text-muted)" }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--surface-page)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#DC2626", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <FailedContent />
    </Suspense>
  );
}
