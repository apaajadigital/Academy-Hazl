import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "./HomeIcons";

const LEARNER_STEPS = [
  {
    step: "01",
    icon: "/brand/journey/pilih-challenge.webp",
    title: "Pilih kelas",
    desc: "Cari kelas sesuai level dan tools yang mau kamu kuasai.",
  },
  {
    step: "02",
    icon: "/brand/journey/kirim-karya.webp",
    title: "Praktik bareng materi",
    desc: "Tonton, ikuti, dan kerjakan tugasnya pakai template.",
  },
  {
    step: "03",
    icon: "/brand/journey/hasil-penilaian.webp",
    title: "Dapat sertifikat",
    desc: "Selesaikan kelas, sertifikat ber-QR langsung terbit.",
  },
];

const CREATOR_STEPS = [
  {
    step: "01",
    icon: "/brand/journey/susun-brief.webp",
    title: "Aktifkan akun kreator",
    desc: "Satu klik dari akunmu, tanpa menunggu persetujuan berbelit.",
  },
  {
    step: "02",
    icon: "/brand/journey/tinjau-karya.webp",
    title: "Upload produk",
    desc: "Kelas, template prompt, stok video jadi, atau tiket webinar.",
  },
  {
    step: "03",
    icon: "/brand/journey/tentukan-hasil.webp",
    title: "Terima penghasilan",
    desc: "Potongan cuma 5%, sisanya 95% masuk dompet dan bisa ditarik.",
  },
];

export function PillarsSection() {
  return (
    <section id="cara-kerja" className="w-full bg-[#F6F7F9] py-20 sm:py-28 border-b border-[#E7E9EC]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-[620px] text-center mb-14">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0077A8] bg-[#E8F6FF] px-3 py-1 rounded-full border border-[#BFC7D0]/40">
            Cara kerja
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#16181D] tracking-tight leading-[1.1]">
            Dari belajar, jadi cuan.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B616E] leading-relaxed">
            Tiga langkah untuk belajar, tiga langkah untuk mulai jualan. Semuanya dari satu akun tanpa ribet.
          </p>
        </div>

        {/* Dual Semi-Bento Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Untuk Pelajar */}
          <div className="rounded-[32px] border border-[#E7E9EC] bg-[#E8F6FF]/70 p-7 sm:p-9 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0077A8]">
                    UNTUK PELAJAR
                  </span>
                  <h3 className="mt-1 text-2xl font-extrabold text-[#16181D] tracking-tight">
                    Belajar video AI
                  </h3>
                </div>
                <div className="relative w-16 h-16 shrink-0">
                  <Image
                    src="/brand/mascot/hazel-pemandu.webp"
                    alt="Hazel pemandu belajar"
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Steps List */}
              <ol className="flex flex-col gap-3.5">
                {LEARNER_STEPS.map((item) => (
                  <li
                    key={item.step}
                    className="flex items-center gap-4 rounded-2xl bg-white/90 p-4 border border-[#E7E9EC]/70 shadow-sm backdrop-blur-sm"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F6F7F9] p-2">
                      <Image
                        src={item.icon}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-bold text-[#16181D]">
                        {item.title}
                      </p>
                      <p className="text-xs sm:text-sm text-[#5B616E] mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-[#9CA3AF] mr-1">
                      {item.step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-8">
              <Link
                href="/e-course"
                className="h-11 px-6 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-bold inline-flex items-center gap-2 hover:bg-[#72D2FF] transition-all"
              >
                <span>Mulai belajar</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Untuk Kreator */}
          <div className="rounded-[32px] border border-[#E7E9EC] bg-[#FFF0F4]/70 p-7 sm:p-9 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#CC0052]">
                    UNTUK KREATOR
                  </span>
                  <h3 className="mt-1 text-2xl font-extrabold text-[#16181D] tracking-tight">
                    Jual karyamu
                  </h3>
                </div>
                <div className="relative w-16 h-16 shrink-0">
                  <Image
                    src="/brand/mascot/hazel-mengintip.webp"
                    alt="Hazel mengintip ramah"
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Steps List */}
              <ol className="flex flex-col gap-3.5">
                {CREATOR_STEPS.map((item) => (
                  <li
                    key={item.step}
                    className="flex items-center gap-4 rounded-2xl bg-white/90 p-4 border border-[#E7E9EC]/70 shadow-sm backdrop-blur-sm"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F6F7F9] p-2">
                      <Image
                        src={item.icon}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-bold text-[#16181D]">
                        {item.title}
                      </p>
                      <p className="text-xs sm:text-sm text-[#5B616E] mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-[#9CA3AF] mr-1">
                      {item.step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-8">
              <Link
                href="/trainer-program"
                className="h-11 px-6 rounded-full bg-[#16181D] text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-[#FF2F86] hover:text-white transition-all"
              >
                <span>Jadi kreator</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
