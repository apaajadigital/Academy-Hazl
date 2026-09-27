import { TerminalIcon, RateReviewIcon, NetworkHubIcon } from "./HomeIcons";

const PILLARS = [
  {
    icon: TerminalIcon,
    title: "Production-Grade Curriculum",
    body: "Studi kasus langsung dari production codebase. Anda tidak membuat to-do list sederhana, melainkan menangani race conditions, caching multi-layer, dan payload terenkripsi.",
  },
  {
    icon: RateReviewIcon,
    title: "1-on-1 Code Review & Mentorship",
    body: "Setiap pull request Anda ditinjau secara baris per baris oleh Tech Lead korporat. Dapatkan umpan balik tajam mengenai time complexity, modularitas, dan security audit.",
  },
  {
    icon: NetworkHubIcon,
    title: "Jalur Karier & B2B Talent Network",
    body: "Akses langsung ke hiring manager mitra kami tanpa perantara portal lowongan umum. Profil teknis terverifikasi Anda disalurkan ke pipeline rekrutmen prioritas.",
  },
];

export function PillarsSection() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[11px] font-bold tracking-widest text-[#0077A8] uppercase">
          METODOLOGI KAMI
        </span>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#16181D] tracking-tight mt-1 mb-3">
          Dirancang Tanpa Gimmick. Fokus Pada Kapabilitas Produksi.
        </h2>
        <p className="text-sm sm:text-base text-[#5B616E]">
          Standar industri tidak dicapai melalui kuis pilihan ganda. Kami menerapkan rigor teknis kelas korporasi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="bg-white border border-[#E7E9EC] rounded-xl p-8 flex flex-col items-start hover:border-[#707880] transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-[#F6F7F9] border border-[#E7E9EC] flex items-center justify-center text-[#16181D] mb-6">
                <Icon className="w-6 h-6 text-[#0077A8]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#16181D] mb-3">
                {pillar.title}
              </h3>
              <p className="text-sm text-[#5B616E] leading-relaxed">
                {pillar.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
