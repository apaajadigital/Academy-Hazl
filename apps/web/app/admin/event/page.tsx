"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Ticket, Calendar, MapPin, Wallet, Users, Plus, ScanLine } from "lucide-react";
import { getEventStatusLabel, getEventTypeLabel } from "@/lib/event-labels";
import {
  deleteAdminEvent,
  listAdminEvents,
  updateAdminEventStatus,
  type EventRecord,
} from "@/lib/api/events";
import {
  Button,
  Input,
  Card,
  Badge,
  type BadgeProps,
  Tabs,
  TabsList,
  TabsTrigger,
  Pagination,
  FilterBar,
  TableActionButton,
  DashboardError,
  DashboardLoading,
  ProgressBar,
  Modal,
  ModalContent,
  PageHeader,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * E12: the row shape now comes from `lib/api/events` (`EventRecord`), which
 * mirrors `model Event` in apps/api/prisma/schema.prisma. The local copy this
 * replaces preserved BL-60b — capacity is `quota` (nullable) + `totalSold`, not
 * the invented `maxAttendees`/`registeredCount`, and there is no `organizer`
 * relation because the admin query runs without any `include`.
 */

// Presentation-only mapping; the label text itself comes from lib/event-labels.
// `ongoing`/`ended` are NOT filterable statuses (see STATUS_FILTERS) but stay in
// this map so a legacy row still carrying one renders with a sensible colour
// instead of falling back to the neutral badge.
const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  draft:     "neutral",
  published: "success",
  ongoing:   "info",
  ended:     "brand",
  cancelled: "danger",
};

/**
 * Filter tabs, restricted to the canonical Event.status enum
 * (draft|published|cancelled — see `eventSchema` in apps/api/src/routes/events.ts).
 * The `ongoing`/`ended` tabs this replaces could never match a row the API is
 * able to write, so they were controls that always returned an empty list.
 * Legacy rows carrying those values still render with a human label via
 * `getEventStatusLabel`; they are simply not offered as a filter.
 */
const STATUS_FILTERS = ["all", "published", "draft", "cancelled"] as const;

const LOGIN_REDIRECT = "/masuk?redirect=/admin/event";

const PAGE_SIZE = 10;


export default function AdminEventPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  // The SUBMITTED term, kept apart from the input value: typing must not
  // refetch, and every request has to be derivable from state alone (see the
  // effect below, which is the only caller of `loadEvents`).
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // A failed load is NOT an empty catalog — see `loadEvents`.
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped to request a refetch when no filter value actually changed
  // (retry button, post-mutation refresh, re-submitting the same query).
  const [reloadToken, setReloadToken] = useState(0);
  // BL-61: row actions report their own failures instead of silently no-op-ing.
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EventRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let redirecting = false;
    try {
      // BL-60d: the shared client refreshes an expired access token before the
      // call, so a long-lived admin session no longer 401s into a silently
      // empty list — and reports 401 when the session is really gone.
      const result = await listAdminEvents({
        page,
        limit: PAGE_SIZE,
        ...(submittedSearch ? { search: submittedSearch } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      if (!result.success) {
        // BL-60d: an expired/revoked session goes to /masuk.
        if (result.status === 401) { redirecting = true; router.replace(LOGIN_REDIRECT); return; }
        // Every OTHER failure (403 for a non-super_admin session, 5xx, network
        // timeout) used to fall through to an empty list, so the screen claimed
        // "Tidak ada event ditemukan" about a list it never managed to read.
        // Record the server's own wording and render an error state instead:
        // "we could not load this" is not the same fact as "there is nothing".
        setLoadError(result.error.message);
        setEvents([]);
        setTotal(0);
        return;
      }
      setEvents(result.data.events);
      // BL-60a: pagination totals travel in the envelope's `meta`, not `data` —
      // reading `data.total` always yielded 0, so <Pagination> never rendered.
      // `listAdminEvents` folds `meta` into `data.total` for exactly this reason.
      setTotal(result.data.total);
    } finally {
      // Hold the spinner while navigating so a 401 never flashes an empty list.
      if (!redirecting) setLoading(false);
    }
  }, [page, statusFilter, submittedSearch, router]);

  // Single owner of the request: any change of page/filter — and any explicit
  // refresh — flows through here, so two fetches can never be in flight with
  // different ideas of which page is current.
  useEffect(() => { void loadEvents(); }, [loadEvents, reloadToken]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // State only. Calling loadEvents() directly here raced the `setPage(1)`
    // re-render: the direct call captured the STALE page (e.g. 3) while the
    // effect fetched page 1, and whichever response landed last won — the list
    // could show page 3 while <Pagination> highlighted page 1. React batches
    // these three updates, so exactly one request is issued.
    setPage(1);
    setSubmittedSearch(search);
    refresh();
  }

  async function updateStatus(id: string, status: string) {
    setActionError(null);
    const result = await updateAdminEventStatus(id, status);
    if (!result.success) {
      if (result.status === 401) { router.replace(LOGIN_REDIRECT); return; }
      // BL-61: a rejected transition used to be swallowed, so the button looked
      // broken. Surface the server's own wording instead.
      setActionError(result.error.message);
      return;
    }
    refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAdminEvent(pendingDelete.id);
    setDeleting(false);

    if (result.success) {
      setPendingDelete(null);
      refresh();
      return;
    }
    if (result.status === 401) { router.replace(LOGIN_REDIRECT); return; }
    // BL-62b: a 409 explains that paid registrations exist and that the event
    // should be cancelled instead. Render it verbatim — never a generic "gagal".
    setDeleteError(result.error.message);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  // `total` is the count AFTER filtering, so it only describes the catalog when
  // no filter is applied — labelling a filtered count "event total" misreports
  // the catalog size the moment someone searches.
  const isFiltered = submittedSearch !== "" || statusFilter !== "all";

  return (
    <div className="dash-container flex flex-col gap-6">
      <PageHeader
        breadcrumb={<span className="flex items-center gap-2"><span className="text-text-secondary">Admin</span> <span>/</span> <span className="font-medium text-text-primary">Event</span></span>}
        title="Manajemen Event"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/event/check-in")}
              leftIcon={<ScanLine size={16} aria-hidden="true" />}
            >
              Check-in Peserta
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/admin/event/baru")}
              leftIcon={<Plus size={16} aria-hidden="true" />}
            >
              Buat Event
            </Button>
          </div>
        }
      />

      {actionError && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-solid border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <FilterBar>
        <form onSubmit={handleSearch} className="flex min-w-[240px] flex-1 items-end gap-2">
          <Input
            placeholder="Cari event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            containerClassName="flex-1"
          />
          <Button type="submit" variant="cyan" size="sm">Cari</Button>
        </form>
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList className="flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "all" ? "Semua" : getEventStatusLabel(s)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </FilterBar>

      {loading ? (
        <DashboardLoading />
      ) : loadError ? (
        // Anti-fake-data rule: a 403/500/timeout is reported as a failure with a
        // retry, never as "Tidak ada event ditemukan".
        <DashboardError message={loadError} onRetry={refresh} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={isFiltered ? "Tidak ada event yang cocok" : "Belum ada event"}
          description={
            isFiltered
              ? "Coba ubah kata kunci atau pilih status lain."
              : "Event yang Anda buat akan muncul di sini."
          }
        />
      ) : (
        <div className="dash-grid">
          {events.map((ev) => {
            // BL-60b: `quota` is nullable (unlimited seats) — guard so the rate
            // is `null` rather than NaN/Infinity for events without a quota.
            const regRate = ev.quota ? Math.round((ev.totalSold / ev.quota) * 100) : null;
            return (
              <Card key={ev.id} hoverable className="col-span-12 flex flex-col p-6 md:col-span-6 xl:col-span-4">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="info" className="mb-2">{getEventTypeLabel(ev.type)}</Badge>
                    <p className="text-sm font-bold leading-tight text-text-primary">{ev.title}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[ev.status] ?? "neutral"} className="shrink-0">
                    {getEventStatusLabel(ev.status)}
                  </Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(ev.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {ev.location}</span>}
                  <span className="inline-flex items-center gap-1"><Wallet size={13} /> {Number(ev.price) === 0 ? "Gratis" : `Rp ${Number(ev.price).toLocaleString("id-ID")}`}</span>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Users size={13} />{" "}
                    {ev.quota !== null
                      ? `${ev.totalSold}/${ev.quota} peserta`
                      : `${ev.totalSold} peserta · kuota tanpa batas`}
                  </span>
                  {regRate !== null && (
                    <span className={`text-xs font-bold ${regRate >= 90 ? "text-red-600" : "text-accent-cyan-strong"}`}>{regRate}%</span>
                  )}
                </div>
                {regRate !== null && (
                  <ProgressBar
                    className="mb-4 h-1"
                    value={Math.min(100, regRate)}
                    gradient
                    label={`Pendaftaran ${ev.title}`}
                  />
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  {/* BL-61: Ubah / Peserta / Hapus reach PATCH, the registrations
                      list, and DELETE respectively. The former "Mulai"/"Selesai"
                      buttons wrote `ongoing`/`ended`, which every event endpoint
                      rejects with 400 (the enum is draft|published|cancelled), so
                      they were dead controls and are gone. Legacy rows already
                      carrying those values still list and filter normally. */}
                  <TableActionButton href={`/admin/event/${ev.id}`}>Ubah</TableActionButton>
                  <TableActionButton href={`/admin/event/${ev.id}/peserta`}>Peserta</TableActionButton>
                  {ev.status !== "published" && (
                    <TableActionButton variant="ok" onClick={() => updateStatus(ev.id, "published")}>
                      {ev.status === "cancelled" ? "Aktifkan Lagi" : "Publikasi"}
                    </TableActionButton>
                  )}
                  {ev.status !== "cancelled" && (
                    <TableActionButton variant="danger" onClick={() => updateStatus(ev.id, "cancelled")}>Batalkan</TableActionButton>
                  )}
                  <TableActionButton
                    variant="danger"
                    onClick={() => { setPendingDelete(ev); setDeleteError(null); }}
                  >
                    Hapus
                  </TableActionButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loadError && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) { setPendingDelete(null); setDeleteError(null); } }}
      >
        <ModalContent
          title="Hapus Event"
          description={pendingDelete ? `"${pendingDelete.title}" akan dihapus permanen.` : undefined}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>Batal</Button>
              <Button variant="cyan" size="sm" onClick={() => void confirmDelete()} loading={deleting} className="bg-red-600 text-white hover:bg-red-700">Hapus</Button>
            </>
          }
        >
          {deleteError ? (
            // BL-62b: the 409 body names the registration count and tells the
            // admin to cancel instead — show it in full, not as "gagal".
            <div role="alert" className="rounded-[var(--radius-md)] border border-solid border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
              {deleteError}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Event yang sudah memiliki registrasi berbayar tidak dapat dihapus. Untuk kasus itu,
              batalkan event dengan mengubah statusnya menjadi &ldquo;Dibatalkan&rdquo;.
            </p>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
