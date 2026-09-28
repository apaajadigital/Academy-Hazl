import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  ClapperboardIcon,
  LayoutTemplateIcon,
  WalletIcon,
  RadioIcon,
  AwardIcon,
} from "./HomeIcons";
import { features } from "@/lib/features";

export function CategoryGrid() {
  return (
    <section className="w-full bg-[#FAFAFA] border-y border-[#E7E9EC] py-20 sm:py-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-[660px] mb-12">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0077A8] bg-[#E8F6FF] px-3 py-1 rounded-full border border-[#BFC7D0]/40">
            Kenalan dulu
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#16181D] tracking-tight leading-[1.1]">
            Aku Hazel. Ini yang kamu dapat.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B616E] leading-relaxed">
            Skill video AI-mu bisa lebih dari sekadar konten feed. Di Hazl Academy kamu belajar dari kreator yang sudah praktik, lalu mengubah skill itu jadi produk yang bisa dijual.
          </p>
        </div>

        {/* Semi-Bento Organic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Large Featured Card with Mascot Hazel (2 cols, 2 rows) */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white shadow-sm hover:shadow-md transition-all duration-300 md:col-span-2 md:row-span-2 min-h-[340px] p-7 sm:p-9">
            {/* Background Accent & Mascot */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#E8F6FF] via-white to-[#FFF0F4]"></div>
            <div className="pointer-events-none absolute bottom-0 right-4 sm:right-8 w-44 sm:w-56 md:w-64 h-56 sm:h-72 z-10">
              <Image
                src="/brand/mascot/hazel-wave.webp"
                alt="Hazel si rubah menyapa"
                fill
                sizes="(min-width: 768px) 260px, 180px"
                className="object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Content */}
            <div className="relative z-20 max-w-[70%] sm:max-w-[62%]">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/90 border border-[#BFC7D0]/40 text-[11px] font-bold text-[#0077A8] mb-4">
                EKOSISTEM KREATOR LENGKAP
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16181D] tracking-tight mb-3">
                Dari nol sampai jualan
              </h3>
              <p className="text-sm sm:text-base text-[#5B616E] leading-relaxed">
                Mulai dari kelas dasar, praktik bareng template, sampai buka lapak sendiri. Tiap tahap jelas, kamu tahu harus ngapain.
              </p>
            </div>

            <div className="relative z-20 pt-8">
              <Link
                href="/e-course"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#16181D] text-white text-sm font-bold hover:bg-[#36BDF2] hover:text-[#16181D] transition-colors"
              >
                <span>Lihat kelas</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Kelas Video AI */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white p-7 shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDEDF4] flex items-center justify-center text-[#0077A8] mb-5 group-hover:scale-95 transition-transform">
                <ClapperboardIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#16181D] mb-2 tracking-tight">
                Kelas video AI
              </h3>
              <p className="text-sm text-[#5B616E] leading-relaxed">
                Materi praktik dari kreator, bisa diulang kapan saja.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/e-course"
                className="text-sm font-bold text-[#0077A8] inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                Jelajahi kelas <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Template Siap Pakai */}
          {features.marketplace && (
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white p-7 shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDEDF4] flex items-center justify-center text-[#0077A8] mb-5 group-hover:scale-95 transition-transform">
                <LayoutTemplateIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#16181D] mb-2 tracking-tight">
                Template siap pakai
              </h3>
              <p className="text-sm text-[#5B616E] leading-relaxed">
                Prompt, preset, dan project file untuk mempercepat kerja.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/marketplace"
                className="text-sm font-bold text-[#0077A8] inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                Lihat template <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
          )}

          {/* Card 4: Jualan Potongan 5% (2 cols) */}
          {features.trainerProgram && (
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white p-7 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 md:col-span-2">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDEDF4] flex items-center justify-center text-[#CC0052] mb-5 group-hover:scale-95 transition-transform">
                <WalletIcon className="w-6 h-6 text-[#CC0052]" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[#16181D] tracking-tight">
                  Jualan, potongan cuma 5%
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#FFF0F4] text-[#CC0052] text-xs font-bold">
                  95% untukmu
                </span>
              </div>
              <p className="text-sm text-[#5B616E] leading-relaxed max-w-lg">
                Jadi kreator dari akunmu sendiri. Hasil penjualan masuk dompet, tarik ke rekening kapan saja tanpa biaya bulanan.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/trainer-program"
                className="text-sm font-bold text-[#0077A8] inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                Jadi kreator sekarang <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
          )}

          {/* Card 5: Webinar Live (1 col) */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white p-7 shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDEDF4] flex items-center justify-center text-[#0077A8] mb-5 group-hover:scale-95 transition-transform">
                <RadioIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#16181D] mb-2 tracking-tight">
                Webinar live
              </h3>
              <p className="text-sm text-[#5B616E] leading-relaxed">
                Belajar langsung dan tanya jawab bareng praktisi video AI.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/event"
                className="text-sm font-bold text-[#0077A8] inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                Lihat jadwal <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 6: Sertifikat Ber-QR (Full width 3 cols) */}
          <div className="group relative flex flex-col md:flex-row items-center justify-between overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-gradient-to-r from-white via-white to-[#E8FFF4] p-7 sm:p-9 shadow-sm hover:shadow-md transition-all duration-300 md:col-span-3">
            <div className="max-w-xl">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FFF4] flex items-center justify-center text-[#00875A] mb-4">
                <AwardIcon className="w-6 h-6 text-[#00875A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#16181D] mb-2 tracking-tight">
                Sertifikat ber-QR terverifikasi
              </h3>
              <p className="text-sm sm:text-base text-[#5B616E] leading-relaxed">
                Bukti belajar yang bisa diverifikasi siapa pun, lewat satu pindaian. Portofolio langsung diakui klien dan agensi.
              </p>
            </div>

            <div className="relative w-48 h-36 shrink-0 mt-6 md:mt-0 pointer-events-none">
              <Image
                src="/brand/mascot/hazel-pemandu.webp"
                alt="Hazel membawa sertifikat"
                fill
                sizes="192px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
