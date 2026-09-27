import {
  MessageSquareText,
  ImagePlay,
  Scissors,
  Megaphone,
  Smartphone,
  Clapperboard,
  Sparkles,
  BadgeCheck,
  Store,
} from "lucide-react";

const SKILLS = [
  {
    icon: MessageSquareText,
    title: "Prompt Engineering",
    body: "Menulis prompt yang konsisten untuk gambar dan video tanpa glitch distorsi.",
  },
  {
    icon: ImagePlay,
    title: "Image-to-Video",
    body: "Menghidupkan gambar diam jadi klip visual yang bergerak sinematik.",
  },
  {
    icon: Scissors,
    title: "Editing & Post-Produksi",
    body: "Merangkai klip AI jadi video utuh berirama yang enak ditonton.",
  },
  {
    icon: Megaphone,
    title: "Iklan Produk Komersial",
    body: "Membuat video iklan brand dengan hook 3 detik dan alur yang menjual.",
  },
  {
    icon: Smartphone,
    title: "UGC Kreator",
    body: "Konten video gaya kreator vertikal untuk TikTok, Reels, dan YouTube Shorts.",
  },
  {
    icon: Clapperboard,
    title: "Motion & Animasi",
    body: "Kontrol gerak kamera, transisi dinamis, dan efek motion graphic AI.",
  },
];

export function ECourseFeatures() {
  return (
    <section className="w-full bg-[#FAFAFA] py-20 sm:py-28 border-b border-[#E7E9EC]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-[640px] mb-12">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0077A8] bg-[#E8F6FF] px-3.5 py-1.5 rounded-full border border-[#BFC7D0]/40">
            Yang kamu pelajari
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#16181D] tracking-tight leading-[1.1]">
            Semua soal video AI, dari ide sampai tayang.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B616E] leading-relaxed">
            Kelas di Hazl Academy berputar di enam keterampilan inti ini. Pilih yang paling kamu butuhkan untuk proyek atau bisnismu sekarang.
          </p>
        </div>

        {/* 6 Skill Semi-Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SKILLS.map((skill) => {
            const Icon = skill.icon;
            return (
              <div
                key={skill.title}
                className="flex items-start gap-4 rounded-[28px] border border-[#E7E9EC] bg-white p-6 sm:p-7 shadow-sm hover:shadow-md transition-all group"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#FF2F86] group-hover:scale-95 transition-transform">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#16181D] tracking-tight group-hover:text-[#0077A8] transition-colors">
                    {skill.title}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-[#5B616E] leading-relaxed">
                    {skill.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dark Value Guarantees Band */}
        <div className="mt-10 rounded-[32px] bg-[#16181D] p-7 sm:p-9 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FF2F86]">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-base font-bold text-white">Praktik, bukan teori</p>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#BFC7D0]">
                  Ikuti materinya, kerjakan tugasnya pakai template, dan simpan hasilnya sebagai portofolio.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#36BDF2]">
                <BadgeCheck size={18} />
              </span>
              <div>
                <p className="text-base font-bold text-white">Sertifikat ber-QR</p>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#BFC7D0]">
                  Selesaikan kelas, sertifikat terverifikasi langsung terbit dan bisa dicek siapa saja secara publik.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#00E599]">
                <Store size={18} />
              </span>
              <div>
                <p className="text-base font-bold text-white">Lanjut jualan</p>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#BFC7D0]">
                  Sudah terbiasa? Aktifkan akun kreator dan jual kelas atau template karyamu dengan potongan cuma 5%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
