import Link from "next/link";
import { CheckIcon, ArrowRightIcon, VerifiedIcon } from "./HomeIcons";

export function ECourseSpotlight() {
  return (
    <section className="w-full bg-white border-y border-[#E7E9EC] py-16">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="bg-[#F6F7F9] border border-[#E7E9EC] rounded-xl p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Details: Course Meta & Highlights */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded bg-[#FFD9DE] text-[#900038] text-[11px] font-bold">
                  FLAGSHIP E-COURSE
                </span>
                <span className="flex items-center gap-1 text-xs text-[#707880]">
                  <VerifiedIcon className="w-4 h-4 text-[#0077A8]" /> Terakreditasi Industri
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16181D] tracking-tight mb-4">
                Mastering Fullstack Laravel &amp; React Native Enterprise
              </h3>

              <p className="text-sm text-[#5B616E] leading-relaxed mb-6">
                Membangun arsitektur monorepo, sinkronisasi offline-first mobile database, arsitektur event-driven worker, dan integrasi Payment Gateway standar PCI-DSS.
              </p>

              {/* Key Syllabus Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-white border border-[#E7E9EC] p-3 rounded-lg">
                  <p className="text-[11px] text-[#707880] uppercase font-semibold">ARSITEKTUR</p>
                  <p className="text-sm text-[#16181D] font-semibold">Microservices &amp; DTO</p>
                </div>
                <div className="bg-white border border-[#E7E9EC] p-3 rounded-lg">
                  <p className="text-[11px] text-[#707880] uppercase font-semibold">DEVOPS</p>
                  <p className="text-sm text-[#16181D] font-semibold">CI/CD &amp; Docker Swarm</p>
                </div>
                <div className="bg-white border border-[#E7E9EC] p-3 rounded-lg">
                  <p className="text-[11px] text-[#707880] uppercase font-semibold">TRANSAKSI</p>
                  <p className="text-sm text-[#16181D] font-semibold">Idempotency &amp; Ledger</p>
                </div>
              </div>

              {/* Instructor Profile snippet */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E7E9EC]">
                <div className="w-10 h-10 rounded-full bg-[#EDEDF4] flex items-center justify-center font-bold text-[#16181D] text-sm">
                  RK
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#16181D]">Rian Kurniawan</p>
                  <p className="text-xs text-[#5B616E]">Principal Architect @ Hazl • Ex-Tech Lead Unicorn</p>
                </div>
              </div>
            </div>

            {/* Right Action & Enrollment Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#E7E9EC] rounded-xl p-6 sm:p-8">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-xs text-[#707880] line-through block">Rp 1.250.000</span>
                    <span className="font-display text-2xl sm:text-3xl text-[#16181D] font-extrabold tracking-tight">
                      Rp 349.000
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded bg-[#FFD9DE] text-[#B80049] text-[11px] font-bold">
                    HEMAT 72%
                  </span>
                </div>

                <div className="space-y-3 pb-6 mb-6 border-b border-[#E7E9EC] text-xs text-[#5B616E]">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-[#0077A8] shrink-0" />
                    <span>42 Jam Video Pelatihan 1080p Full Akses Selamanya</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-[#0077A8] shrink-0" />
                    <span>Akses Repositori Source Code Enterprise Boilerplate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-[#0077A8] shrink-0" />
                    <span>Sertifikat Kelulusan Verifikasi Kriptografis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-[#0077A8] shrink-0" />
                    <span>Review Tugas Akhir Personal oleh Mentor Senior</span>
                  </div>
                </div>

                <Link
                  href="/e-course"
                  className="w-full h-12 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#72D2FF] transition-colors active:scale-[0.99]"
                >
                  <span>Akses Kelas Sekarang</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <p className="text-center text-[11px] text-[#707880] mt-3">
                  Garansi 7 hari uang kembali jika materi tidak sesuai spesifikasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
