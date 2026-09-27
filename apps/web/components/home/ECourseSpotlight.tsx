import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ClockIcon, UsersIcon, StarIcon } from "./HomeIcons";

const FEATURED_COURSES = [
  {
    title: "Etika dan Hak Cipta Konten AI",
    category: "Bisnis Kreator",
    author: "Tim Kurikulum Hazl Academy",
    duration: "1 jam 54 mnt",
    students: "31 siswa",
    rating: "4.6",
    price: "Gratis",
    image: "/uploads/images/demo/c-etika.webp",
    href: "/e-course",
  },
  {
    title: "Paket Konten Bulanan untuk UMKM",
    category: "Bisnis Kreator",
    author: "Bayu Kreatif",
    duration: "1 jam 57 mnt",
    students: "9 siswa",
    rating: "4.7",
    price: "Rp 159.000",
    image: "/uploads/images/demo/c-umkm.webp",
    href: "/e-course",
  },
  {
    title: "Negosiasi dan Kontrak Klien",
    category: "Bisnis Kreator",
    author: "Zidan Coach",
    duration: "2 jam",
    students: "11 siswa",
    rating: "4.7",
    price: "Rp 179.000",
    image: "/uploads/images/demo/c-kontrak.webp",
    href: "/e-course",
  },
  {
    title: "Membangun Agensi Video AI Kecil",
    category: "Bisnis Kreator",
    author: "Anisa Agensi",
    duration: "2 jam 3 mnt",
    students: "6 siswa",
    rating: "4.7",
    price: "Rp 379.000",
    oldPrice: "Rp 449.000",
    image: "/uploads/images/demo/c-agensi.webp",
    href: "/e-course",
  },
  {
    title: "Portofolio Kreator AI yang Menjual",
    category: "Bisnis Kreator",
    author: "Putri Freelance",
    duration: "2 jam 6 mnt",
    students: "13 siswa",
    rating: "4.7",
    price: "Rp 129.000",
    image: "/uploads/images/demo/c-portofolio.webp",
    href: "/e-course",
  },
  {
    title: "Podcast Video dengan AI",
    category: "Suara & Musik AI",
    author: "Mira Podcast",
    duration: "1 jam 57 mnt",
    students: "10 siswa",
    rating: "4.8",
    price: "Rp 139.000",
    image: "/uploads/images/demo/c-podcast.webp",
    href: "/e-course",
  },
];

export function ECourseSpotlight() {
  return (
    <section className="w-full bg-[#FFFDF9] py-20 sm:py-28 border-b border-[#E7E9EC]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Header with View All Link */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-[620px]">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0077A8] bg-[#E8F6FF] px-3 py-1 rounded-full border border-[#BFC7D0]/40">
              Kelas terbaru
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#16181D] tracking-tight leading-[1.1]">
              Pilih kelas, mulai berkarya.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#5B616E] leading-relaxed">
              Dari dasar prompt sampai produksi video iklan. Belajar langsung dari praktisi kreator yang sudah menghasilkan karya komersial.
            </p>
          </div>
          <Link
            href="/e-course"
            className="h-11 px-6 rounded-full border border-[#E7E9EC] bg-white text-sm font-bold text-[#16181D] inline-flex items-center gap-2 hover:border-[#707880] transition-colors self-start md:self-auto shadow-sm"
          >
            <span>Semua kelas</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {/* 6 High-Visual Course Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURED_COURSES.map((course) => (
            <Link
              key={course.title}
              href={course.href}
              className="group flex flex-col overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white shadow-sm hover:shadow-md transition-all duration-300"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-[#E8F6FF]">
                <Image
                  src={course.image}
                  alt={course.title}
                  fill
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-[#16181D] shadow-sm">
                  {course.category}
                </span>
              </div>

              {/* Course Info */}
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-base sm:text-lg font-extrabold text-[#16181D] line-clamp-2 leading-snug group-hover:text-[#0077A8] transition-colors">
                  {course.title}
                </h3>
                <p className="mt-1 text-xs text-[#707880]">
                  oleh {course.author}
                </p>

                {/* Meta pills */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5B616E]">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 text-[#707880]" />
                    {course.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5 text-[#707880]" />
                    {course.students}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                    <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {course.rating}
                  </span>
                </div>

                {/* Price and CTA */}
                <div className="mt-auto flex items-end justify-between pt-6 border-t border-[#F0F2F5] mt-6">
                  <div>
                    {course.oldPrice && (
                      <p className="text-[11px] text-[#9CA3AF] line-through">
                        {course.oldPrice}
                      </p>
                    )}
                    <p className="text-lg sm:text-xl font-extrabold text-[#16181D]">
                      {course.price}
                    </p>
                  </div>
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#16181D] px-4 text-xs font-bold text-white group-hover:bg-[#36BDF2] group-hover:text-[#16181D] transition-colors">
                    Lihat <ArrowRightIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
