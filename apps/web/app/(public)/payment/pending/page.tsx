"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ─── Countdown timer hook ─────────────────────────────────────────────────────
/**
 * Returns remaining seconds from now until `expiresAt` (ISO string).
 * Returns null if expiresAt is not provided.
 * Counts down every second; stops at 0.
 */
function useCountdown(expiresAt: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (!expiresAt) return null;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!expiresAt || remaining === null) return;
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setRemaining(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, remaining]);

  return remaining;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Animated spinning clock ─────────────────────────────────────────────────
function AnimatedClock() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Pulsing ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "rgba(245, 158, 11, 0.12)",
          animation: "pulse-ring 2s ease-in-out infinite",
        }}
      />
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "rgba(245,158,11,0.12)", border: "2px solid rgba(245,158,11,0.3)" }}
      >
        {/* Clock SVG with animated hands */}
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          {/* Minute hand — rotates */}
          <line
            x1="12" y1="12" x2="12" y2="6"
            style={{ transformOrigin: "12px 12px", animation: "spin-minute 6s linear infinite" }}
          />
          {/* Hour hand */}
          <line
            x1="12" y1="12" x2="15" y2="12"
            style={{ transformOrigin: "12px 12px", animation: "spin-hour 72s linear infinite" }}
          />
          <circle cx="12" cy="12" r="1" fill="#D97706" />
        </svg>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes spin-minute {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spin-hour {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Payment instruction step ────────────────────────────────────────────────
function Step({
  num,
  text,
  delay,
}: {
  num: number;
  text: string;
  delay: string;
}) {
  return (
    <li
      className="flex items-start gap-3 opacity-0"
      style={{ animation: `fade-in-up 0.4s ${delay} ease forwards` }}
    >
      <span
        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: "var(--brand-cyan)", color: "var(--text-on-accent)" }}
      >
        {num}
      </span>
      <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {text}
      </span>
    </li>
  );
}

// ─── Main pending content ─────────────────────────────────────────────────────
function PendingContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  /**
   * expiresAt — ISO 8601 string. Set by the payment gateway redirect.
   * Example: /payment/pending?orderId=xxx&expiresAt=2026-07-10T09%3A00%3A00Z
   * When absent (most cases), countdown is not shown.
   */
  const expiresAt = params.get("expiresAt");
  const countdown = useCountdown(expiresAt);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const isExpired = countdown !== null && countdown <= 0;

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
          <AnimatedClock />
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1
            className="mb-2 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            {isExpired ? "Waktu Pembayaran Habis" : "Menunggu Pembayaran"}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {isExpired
              ? "Batas waktu pembayaran telah berakhir. Silakan buat pesanan baru."
              : "Selesaikan pembayaran sebelum batas waktu. Akses akan aktif otomatis setelah konfirmasi."}
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

        {/* Countdown timer */}
        {countdown !== null && (
          <div
            className="mb-6 rounded-2xl p-5 text-center opacity-0"
            style={{
              animation: "fade-in-up 0.4s 0.5s ease forwards",
              background: isExpired ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.07)",
              border: `1px solid ${isExpired ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.25)"}`,
            }}
          >
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: isExpired ? "#DC2626" : "#D97706" }}
            >
              {isExpired ? "Kadaluarsa" : "Sisa Waktu"}
            </p>
            <p
              className="font-mono text-4xl font-bold tabular-nums"
              style={{ color: isExpired ? "#DC2626" : "#B45309" }}
            >
              {isExpired ? "00:00" : formatCountdown(countdown)}
            </p>
          </div>
        )}

        {/* Instructions card — only show if not expired */}
        {!isExpired && (
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
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--brand-cyan-strong)" }}
            >
              Cara Menyelesaikan Pembayaran
            </p>
            <ul className="space-y-3">
              <Step num={1} text="Buka email kamu dan klik link pembayaran yang telah dikirim." delay="0.7s" />
              <Step num={2} text="Pilih metode pembayaran yang tersedia (transfer bank, e-wallet, kartu kredit)." delay="0.85s" />
              <Step num={3} text="Selesaikan pembayaran sesuai instruksi. Jangan tutup halaman sampai selesai." delay="1s" />
              <Step num={4} text="Akses akan aktif otomatis dalam beberapa menit setelah konfirmasi." delay="1.15s" />
            </ul>
          </div>
        )}

        {/* CTA buttons */}
        <div
          className="flex flex-col gap-3 sm:flex-row opacity-0"
          style={{ animation: "fade-in-up 0.4s 1.2s ease forwards" }}
        >
          {isExpired ? (
            <Link
              href="/e-course"
              className="btn bg-brand-gradient btn-lg flex-1 justify-center text-white shadow-e1 hover:opacity-90 hover:shadow-e2"
            >
              Lihat Kursus Lagi
            </Link>
          ) : (
            <Link
              id="pending-check-order-btn"
              href={orderId ? `/pesanan/${orderId}` : "/dashboard/pesanan"}
              className="btn bg-brand-gradient btn-lg flex-1 justify-center text-white shadow-e1 hover:opacity-90 hover:shadow-e2"
            >
              Cek Status Pesanan
            </Link>
          )}
          <Link
            id="pending-home-btn"
            href="/"
            className="btn btn-outline btn-lg flex-1 justify-center"
          >
            Kembali ke Beranda
          </Link>
        </div>

        {/* Support note */}
        <p
          className="mt-6 text-center text-xs opacity-0"
          style={{ animation: "fade-in-up 0.4s 1.35s ease forwards", color: "var(--text-muted)" }}
        >
          Butuh bantuan?{" "}
          <Link href="/contact" className="font-semibold hover:underline" style={{ color: "var(--brand-cyan-strong)" }}>
            Hubungi Support
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function PaymentPendingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--surface-page)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#D97706", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
