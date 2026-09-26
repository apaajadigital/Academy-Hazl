import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmailPanel from "./VerifyEmailPanel";

export const metadata: Metadata = { title: "Verifikasi Email" };

export default function VerifikasiEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-[#6E6E73] py-8">Memuat…</div>
      }
    >
      <VerifyEmailPanel />
    </Suspense>
  );
}
