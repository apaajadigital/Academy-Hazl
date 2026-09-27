import { StarIcon } from "./HomeIcons";

const TESTIMONIALS = [
  {
    name: "Dimas Bagaswara",
    role: "Software Engineer di Telkom Indonesia",
    initials: "DB",
    quote:
      "Sesi code review di Hazl mengubah total cara saya menstrukturkan domain logic. Terbiasa menulis monolithic Laravel, di sini saya diajarkan decoupled services dan queue optimization yang langsung relevan saat tes teknikal di Telkom.",
  },
  {
    name: "Annisa Larasati",
    role: "Cloud Reliability Engineer di Bank Mandiri",
    initials: "AL",
    quote:
      "Silabus Cloud & DevOps benar-benar production-grade. Lab Kubernetes multi-node dan automasi Terraform di Hazl membuat saya percaya diri menangani sistem core banking yang menuntut keandalan 99.99% tanpa toleransi downtime.",
  },
  {
    name: "Fikri Ramadhan",
    role: "Product Designer di Bukalapak",
    initials: "FR",
    quote:
      "Pendekatan design system tokenomics di Hazl membuka mata saya. Saya belajar bagaimana sinkronisasi tokens dari Figma langsung ke codebase React tanpa miss spek. Handoff ke frontend lead kini 3x lebih cepat dan zero styling defect.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-4 border-b border-[#E7E9EC] gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-[#0077A8] uppercase">
            HASIL KARIER TERVERIFIKASI
          </span>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#16181D] tracking-tight mt-1">
            Pengalaman Otentik Para Lulusan
          </h2>
        </div>
        <p className="text-sm text-[#5B616E] max-w-md">
          Bukan testimoni rekayasa. Ini kisah langsung mereka yang berhasil melompat ke skala engineering enterprise.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="bg-white border border-[#E7E9EC] rounded-xl p-6 flex flex-col justify-between hover:border-[#707880] transition-colors"
          >
            <div>
              <div className="flex items-center gap-1 text-[#0077A8] mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 text-[#0077A8]" />
                ))}
              </div>
              <p className="text-sm text-[#16181D] mb-6 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-[#E7E9EC]">
              <div className="w-10 h-10 rounded-full bg-[#EDEDF4] border border-[#E7E9EC] flex items-center justify-center font-bold text-xs text-[#16181D]">
                {t.initials}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-[#16181D]">{t.name}</h4>
                <p className="text-[11px] text-[#5B616E]">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
