import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Sparkles, Video, FileCode } from "lucide-react";
import { features } from "@/lib/features";

const TOPICS = [
  { name: "Semua", href: "/e-course" },
  { name: "Dasar Prompt", href: "/e-course?topik=prompt" },
  { name: "Text & Image to Video", href: "/e-course?topik=video-gen" },
  { name: "Editing & Post-Produksi", href: "/e-course?topik=editing" },
  { name: "Iklan & UGC", href: "/e-course?topik=iklan" },
  { name: "Motion & Animasi", href: "/e-course?topik=motion" },
  { name: "Suara & Musik AI", href: "/e-course?topik=audio" },
  { name: "Bisnis Kreator", href: "/e-course?topik=bisnis" },
];

export function ECourseHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F6FF]/60 via-white to-white pt-24 pb-12 sm:pt-28 sm:pb-16 border-b border-[#E7E9EC]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          {/* Left Column: Heading & Subheading */}
          <div className="max-w-2xl">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0077A8] bg-[#E8F6FF] px-3.5 py-1.5 rounded-full border border-[#BFC7D0]/40 inline-flex items-center gap-1.5 mb-4">
              <Sparkles size={13} className="text-[#FF2F86]" />
              Katalog Kelas Video AI
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#16181D] tracking-tight leading-[1.08] mb-4">
              Pilih kelas. <span className="text-[#0077A8]">Mulai berkarya.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#5B616E] leading-relaxed max-w-xl">
              Kelas video AI dari kreator Indonesia. Mulai dari dasar prompt dan image-to-video, sampai editing, iklan komersial, dan konten UGC yang siap cuan.
            </p>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/daftar"
                className="h-11 px-6 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-bold inline-flex items-center gap-2 hover:bg-[#72D2FF] transition-all shadow-sm"
              >
                <span>Mulai Belajar</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {features.trainerProgram && (
              <Link
                href="/trainer-program"
                className="h-11 px-6 rounded-full border border-[#E7E9EC] bg-white text-sm font-bold text-[#16181D] inline-flex items-center gap-2 hover:bg-[#F6F7F9] transition-colors shadow-sm"
              >
                Buka Kelas Sendiri
              </Link>
              )}
            </div>
          </div>

          {/* Right Column: Hazel Mascot Illustration */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 self-center lg:self-auto shrink-0">
            <Image
              src="/brand/mascot/hazel-pemandu.webp"
              alt="Hazel pemandu kelas"
              fill
              sizes="(min-width: 1024px) 256px, 192px"
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
        </div>

        {/* Category Topic Pills Bar */}
        <div className="pt-6 border-t border-[#E7E9EC]/70">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707880] mr-2 shrink-0">
              Topik:
            </span>
            {TOPICS.map((topic, index) => (
              <Link
                key={topic.name}
                href={topic.href}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  index === 0
                    ? "bg-[#16181D] text-white border-[#16181D]"
                    : "bg-white text-[#5B616E] border-[#E7E9EC] hover:border-[#707880] hover:text-[#16181D]"
                }`}
              >
                {topic.name}
              </Link>
            ))}
          </div>
        </div>

        {/* 3 Quick Value Badges */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E7E9EC] shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8]">
              <Video size={17} />
            </span>
            <div>
              <p className="text-xs font-bold text-[#16181D]">Praktik Video Nyata</p>
              <p className="text-[11px] text-[#707880]">Materi dari praktisi, bukan teori</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E7E9EC] shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8FFF4] text-[#00875A]">
              <BadgeCheck size={17} />
            </span>
            <div>
              <p className="text-xs font-bold text-[#16181D]">Sertifikat Ber-QR</p>
              <p className="text-[11px] text-[#707880]">Verifikasi instan via pindaian</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E7E9EC] shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#CC0052]">
              <FileCode size={17} />
            </span>
            <div>
              <p className="text-xs font-bold text-[#16181D]">Template &amp; Preset</p>
              <p className="text-[11px] text-[#707880]">Project file siap pakai produksi</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
