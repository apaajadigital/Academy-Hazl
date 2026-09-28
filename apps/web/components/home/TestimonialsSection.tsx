import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "./HomeIcons";
import { features } from "@/lib/features";

const TESTIMONIALS = [
  {
    name: "Galih Saputra",
    role: "Pemilik UMKM fashion",
    initials: "GS",
    quote: "B-roll-nya membantu banget buat konten harian toko online kami. Dulu sewa videografer jutaan, sekarang bisa generate sendiri pakai Kling AI & Runway.",
  },
  {
    name: "Sinta Maharani",
    role: "Freelancer video",
    initials: "SM",
    quote: "Dari belajar prompt sampai dapat klien pertama, semuanya ada di satu tempat. Format tugas dan templatenya sangat siap pakai untuk pitch ke brand.",
  },
  {
    name: "Ayu Lestari",
    role: "Kreator konten kuliner",
    initials: "AL",
    quote: "Kelas UGC-nya bikin iklan jualanku lebih rapi. Sekarang aku juga jual template prompt sendiri di sini dan saldo masuk tiap minggu.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="w-full bg-[#FAFAFA] py-20 sm:py-28 border-b border-[#E7E9EC]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Testimonials Header */}
        <div className="max-w-2xl mb-12">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0077A8] bg-[#E8F6FF] px-3 py-1 rounded-full border border-[#BFC7D0]/40">
            Testimoni
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#16181D] tracking-tight leading-[1.1]">
            Kata mereka yang sudah <span className="text-[#FF2F86]">belajar</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B616E] leading-relaxed">
            Pengalaman nyata dari kreator konten, freelancer, dan pemilik bisnis yang mengubah video AI jadi hasil riil.
          </p>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col justify-between rounded-[28px] border border-[#E7E9EC] bg-white p-7 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <blockquote className="text-sm sm:text-base text-[#16181D] leading-relaxed font-medium mb-6">
                “{t.quote}”
              </blockquote>
              <div className="flex items-center gap-3.5 pt-5 border-t border-[#F0F2F5]">
                <div className="w-11 h-11 rounded-full bg-[#E8F6FF] text-[#0077A8] font-black text-sm flex items-center justify-center shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#16181D]">{t.name}</p>
                  <p className="text-xs text-[#707880]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Become Creator Feature Bento Box */}
          {features.trainerProgram && (
        <div className="relative overflow-hidden rounded-[36px] bg-[#16181D] text-white p-8 sm:p-12 lg:p-14">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF2F86]">
                BECOME CREATOR
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
                Skill-mu bisa jadi penghasilan.
              </h3>
              <p className="mt-4 text-sm sm:text-base text-[#BFC7D0] leading-relaxed max-w-xl">
                Aktifkan akun kreator dari akunmu, upload produk, dan mulai jualan hari ini juga. Hazl Academy hanya memotong <strong className="text-white">5%</strong> per penjualan. Tidak ada biaya langganan bulanan.
              </p>

              {/* Stats Chips */}
              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="block text-2xl font-black text-white">5%</span>
                  <span className="mt-1 block text-xs text-[#A0AAB5]">potongan platform</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="block text-2xl font-black text-white">Rp0</span>
                  <span className="mt-1 block text-xs text-[#A0AAB5]">biaya bulanan</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="block text-2xl font-black text-white">1 klik</span>
                  <span className="mt-1 block text-xs text-[#A0AAB5]">aktifkan kreator</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/trainer-program"
                  className="h-11 px-6 rounded-full bg-[#FF2F86] text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-[#E01E70] transition-colors"
                >
                  <span>Jadi kreator</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/marketplace"
                  className="h-11 px-6 rounded-full border border-white/20 bg-white/10 text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  Lihat marketplace
                </Link>
              </div>
            </div>

            {/* Right Mascot Visual */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-56 h-64 sm:w-64 sm:h-72">
                <Image
                  src="/brand/mascot/hazel-menyambut.webp"
                  alt="Hazel menyambut kreator"
                  fill
                  sizes="256px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
          )}
      </div>
    </section>
  );
}
