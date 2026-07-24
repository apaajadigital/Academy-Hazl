"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { resetPassword } from "@/lib/auth/api";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-red-600">Token reset tidak valid atau sudah kedaluwarsa.</p>
        <Link href="/lupa-password" className="text-sm text-accent hover:underline">
          Minta tautan baru
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-accent-soft">
          <CheckCircle2 size={30} className="text-accent" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Kata sandi berhasil diperbarui!</h2>
        <p className="text-sm text-text-secondary">Silakan masuk dengan kata sandi baru Anda.</p>
        <Link
          href="/masuk"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-7 py-3 text-[0.9375rem] font-semibold text-white shadow-e1 transition hover:opacity-90 hover:shadow-e2"
        >
          Masuk sekarang
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error?.message ?? "Terjadi kesalahan.");
      return;
    }

    setSuccess(true);
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-text-primary">Buat kata sandi baru</h1>
      <p className="mb-6 text-sm text-text-secondary">Kata sandi minimal 8 karakter.</p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id="password"
          type="password"
          label="Kata sandi baru"
          leftIcon={<Lock size={18} aria-hidden="true" />}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
        />

        <Input
          id="confirm"
          type="password"
          label="Konfirmasi kata sandi"
          leftIcon={<Lock size={18} aria-hidden="true" />}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi kata sandi"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          rightIcon={<ArrowRight size={18} aria-hidden="true" />}
          className="w-full"
        >
          {loading ? "Menyimpan…" : "Simpan kata sandi baru"}
        </Button>

        <Link href="/masuk" className="block text-center text-sm text-accent hover:underline">
          Batal dan kembali ke masuk
        </Link>
      </form>
    </>
  );
}
