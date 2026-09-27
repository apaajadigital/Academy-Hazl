"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { getValidToken } from "@/lib/auth/token";

type SubscriptionLockProps = {
  children: ReactNode;
  /**
   * Hard override. When provided, the lock honors it verbatim (backward compat).
   * When omitted, the lock self-determines from the user's LIVE subscription:
   * unlocked only when `GET /api/subscription/me` reports `isActive === true`.
   * Fail-closed — locked until an active subscription is confirmed (so content
   * never flashes for logged-out or lapsed users).
   */
  isLocked?: boolean;
};

/**
 * Gates premium learning content behind an active subscription. Replaces the
 * previous hardcoded `IS_LOCKED = true` stub with a real entitlement check
 * against the subscription endpoint (server still enforces the true gate on the
 * video URL — this is the UX layer). Renders a blurred preview + upsell overlay
 * when locked.
 */
export function SubscriptionLock({ children, isLocked }: SubscriptionLockProps) {
  const controlled = isLocked !== undefined;
  // Fail-closed default: locked until proven otherwise.
  const [locked, setLocked] = useState<boolean>(isLocked ?? true);

  useEffect(() => {
    if (controlled) {
      setLocked(isLocked as boolean);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getValidToken();
      if (!token) {
        if (!cancelled) setLocked(true); // not logged in → locked
        return;
      }
      try {
        const res = await fetch("/api/subscription/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const body = await res.json().catch(() => null);
        const active = res.ok && body?.success && body.data?.isActive === true;
        if (!cancelled) setLocked(!active);
      } catch {
        if (!cancelled) setLocked(true); // fail-closed on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [controlled, isLocked]);

  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none opacity-50 blur-sm"
        aria-hidden="true"
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="glass-card mx-4 max-w-sm rounded-[var(--radius-xl)] px-6 py-8 text-center shadow-e3">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-brand)] bg-surface-accent-soft text-accent">
            <Lock size={20} aria-hidden="true" />
          </div>
          <h3 className="mb-2 font-display text-lg font-bold text-text-primary">
            Konten Terkunci
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-text-secondary">
            Berlangganan Hazl Academy untuk mengakses semua materi, video, dan sertifikat pembelajaran.
          </p>
          <Link
            href="/berlangganan"
            className="btn btn-primary w-full justify-center"
          >
            Berlangganan Sekarang
          </Link>
          <p className="mt-3 text-xs text-[#AEAEB2]">
            Akses seumur hidup · Sertifikat resmi · Komunitas eksklusif
          </p>
        </div>
      </div>
    </div>
  );
}
