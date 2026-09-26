import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset Kata Sandi" };

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-[#6E6E73] py-8">Memuat…</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
