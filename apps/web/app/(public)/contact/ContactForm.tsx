"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";

const TOPICS = [
  "Pertanyaan umum",
  "Masalah teknis",
  "Pembayaran & refund",
  "Korporat & LMS",
  "Partnership & kolaborasi",
  "Lainnya",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          source: "contact",
          message: `[Topik: ${topic}] ${message}`.trim(),
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error?.message ?? "Gagal mengirim pesan. Silakan coba lagi.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Pesan terkirim!</h3>
        <p className="text-sm text-text-secondary">
          Terima kasih, {name}. Tim kami akan menghubungi Anda di <strong>{email}</strong> dalam 1–2 hari kerja.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <h2 className="text-xl font-bold text-text-primary">Kirim Pesan</h2>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="name"
            type="text"
            label="Nama"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda"
          />
          <Input
            id="email"
            type="email"
            label="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
          />
        </div>

        <Select id="topic" label="Topik" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Textarea
          id="message"
          label="Pesan"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis pesan Anda di sini…"
        />

        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Kirim Pesan
        </Button>
      </form>
    </Card>
  );
}
