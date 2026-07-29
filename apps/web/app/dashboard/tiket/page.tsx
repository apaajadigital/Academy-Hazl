"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Ticket, CalendarDays, MapPin, Globe, Clock, CheckCircle2, XCircle, PartyPopper, Info, Check,
} from "lucide-react";
import { Badge, DashboardLoading, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getEventTypeLabel } from "@/lib/event-labels";
import { listMyTickets, type EventTicket } from "@/lib/api/events";

// E12: the ticket + embedded-event shapes and the endpoint call now come from
// `lib/api/events`, which also owns the base-URL choice (relative `/api/*` in
// the browser → Next.js proxy → backend).

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_META: Record<string, { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral"; Icon: LucideIcon }> = {
  pending:   { label: "Menunggu",      variant: "warning", Icon: Clock },
  confirmed: { label: "Terkonfirmasi", variant: "success", Icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan",    variant: "danger",  Icon: XCircle },
  attended:  { label: "Hadir",         variant: "info",    Icon: PartyPopper },
};

const LOGIN_REDIRECT = "/masuk?redirect=/dashboard/tiket";

export default function TiketPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guards against setting state after the effect is torn down (StrictMode / fast nav).
    let active = true;

    async function loadTickets() {
      // BL-60d: the shared client refreshes an expired access token first, so a
      // long-lived session no longer 401s into a silently empty ticket list.
      const result = await listMyTickets();
      if (!active) return;

      let redirecting = false;
      if (result.success) {
        setTickets(result.data);
      } else if (result.status === 401) {
        // BL-60d: an expired/revoked session must send the user to login rather
        // than render "Belum ada tiket" over data that actually exists.
        redirecting = true;
        router.replace(LOGIN_REDIRECT);
      }
      // Any other failure (e.g. network) falls through to the empty state.

      // Hold the spinner while navigating so a 401 never flashes "no tickets".
      if (!redirecting) setLoading(false);
    }

    void loadTickets();
    return () => { active = false; };
  }, [router]);

  if (loading) {
    return <DashboardLoading label="Memuat tiket…" />;
  }

  return (
    <div className="dash-container flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Tiket Event Saya</h1>
          <p className="mt-1 text-sm text-text-secondary">{tickets.length} tiket terdaftar</p>
        </div>
        <Link href="/event" className="btn btn-primary btn-sm">
          <CalendarDays size={16} aria-hidden="true" /> Jelajahi Event
        </Link>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Belum ada tiket"
          description="Daftar event untuk mendapatkan tiket pertama Anda."
          action={<Link href="/event" className="btn btn-primary btn-sm">Lihat Event Tersedia</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const meta = STATUS_META[ticket.status] ?? { label: ticket.status, variant: "neutral" as const, Icon: Info };
            const StatusIcon = meta.Icon;
            const isOnline = ticket.event.type === "online";
            const isDone = ticket.status === "confirmed" || ticket.status === "attended";

            return (
              <div
                key={ticket.id}
                className="flex items-stretch overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1 transition-all hover:-translate-y-0.5 hover:shadow-e2"
              >
                {/* Left accent */}
                <div className={cn("w-1.5 flex-shrink-0", isDone ? "bg-green-500" : "bg-accent-cyan-strong")} />

                {/* Cover */}
                <div className="m-4 flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-surface-accent-soft text-accent-cyan-strong max-[640px]:hidden">
                  {ticket.event.coverUrl ? (
                    <Image src={ticket.event.coverUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
                  ) : isOnline ? (
                    <Globe size={28} aria-hidden="true" />
                  ) : (
                    <MapPin size={28} aria-hidden="true" />
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between gap-3 py-4 pr-4 max-[640px]:pl-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/event/${ticket.event.slug}`} className="block text-sm font-bold text-text-primary transition-colors hover:text-accent-cyan-strong">
                        {ticket.event.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <Badge variant="neutral">{getEventTypeLabel(ticket.event.type)}</Badge>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={13} aria-hidden="true" /> {formatDate(ticket.event.startDate)}
                        </span>
                      </div>
                      {!isOnline && ticket.event.venue && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-muted">
                          <MapPin size={12} aria-hidden="true" /> {ticket.event.venue}
                        </p>
                      )}
                    </div>
                    <Badge variant={meta.variant}>
                      <StatusIcon size={13} aria-hidden="true" /> {meta.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Kode Tiket</span>
                      <code className="font-mono text-[13px] font-extrabold tracking-wider text-text-primary">{ticket.ticketCode.slice(0, 8).toUpperCase()}</code>
                    </div>
                    {ticket.attendedAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-cyan-strong">
                        <Check size={13} aria-hidden="true" /> Hadir: {formatDate(ticket.attendedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
