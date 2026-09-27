"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, Lock, User } from "lucide-react";
import { Button, Input, PasswordInput } from "@/components/ui";
import { register, buildGoogleLoginUrl } from "@/lib/auth/api";

export function DaftarForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Anda harus menyetujui Kebijakan Privasi untuk mendaftar.");
      return;
    }

    setLoading(true);
    const result = await register({ name, email, password, consent: true });
    setLoading(false);

    if (!result.success) {
      setError(result.error?.message ?? "Terjadi kesalahan.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-accent-soft">
          <CheckCircle2 size={24} className="text-accent" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Registrasi berhasil!</h2>
        <p className="text-sm text-text-secondary">
          Akun untuk <strong>{email}</strong> berhasil dibuat. Silakan masuk untuk
          mulai menggunakan Hazl Academy.
        </p>
        <Link
          href="/masuk"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-7 py-3 text-[0.9375rem] font-semibold text-white shadow-e1 transition hover:opacity-90 hover:shadow-e2"
        >
          Ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-text-primary">Buat akun</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-accent hover:underline">
          Masuk di sini
        </Link>
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id="name"
          type="text"
          label="Nama lengkap"
          leftIcon={<User size={18} aria-hidden="true" />}
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Anda"
        />

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

        <PasswordInput
          id="password"
          label="Kata Sandi"
          leftIcon={<Lock size={18} aria-hidden="true" />}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
        />

        <div className="flex items-start gap-3">
          <input
            id="consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border-strong text-accent focus:ring-accent-cyan-strong"
          />
          <label htmlFor="consent" className="cursor-pointer text-sm leading-snug text-text-secondary">
            Saya menyetujui{" "}
            <Link href="/privacy" className="text-accent hover:underline" target="_blank">
              Kebijakan Privasi
            </Link>{" "}
            dan{" "}
            <Link href="/terms" className="text-accent hover:underline" target="_blank">
              Syarat &amp; Ketentuan
            </Link>{" "}
            Hazl Academy, termasuk pemrosesan data pribadi saya sesuai UU PDP.
          </label>
        </div>

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
          {loading ? "Mendaftarkan…" : "Buat akun"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border-default" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-transparent px-3 text-text-secondary">atau</span>
        </div>
      </div>

      <a
        href={buildGoogleLoginUrl()}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-border-strong px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-accent-soft"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" />
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
        </svg>
        Daftar dengan Google
      </a>
    </>
  );
}
