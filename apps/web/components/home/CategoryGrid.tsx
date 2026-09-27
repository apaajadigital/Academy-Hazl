import Link from "next/link";
import { ArrowRightIcon } from "./HomeIcons";

const TRACKS = [
  {
    trackNo: "TRACK 01",
    count: "12 Kursus",
    title: "Fullstack Engineering",
    description: "Membangun arsitektur microservices performa tinggi, domain-driven design, dan modern client SPA.",
    tags: ["Go", "Laravel", "React/Next", "GraphQL"],
    href: "/e-course?kategori=engineering",
  },
  {
    trackNo: "TRACK 02",
    count: "8 Kursus",
    title: "Cloud & DevOps",
    description: "Orkestrasi infrastructure-as-code, pipeline CI/CD zero-downtime, dan monitoring reliability standar SRE.",
    tags: ["Kubernetes", "Terraform", "AWS", "Prometheus"],
    href: "/e-course?kategori=devops",
  },
  {
    trackNo: "TRACK 03",
    count: "10 Kursus",
    title: "Data & AI Systems",
    description: "Pengembangan pipeline data lakehouse skala petabyte, deployment LLM on-premise, dan automasi MLOps.",
    tags: ["PySpark", "dbt", "Kafka", "vLLM"],
    href: "/e-course?kategori=data-ai",
  },
  {
    trackNo: "TRACK 04",
    count: "6 Kursus",
    title: "Product & UI/UX",
    description: "Desain sistem enterprise multi-brand, metriks product discovery berbasis data, dan delivery handoff presisi.",
    tags: ["Design Tokens", "Figma Pro", "A/B Test", "PRD"],
    href: "/e-course?kategori=product",
  },
];

export function CategoryGrid() {
  return (
    <section className="w-full bg-[#F6F7F9] border-y border-[#E7E9EC] py-16">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-[#E7E9EC] gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-[#0077A8] uppercase">
              SPESIALISASI UTAMA
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16181D] tracking-tight mt-1">
              Jalur Pembelajaran Terstruktur
            </h2>
          </div>
          <p className="text-sm text-[#5B616E] max-w-md">
            Bukan card generik. Setiap spesialisasi memiliki silabus adaptif yang disinkronisasi setiap kuartal dengan kebutuhan talent stack B2B.
          </p>
        </div>

        {/* Structural Interactive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRACKS.map((track) => (
            <div
              key={track.trackNo}
              className="bg-white border border-[#E7E9EC] rounded-xl p-6 flex flex-col justify-between hover:border-[#707880] transition-all duration-150 shadow-none hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold text-[#707880] uppercase tracking-wider">
                    {track.trackNo}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#EDEDF4] text-[11px] text-[#0077A8] font-semibold">
                    {track.count}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#16181D] mb-2">
                  {track.title}
                </h3>
                <p className="text-xs text-[#5B616E] leading-relaxed mb-6">
                  {track.description}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {track.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded bg-[#F6F7F9] text-[11px] font-mono text-[#3F484F] border border-[#E7E9EC]/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={track.href}
                  className="text-xs text-[#0077A8] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  Jelajahi Silabus <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
