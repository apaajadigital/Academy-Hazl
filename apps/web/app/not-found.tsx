import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold text-[#0077A8] mb-4">404</p>
        <h1 className="text-2xl font-bold text-[#1D1D1F] mb-3">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-[#6E6E73] mb-8">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-[#0077A8] text-white font-semibold hover:bg-[#005f87] transition-colors"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/e-course"
            className="px-6 py-3 rounded-xl border border-[#D2D2D7] text-[#1D1D1F] font-semibold hover:bg-white transition-colors"
          >
            Jelajahi Kursus
          </Link>
        </div>
      </div>
    </div>
  );
}
