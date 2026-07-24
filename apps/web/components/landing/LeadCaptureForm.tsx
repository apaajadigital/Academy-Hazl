"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { track, AnalyticsEvent } from "@/lib/analytics";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Source = "affiliate" | "lms" | "trainer" | "free-class" | "community" | "other";

type Props = {
  source: Source;
  /** Show the company field (B2B funnels). */
  withCompany?: boolean;
  submitLabel?: string;
};

/** Lead capture form (TASK-040) — posts to POST /api/leads, honest states. */
export function LeadCaptureForm({ source, withCompany = false, submitLabel = "Kirim" }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          source,
          ...(phone ? { phone } : {}),
          ...(withCompany && company ? { company } : {}),
          ...(message ? { message } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Gagal mengirim. Coba lagi.");
        return;
      }
      track(AnalyticsEvent.LEAD_SUBMIT, { source });
      setDone(true);
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-white p-8 text-center shadow-e1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]">
          <CheckCircle2 size={24} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">Terima kasih!</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Data kamu sudah kami terima. Tim kami akan segera menghubungi.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-white p-6 shadow-e2 sm:p-8"
    >
      {error && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Nama lengkap</label>
        <input id="lead-name" required value={name} onChange={(e) => setName(e.target.value)} className="input-dark" placeholder="Nama Anda" />
      </div>
      <div>
        <label htmlFor="lead-email" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Email</label>
        <input id="lead-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" placeholder="nama@email.com" />
      </div>
      <div>
        <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">No. WhatsApp <span className="text-[var(--text-muted)]">(opsional)</span></label>
        <input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-dark" placeholder="08xxxxxxxxxx" />
      </div>
      {withCompany && (
        <div>
          <label htmlFor="lead-company" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Perusahaan <span className="text-[var(--text-muted)]">(opsional)</span></label>
          <input id="lead-company" value={company} onChange={(e) => setCompany(e.target.value)} className="input-dark" placeholder="Nama perusahaan" />
        </div>
      )}
      <div>
        <label htmlFor="lead-message" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Pesan <span className="text-[var(--text-muted)]">(opsional)</span></label>
        <textarea id="lead-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="input-dark resize-none" placeholder="Ceritakan kebutuhanmu…" />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn btn-lg mt-1 w-full bg-brand-gradient text-white shadow-e2 transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Mengirim…" : (<>{submitLabel}<ArrowRight size={18} aria-hidden="true" /></>)}
      </button>
    </form>
  );
}
