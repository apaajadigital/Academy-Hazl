import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, CheckCircleIcon, SparklesIcon, PlayIcon } from "./HomeIcons";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1440px] mx-auto px-6 lg:px-8 pt-24 pb-16 lg:pt-28 lg:pb-20 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Authentic Copy & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDEDF4] border border-[#BFC7D0]/50 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#FF2F86] animate-pulse"></span>
            <span className="text-[12px] font-bold tracking-widest text-[#3F484F] uppercase">
              AKADEMI KREATOR VIDEO AI INDONESIA
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#16181D] tracking-tight leading-[1.08] mb-6">
            Belajar Video AI. <br />
            <span className="text-[#0077A8]">Jual Karyamu.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#5B616E] max-w-xl mb-8 leading-relaxed">
            Ikut kelas dari kreator video AI, kuasai tools-nya, lalu buka lapak sendiri: jual kelas, template, video jadi, dan webinar dari satu akun.
          </p>

          {/* CTA Cluster */}
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-10">
            <Link
              href="/daftar"
              className="h-12 px-7 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#72D2FF] active:scale-[0.99] transition-all shadow-sm"
            >
              <span>Mulai Gratis</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/e-course"
              className="h-12 px-7 rounded-full bg-white text-[#16181D] border border-[#E7E9EC] text-sm font-semibold inline-flex items-center justify-center hover:border-[#707880] hover:bg-[#F6F7F9] transition-colors active:scale-[0.99]"
            >
              Lihat Kelas &amp; Karya
            </Link>
            <Link
              href="/trainer-program"
              className="h-12 px-6 rounded-full bg-[#EDEDF4] text-[#0077A8] text-sm font-bold inline-flex items-center justify-center hover:bg-[#E2E2E9] transition-colors"
            >
              Jadi Kreator
            </Link>
          </div>

          {/* Tools & Creator Stack Pill Ribbon */}
          <div className="w-full pt-6 border-t border-[#E7E9EC]">
            <p className="text-[11px] font-bold tracking-wider text-[#707880] uppercase mb-3">
              TOOLS &amp; WORKFLOW KREATIF YANG DIPELAJARI
            </p>
            <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-[#5B616E]">
              {["Runway Gen-3", "Kling AI", "Midjourney", "ComfyUI", "Luma Dream Machine", "CapCut AI"].map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1 rounded-full bg-white border border-[#E7E9EC] text-[#16181D]"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Semi-Bento Creative Studio Canvas */}
        <div className="lg:col-span-5 relative">
          <div className="relative bg-gradient-to-br from-[#E8F6FF] via-[#F9F9FF] to-[#FFF0F4] border border-[#E7E9EC] rounded-3xl p-6 sm:p-8 shadow-sm">
            {/* Mascot Hazel Float */}
            <div className="absolute -top-10 -right-4 sm:-right-6 w-28 h-28 sm:w-32 sm:h-32 z-20 pointer-events-none">
              <Image
                src="/brand/mascot/hazel-wave.webp"
                alt="Hazel si maskot menyapa"
                fill
                sizes="128px"
                className="object-contain drop-shadow-md"
                priority
              />
            </div>

            {/* AI Video Preview Screen Box */}
            <div className="relative bg-[#16181D] rounded-2xl overflow-hidden border border-[#2E3036] shadow-md mb-5 group">
              <div className="relative aspect-video flex items-center justify-center bg-gradient-to-tr from-[#0F172A] to-[#1E293B]">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#36BDF2_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="relative z-10 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mx-auto mb-2 text-white group-hover:scale-110 transition-transform">
                    <PlayIcon className="w-5 h-5 ml-0.5 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    Prompt: Cinematic Cyberpunk Jakarta 2077
                  </p>
                  <p className="text-[11px] text-[#72D2FF] font-mono mt-0.5">
                    Kling AI 1.5 • 4K 60fps • Realistic Lighting
                  </p>
                </div>
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                  Video AI Showcase
                </span>
                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-[#FF2F86] text-[10px] font-bold text-white">
                  Trending
                </span>
              </div>
            </div>

            {/* Interactive Bento Stat Clusters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/90 backdrop-blur-sm border border-[#E7E9EC] p-3.5 rounded-xl">
                <span className="text-[11px] text-[#707880] block font-medium">Bagi Hasil Kreator</span>
                <p className="text-xl sm:text-2xl font-extrabold text-[#16181D] mt-0.5">95%</p>
                <p className="text-[10px] text-[#0077A8] font-bold mt-1">Potongan platform cuma 5%</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm border border-[#E7E9EC] p-3.5 rounded-xl">
                <span className="text-[11px] text-[#707880] block font-medium">Biaya Bulanan</span>
                <p className="text-xl sm:text-2xl font-extrabold text-[#16181D] mt-0.5">Rp 0</p>
                <p className="text-[10px] text-[#CC0052] font-bold mt-1">Tanpa biaya langganan</p>
              </div>
            </div>

            {/* Active Creator Floating Pill */}
            <div className="mt-3 bg-white border border-[#E7E9EC] p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EDEDF4] flex items-center justify-center font-bold text-xs text-[#0077A8]">
                  BK
                </div>
                <div>
                  <p className="text-xs font-bold text-[#16181D]">Bayu Kreatif</p>
                  <p className="text-[10px] text-[#707880]">Penjualan: 42 Template Video</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-[#E8F6FF] text-[11px] font-bold text-[#0077A8]">
                +Rp 2.100.000
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Value Pillars Quick Bar */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#E7E9EC] pt-8">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E7E9EC] shadow-none">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8]">
            <CheckCircleIcon className="w-5 h-5 text-[#0077A8]" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#16181D]">Belajar dari Kreator</h3>
            <p className="text-xs text-[#5B616E] mt-0.5 leading-relaxed">
              Kelas video AI langsung dari yang sudah praktik menghasilkan cuan, bukan sekadar teori.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E7E9EC] shadow-none">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#CC0052]">
            <SparklesIcon className="w-5 h-5 text-[#CC0052]" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#16181D]">Jualan Karyamu Sendiri</h3>
            <p className="text-xs text-[#5B616E] mt-0.5 leading-relaxed">
              Kelas, template prompt, video jadi, dan tiket webinar dalam satu akun kreator.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E7E9EC] shadow-none">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDEDF4] text-[#16181D]">
            <CheckCircleIcon className="w-5 h-5 text-[#0077A8]" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#16181D]">Potongan Cuma 5%</h3>
            <p className="text-xs text-[#5B616E] mt-0.5 leading-relaxed">
              Sisanya 95% langsung masuk dompet dan bisa ditarik ke rekening kapan saja.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
