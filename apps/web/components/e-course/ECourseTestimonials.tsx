import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

export function ECourseTestimonials() {
  return (
    <section className="w-full bg-white py-20 sm:py-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-[#0077A8] via-[#0D5B8A] to-[#CC0052] px-8 py-14 sm:px-12 sm:py-16 text-white shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            {/* Copy */}
            <div className="max-w-[560px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm mb-4">
                <Sparkles size={13} className="text-pink-300" />
                Untuk Kreator
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[1.08] text-white">
                Punya skill video AI? Ajarkan.
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/90">
                Buka kelasmu sendiri di Hazl Academy. Aktifkan akun kreator, upload materi, dan terima penghasilan dengan potongan cuma 5% per penjualan.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/trainer-program"
                  className="h-11 px-6 rounded-full bg-white text-[#16181D] text-sm font-bold inline-flex items-center gap-2 hover:bg-[#F6F7F9] transition-colors shadow-sm"
                >
                  <span>Jadi kreator</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link
                  href="/kelas-gratis"
                  className="h-11 px-6 rounded-full border border-white/30 bg-white/10 text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  Coba kelas gratis
                </Link>
              </div>
            </div>

            {/* Mascot Visual */}
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 self-center md:self-auto shrink-0">
              <Image
                src="/brand/mascot/hazel-mengintip.webp"
                alt="Hazel mengintip ramah"
                fill
                sizes="(min-width: 768px) 208px, 176px"
                className="object-contain drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
