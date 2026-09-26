"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      console.error("[Global Error]", error.message, error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold text-red-400 mb-4">500</p>
        <h1 className="text-2xl font-bold text-[#1D1D1F] mb-3">
          Terjadi Kesalahan
        </h1>
        <p className="text-[#6E6E73] mb-2">
          Kami mengalami masalah teknis. Tim kami sedang menyelesaikannya.
        </p>
        {error.digest && (
          <p className="text-xs text-[#6E6E73] mb-6 font-mono">
            Kode error: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-[#0077A8] text-white font-semibold hover:bg-[#005f87] transition-colors"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-[#D2D2D7] text-[#1D1D1F] font-semibold hover:bg-white transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
