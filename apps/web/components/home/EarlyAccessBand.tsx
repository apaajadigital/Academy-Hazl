import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, SparklesIcon } from "./HomeIcons";

export function EarlyAccessBand() {
  return (
    <section className="w-full bg-white py-16 sm:py-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-r from-[#0077A8] via-[#0D5B8A] to-[#CC0052] px-6 py-16 sm:py-20 text-center shadow-lg">
          {/* Decorative Background Elements */}
          <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:20px_20px]"></div>

          <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto">
            {/* Mascot Hazel Welcoming */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-6">
              <Image
                src="/brand/mascot/hazel-menyambut.webp"
                alt="Hazel menyambut"
                fill
                sizes="128px"
                className="object-contain drop-shadow-md"
              />
            </div>

            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm mb-6">
              <SparklesIcon className="w-4 h-4 text-pink-300" />
              <span>Daftar gratis</span>
              <span className="hidden sm:inline opacity-60">•</span>
              <span className="hidden sm:inline font-semibold">Jualan mulai hari ini</span>
            </span>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] mb-5">
              Siap ubah skill AI-mu jadi penghasilan?
            </h2>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-white/90 max-w-xl mb-10 leading-relaxed font-normal">
              Mulai dari satu kelas. Saat sudah siap, buka lapakmu sendiri di Hazl Academy dan nikmati bagi hasil 95%.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/daftar"
                className="h-12 px-8 rounded-full bg-white text-[#16181D] text-sm sm:text-base font-bold inline-flex items-center gap-2 hover:bg-[#F6F7F9] transition-all shadow-md active:scale-[0.99]"
              >
                <span>Daftar gratis</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/trainer-program"
                className="h-12 px-8 rounded-full border border-white/30 bg-white/10 text-white text-sm sm:text-base font-bold inline-flex items-center gap-2 hover:bg-white/20 transition-all backdrop-blur-sm active:scale-[0.99]"
              >
                Pelajari jadi kreator
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
