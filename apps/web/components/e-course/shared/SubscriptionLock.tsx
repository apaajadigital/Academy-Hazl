import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

type SubscriptionLockProps = {
  isLocked: boolean;
  children: ReactNode;
};

export function SubscriptionLock({ isLocked, children }: SubscriptionLockProps) {
  if (!isLocked) return <>{children}</>;

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
            Berlangganan Jago Akademi untuk mengakses semua materi, video, dan sertifikat pembelajaran.
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
