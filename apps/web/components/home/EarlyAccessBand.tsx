import Link from "next/link";
import { CheckCircleIcon } from "./HomeIcons";

export function EarlyAccessBand() {
  return (
    <section className="w-full bg-[#16181D] text-white py-20 border-t border-[#2E3036]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF2F86]"></span>
          <span className="text-[11px] font-bold tracking-widest text-[#BFC7D0] uppercase">
            KONSULTASI GRATIS DENGAN LEAD MENTOR
          </span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white tracking-tight max-w-3xl mb-5 leading-tight">
          Siap Mengakselerasi Standar Karier Digital Anda?
        </h2>

        <p className="text-sm sm:text-base text-gray-400 max-w-xl mb-10 leading-relaxed">
          Bergabunglah bersama ribuan engineer dan praktisi produk yang telah menguasai kompetensi teknologi berstandar tinggi bersama Hazl Academy.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/daftar"
            className="h-12 px-8 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#72D2FF] transition-colors active:scale-[0.99]"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF2F86]"></span>
            <span>Mulai Belajar Sekarang</span>
          </Link>
          <Link
            href="/contact"
            className="h-12 px-8 rounded-full bg-transparent text-white border border-gray-600 text-sm font-medium inline-flex items-center justify-center hover:bg-white/5 transition-colors active:scale-[0.99]"
          >
            Konsultasi Tim Kurikulum
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <CheckCircleIcon className="w-4 h-4 text-[#36BDF2]" /> Tanpa Kontrak Mengikat
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircleIcon className="w-4 h-4 text-[#36BDF2]" /> Akses Repositori Seumur Hidup
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircleIcon className="w-4 h-4 text-[#36BDF2]" /> Sertifikasi Resmi Terverifikasi
          </span>
        </div>
      </div>
    </section>
  );
}
