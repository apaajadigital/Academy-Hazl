import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon } from "./HomeIcons";

const B2B_BENEFITS = [
  "Workspace terpisah per divisi atau tim",
  "Pantau progres belajar tiap anggota secara real-time",
  "Data terisolasi per perusahaan dengan standar keamanan enterprise",
];

export function B2BSection() {
  return (
    <section className="w-full bg-[#E8FFF4]/50 py-20 sm:py-24 border-b border-[#E7E9EC]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Messaging & Benefits */}
          <div className="lg:col-span-7">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#00875A] bg-white px-3 py-1 rounded-full border border-[#BFC7D0]/40">
              Untuk tim &amp; institusi
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#16181D] tracking-tight leading-[1.1]">
              Latih tim kreatifmu pakai video AI.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#5B616E] leading-relaxed max-w-xl">
              LMS Hazl Academy untuk agensi, brand, dan kampus: kelola program pelatihan, lacak progres skill, dan terbitkan sertifikat dari satu workspace terpusat.
            </p>

            <ul className="mt-8 flex flex-col gap-3.5">
              {B2B_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#00875A] shadow-sm border border-[#E7E9EC]">
                    <CheckCircleIcon className="w-4 h-4 text-[#00875A]" />
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#16181D]">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: CTA Bento Card */}
          <div className="lg:col-span-5">
            <div className="rounded-[32px] border border-[#E7E9EC] bg-white p-8 sm:p-9 shadow-sm">
              <span className="text-xs font-bold text-[#0077A8] uppercase tracking-wider block mb-1">
                COBA DULU 14 HARI
              </span>
              <h3 className="text-2xl font-extrabold text-[#16181D] leading-tight mb-6">
                LMS untuk tim kreatif, tanpa kartu kredit.
              </h3>
              <div className="flex flex-col gap-3">
                <Link
                  href="/clients"
                  className="h-11 px-6 rounded-full bg-[#0077A8] text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#005A80] transition-colors shadow-sm"
                >
                  <span>Lihat paket LMS</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="h-11 px-6 rounded-full border border-[#E7E9EC] bg-white text-[#16181D] text-sm font-semibold inline-flex items-center justify-center hover:bg-[#F6F7F9] transition-colors"
                >
                  Konsultasi dengan tim kami
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
