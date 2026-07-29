"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ScanLine, XCircle } from "lucide-react";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { checkInEventTicket, type EventCheckinResult } from "@/lib/api/events";

/**
 * On-site check-in desk (BL-61) — `POST /api/events/admin/checkin`.
 *
 * The endpoint has existed since BL-59 with no caller, so door staff had no way
 * to scan a ticket. It is deliberately NOT idempotent (a second scan is a hard
 * error so duplicate entry is caught), which is why each outcome is rendered as
 * its own state instead of a generic toast:
 *   200 → attendee + event, 404 "Tiket tidak ditemukan.",
 *   400 "Tiket sudah pernah di-scan.", 400 "Tiket belum confirmed."
 */

const LOGIN_REDIRECT = "/masuk?redirect=/admin/event/check-in";

type ScanOutcome =
  | { ok: true; ticketCode: string; name: string; email: string; eventTitle: string; at: string }
  | { ok: false; ticketCode: string; message: string };

function formatTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function toOutcome(ticketCode: string, data: EventCheckinResult): ScanOutcome {
  return {
    ok: true,
    ticketCode,
    name: data.user.name,
    email: data.user.email,
    eventTitle: data.event.title,
    at: formatTime(data.attendedAt),
  };
}

export default function AdminEventCheckInPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [ticketCode, setTicketCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  /** Scans made in THIS session only — every entry is a real API response. */
  const [history, setHistory] = useState<ScanOutcome[]>([]);

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    const code = ticketCode.trim();
    if (!code) return;

    setScanning(true);
    const result = await checkInEventTicket(code);
    setScanning(false);

    if (!result.success && result.status === 401) {
      // BL-60d: a dead session must not read as an invalid ticket.
      router.replace(LOGIN_REDIRECT);
      return;
    }

    const next: ScanOutcome = result.success
      ? toOutcome(code, result.data)
      : { ok: false, ticketCode: code, message: result.error.message };

    setOutcome(next);
    setHistory((prev) => [next, ...prev].slice(0, 10));
    setTicketCode("");
    // Keep focus on the field so a barcode scanner can fire back-to-back.
    inputRef.current?.focus();
  }

  return (
    <div className="dash-container flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/admin/event"
            className="inline-flex items-center gap-1 text-text-secondary transition-colors hover:text-accent-cyan-strong"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Manajemen Event
          </Link>
        }
        title="Check-in Peserta"
        subtitle="Masukkan kode tiket peserta untuk menandai kehadiran di lokasi acara."
      />

      <Card className="flex flex-col gap-4 p-6">
        <form onSubmit={handleScan} className="flex flex-wrap items-end gap-3">
          <Input
            ref={inputRef}
            label="Kode Tiket"
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Tempel atau pindai kode tiket"
            leftIcon={<ScanLine size={16} />}
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            containerClassName="min-w-[260px] flex-1"
            className="font-mono"
          />
          <Button type="submit" variant="cyan" size="sm" loading={scanning}>
            Check-in
          </Button>
        </form>

        {outcome &&
          (outcome.ok ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-solid border-green-200 bg-green-50 px-4 py-3"
            >
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" />
              <div className="min-w-0 text-sm text-green-800">
                <p className="font-bold">Check-in berhasil</p>
                <p className="mt-0.5">
                  {outcome.name} &middot; {outcome.email}
                </p>
                <p className="mt-0.5 text-green-700">
                  {outcome.eventTitle}
                  {outcome.at && ` · pukul ${outcome.at}`}
                </p>
              </div>
            </div>
          ) : (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-solid border-red-200 bg-red-50 px-4 py-3"
            >
              <XCircle size={20} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <div className="min-w-0 text-sm text-red-800">
                <p className="font-bold">Check-in gagal</p>
                <p className="mt-0.5">{outcome.message}</p>
                <p className="mt-0.5 break-all font-mono text-xs text-red-700">{outcome.ticketCode}</p>
              </div>
            </div>
          ))}
      </Card>

      {history.length > 0 && (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-display text-base font-bold text-text-primary">Riwayat Pemindaian Sesi Ini</h2>
          <ul className="flex flex-col divide-y divide-border-default">
            {history.map((entry, index) => (
              <li
                key={`${entry.ticketCode}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {entry.ok ? (
                    <CheckCircle2 size={15} className="shrink-0 text-green-700" aria-hidden="true" />
                  ) : (
                    <XCircle size={15} className="shrink-0 text-red-700" aria-hidden="true" />
                  )}
                  <span className="truncate text-text-primary">
                    {entry.ok ? entry.name : entry.message}
                  </span>
                </span>
                <code className="break-all font-mono text-xs text-text-muted">{entry.ticketCode}</code>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
