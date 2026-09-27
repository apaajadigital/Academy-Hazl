import Link from "next/link";
import { Lock, HelpCircle } from "lucide-react";
import OrderDetailPage from "@/app/dashboard/pesanan/[orderId]/page";

export default function StandaloneOrderPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#16181D] antialiased">
      {/* Standalone Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E9EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight text-[#16181D]">
                Hazl<span className="text-[#FF2F86]">.</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-[#F6F7F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B616E]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Portal Faktur Resmi
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-[#5B616E]">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px]">
              <Lock size={12} className="text-[#0077A8]" />
              Faktur Resmi Terverifikasi
            </span>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors flex items-center gap-1">
              <HelpCircle size={14} />
              <span>Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Order Details Body */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <OrderDetailPage />
      </main>

      {/* Standalone Footer */}
      <footer className="mt-12 border-t border-[#E7E9EC] bg-white py-8 text-center text-xs text-[#5B616E]">
        <div className="mx-auto max-w-4xl px-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/terms" className="hover:text-[#16181D] transition-colors">
              Garansi 7 Hari Uang Kembali
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#16181D] transition-colors">
              Kebijakan Privasi
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#16181D] transition-colors">
              Syarat & Ketentuan
            </Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors">
              Bantuan Pelanggan
            </Link>
          </div>
          <p className="text-[11px] text-[#8A909A]">
            © 2026 Hazl Academy. Seluruh hak cipta dilindungi. Sistem Keamanan ISO/IEC 27001 Terverifikasi.
          </p>
        </div>
      </footer>
    </div>
  );
}
