import Link from "next/link";
import { CheckCircleIcon, ArrowRightIcon } from "./HomeIcons";

export function B2BSection() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-16">
      <div className="bg-[#F6F7F9] border border-[#E7E9EC] rounded-xl p-8 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Copy */}
          <div className="lg:col-span-7">
            <span className="text-[11px] font-bold tracking-widest text-[#0077A8] uppercase mb-2 inline-block">
              UNTUK PERUSAHAAN &amp; INSTITUSI
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16181D] tracking-tight mb-4">
              Kelola Pelatihan Tim dalam Satu Workspace Terpadu
            </h2>
            <p className="text-sm text-[#5B616E] max-w-lg mb-6 leading-relaxed">
              Hazl Academy LMS B2B memungkinkan korporasi mengelola program upskilling karyawan, memantau kemajuan kurikulum secara real-time, dan menerbitkan sertifikat kompetensi resmi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-center gap-2 text-xs text-[#16181D]">
                <CheckCircleIcon className="w-4 h-4 text-[#0077A8]" />
                <span>Multi-tenant terisolasi per divisi</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#16181D]">
                <CheckCircleIcon className="w-4 h-4 text-[#0077A8]" />
                <span>Laporan analitik progres real-time</span>
              </div>
            </div>
            <Link
              href="/clients"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0077A8] hover:underline"
            >
              <span>Pelajari Solusi Korporat</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: Action Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#E7E9EC] rounded-xl p-6 sm:p-8">
              <span className="text-xs font-semibold text-[#0077A8] block mb-1">Trial 14 Hari Tanpa Komitmen</span>
              <h3 className="font-display text-xl font-bold text-[#16181D] mb-4">
                Coba LMS B2B Hazl Academy
              </h3>
              <p className="text-xs text-[#5B616E] mb-6 leading-relaxed">
                Dapatkan demo instan lingkungan pembelajaran karyawan dengan kurikulum teknologi terkini.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/clients"
                  className="h-11 px-6 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#72D2FF] transition-colors active:scale-[0.99]"
                >
                  Lihat Paket LMS B2B
                </Link>
                <Link
                  href="/contact"
                  className="h-11 px-6 rounded-full bg-white text-[#5B616E] border border-[#E7E9EC] text-sm font-medium inline-flex items-center justify-center hover:text-[#16181D] hover:border-[#707880] transition-colors"
                >
                  Konsultasi dengan Tim Kurikulum
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
