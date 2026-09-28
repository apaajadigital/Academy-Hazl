import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Shield } from "lucide-react";

/**
 * Modern Precision Auth Shell (Stitch Design Reference: 2.3-auth.png)
 *
 * Dedicated minimal-distraction shell with top gateway bar, centered card,
 * cryptographic trust badges, and comprehensive legal footer.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-[#16181D] antialiased">
      {/* 1. Top Gateway Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E9EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1 group">
              <span className="font-extrabold text-xl tracking-tight text-[#16181D]">
                Hazl<span className="text-[#FF2F86]">.</span>
              </span>
            </Link>
            <span className="text-[#CCD0D5]">/</span>
            <span className="text-xs font-semibold text-[#5B616E]">Auth Gateway</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#E7E9EC] bg-[#F6F7F9] px-3 py-1 text-[11px] font-semibold text-[#5B616E]">
            <ShieldCheck size={13} className="text-[#0077A8]" />
            <span>Data Terenkripsi TLS 1.3</span>
          </div>
        </div>
      </header>

      {/* 2. Main Centered Card Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-7 sm:p-9 shadow-sm">
            {children}
          </div>

          {/* Trust Badges Row */}
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-[#8A909A]">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-[#0077A8]" />
              Enkripsi TLS 1.3
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Shield size={12} className="text-[#0077A8]" />
              Zero-Log Auth
            </span>
            <span>•</span>
            <span>SOC 2 Type II</span>
          </div>
        </div>
      </main>

      {/* 3. Bottom Legal Footer */}
      <footer className="border-t border-[#E7E9EC] bg-white py-6 text-xs text-[#5B616E]">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          <p className="text-[11px] text-[#8A909A]">
            &copy; 2026 Hazl Academy. Terenkripsi TLS 1.3.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-[11px]">
            <Link href="/" className="hover:text-[#16181D] transition-colors">
              Kembali ke Beranda
            </Link>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors">
              Butuh Bantuan
            </Link>
            <Link href="/terms" className="hover:text-[#16181D] transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <Link href="/privacy" className="hover:text-[#16181D] transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
