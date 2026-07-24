"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, MailCheck } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { forgotPassword } from "@/lib/auth/api";

export function LupaPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (!result.success) {
      setError(result.error?.message ?? "Terjadi kesalahan.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-accent-soft">
          <MailCheck size={30} className="text-accent" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Cek email Anda</h2>
        <p className="text-sm text-text-secondary">
          Jika email <strong className="text-text-primary">{email}</strong> terdaftar, kami telah mengirimkan tautan reset kata sandi. Tautan berlaku selama 1 jam.
        </p>
        <Link
          href="/masuk"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/masuk"
        className="mb-6 flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-text-primary">Lupa kata sandi?</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Masukkan email akun Anda dan kami akan mengirimkan tautan reset kata sandi.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          leftIcon={<Mail size={18} aria-hidden="true" />}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          rightIcon={<ArrowRight size={18} aria-hidden="true" />}
          className="w-full"
        >
          {loading ? "Mengirim…" : "Kirim tautan reset"}
        </Button>
      </form>
    </>
  );
}
