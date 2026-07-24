"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { login, buildGoogleLoginUrl } from "@/lib/auth/api";
import { setToken } from "@/lib/auth/token";

// Only allow same-origin relative redirects (A4: prevent open-redirect via the
// `redirect` query param). Anything protocol-relative ("//evil.com") or absolute
// ("https://evil.com") is rejected and falls back to the default destination.
function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function MasukForm() {
  const searchParams = useSearchParams();
  const redirectUrl = safeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login({ email, password });

    setLoading(false);

    if (!result.success) {
      setError(result.error?.message ?? "Terjadi kesalahan.");
      return;
    }

    // Persist token via centralized utility (sessionStorage + localStorage)
    setToken(result.data.accessToken);

    // If a redirect URL was provided (e.g. from checkout), go there
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    // Fetch role to determine redirect target
    try {
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${result.data.accessToken}` },
      }).then((r) => r.json());

      if (meRes.success) {
        const roleNames: string[] = (meRes.data.roles ?? []).map(
          (r: { role: string } | string) => (typeof r === "string" ? r : r.role)
        );
        if (roleNames.some((r) => ["admin", "super_admin"].includes(r))) {
          window.location.href = "/admin/dashboard";
          return;
        }
        // Trainers land on their own hub, not the student dashboard.
        if (roleNames.includes("trainer")) {
          window.location.href = "/trainer-hub";
          return;
        }
      }
    } catch {
      // fallback to dashboard
    }
    window.location.href = "/dashboard";
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-text-primary">Masuk</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-medium text-accent hover:underline">
          Daftar sekarang
        </Link>
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

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text-primary">
              Kata Sandi
            </label>
            <Link href="/lupa-password" className="text-xs text-accent hover:underline">
              Lupa kata sandi?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            leftIcon={<Lock size={18} aria-hidden="true" />}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata sandi Anda"
          />
        </div>

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
          {loading ? "Memproses…" : "Masuk"}
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
        Masuk dengan Google
      </a>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-text-muted opacity-70">
        <ShieldCheck size={16} aria-hidden="true" />
        <span className="text-xs">Koneksi aman &amp; terenkripsi</span>
      </div>
    </>
  );
}
