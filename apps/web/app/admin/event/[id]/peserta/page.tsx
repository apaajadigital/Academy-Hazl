"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ChevronLeft, Clock, PartyPopper, ScanLine, Users, XCircle } from "lucide-react";
import {
  Badge,
  type BadgeProps,
  DashboardError,
  DashboardLoading,
  EmptyState,
  PageHeader,
  Table,
  TableActionButton,
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import {
  checkInEventTicket,
  getAdminEventById,
  listAdminEventRegistrations,
  type AdminEventRegistration,
} from "@/lib/api/events";

/**
 * Attendee list for one event (BL-61) — `GET /api/events/admin/:id/registrations`,
 * with the same `POST /api/events/admin/checkin` the door screen uses.
 *
 * The row-level check-in button is rendered only for a registration the endpoint
 * would actually accept (confirmed and not yet scanned); for every other state
 * the stored outcome is shown instead of a button that is guaranteed to 400.
 */

/** `EventRegistration.status` — pending | confirmed | cancelled | attended
 *  (apps/api/prisma/schema.prisma). Mirrors dashboard/tiket so one registration
 *  reads the same on both sides of the counter. */
const REG_STATUS_META: Record<string, { label: string; variant: BadgeProps["variant"]; Icon: LucideIcon }> = {
  pending: { label: "Menunggu", variant: "warning", Icon: Clock },
  confirmed: { label: "Terkonfirmasi", variant: "success", Icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", variant: "danger", Icon: XCircle },
  attended: { label: "Hadir", variant: "info", Icon: PartyPopper },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEventRegistrationsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [registrations, setRegistrations] = useState<AdminEventRegistration[]>([]);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loginRedirect = `/masuk?redirect=/admin/event/${eventId}/peserta`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    // The title lookup is a nicety, so it runs alongside the list and its
    // failure is swallowed — a missing heading must not hide the attendees.
    const [listResult, eventResult] = await Promise.all([
      listAdminEventRegistrations(eventId),
      getAdminEventById(eventId),
    ]);

    if (!listResult.success) {
      // BL-60d: an expired session goes to /masuk, not to an empty table.
      if (listResult.status === 401) {
        router.replace(loginRedirect);
        return;
      }
      setLoadError(listResult.error.message);
      setLoading(false);
      return;
    }

    setRegistrations(listResult.data);
    setEventTitle(eventResult.success ? eventResult.data.title : null);
    setLoading(false);
  }, [eventId, loginRedirect, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCheckIn(registration: AdminEventRegistration) {
    setCheckingIn(registration.id);
    setActionMessage(null);
    const result = await checkInEventTicket(registration.ticketCode);
    setCheckingIn(null);

    if (result.success) {
      setActionMessage({ ok: true, text: `${registration.user.name} berhasil di-check-in.` });
      void load();
      return;
    }
    if (result.status === 401) {
      router.replace(loginRedirect);
      return;
    }
    // 404 "Tiket tidak ditemukan." / 400 "Tiket sudah pernah di-scan." /
    // 400 "Tiket belum confirmed." — all shown as the API worded them.
    setActionMessage({ ok: false, text: result.error.message });
  }

  const attended = registrations.filter((r) => r.attendedAt !== null).length;

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
        title="Peserta Event"
        subtitle={
          loading
            ? undefined
            : `${eventTitle ? `${eventTitle} · ` : ""}${registrations.length.toLocaleString("id-ID")} pendaftar · ${attended.toLocaleString("id-ID")} hadir`
        }
        actions={
          <TableActionButton href="/admin/event/check-in" leftIcon={<ScanLine size={14} aria-hidden="true" />}>
            Buka Check-in
          </TableActionButton>
        }
      />

      {actionMessage && (
        <div
          role="status"
          className={
            actionMessage.ok
              ? "rounded-[var(--radius-md)] border border-solid border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              : "rounded-[var(--radius-md)] border border-solid border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {actionMessage.text}
        </div>
      )}

      {loading ? (
        <DashboardLoading />
      ) : loadError ? (
        <DashboardError message={loadError} onRetry={() => void load()} />
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada pendaftar"
          description="Peserta akan muncul di sini setelah mendaftar pada event ini."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Peserta</TH>
                <TH>Kode Tiket</TH>
                <TH>Status</TH>
                <TH>Waktu Daftar</TH>
                <TH>Kehadiran</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {registrations.map((reg) => {
                const meta = REG_STATUS_META[reg.status];
                const canCheckIn = reg.status === "confirmed" && reg.attendedAt === null;
                return (
                  <TR key={reg.id}>
                    <TD className="py-4">
                      <p className="text-sm font-semibold text-text-primary">{reg.user.name}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{reg.user.email}</p>
                    </TD>
                    <TD className="py-4">
                      <code className="font-mono text-[13px] font-bold tracking-wider text-text-primary">
                        {reg.ticketCode}
                      </code>
                    </TD>
                    <TD className="py-4">
                      <Badge variant={meta?.variant ?? "neutral"}>
                        {meta ? (
                          <>
                            <meta.Icon size={13} aria-hidden="true" /> {meta.label}
                          </>
                        ) : (
                          reg.status
                        )}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap py-4 text-sm text-text-secondary">
                      {formatDateTime(reg.createdAt)}
                    </TD>
                    <TD className="whitespace-nowrap py-4 text-sm text-text-secondary">
                      {reg.attendedAt ? formatDateTime(reg.attendedAt) : "—"}
                    </TD>
                    <TD className="py-4 text-right">
                      {canCheckIn ? (
                        <TableActionButton
                          variant="ok"
                          disabled={checkingIn === reg.id}
                          onClick={() => void handleCheckIn(reg)}
                          className="whitespace-nowrap"
                        >
                          {checkingIn === reg.id ? "Memproses…" : "Check-in"}
                        </TableActionButton>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
