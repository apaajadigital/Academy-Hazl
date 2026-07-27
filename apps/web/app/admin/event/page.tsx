"use client";

import { useEffect, useState } from "react";
import { Search, Ticket, Calendar, MapPin, Wallet, Users } from "lucide-react";
import { getToken } from "@/lib/auth/token";
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
  DashboardLoading,
  ProgressBar,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

type Event = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  location: string | null;
  price: string;
  maxAttendees: number | null;
  registeredCount: number;
  createdAt: string;
  organizer: { name: string } | null;
};

const STATUS_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  draft:     { label: "Draft",        variant: "neutral" },
  published: { label: "Aktif",        variant: "success" },
  ongoing:   { label: "Berlangsung",  variant: "info" },
  ended:     { label: "Selesai",      variant: "brand" },
  cancelled: { label: "Dibatalkan",   variant: "danger" },
};

const TYPE_LABEL: Record<string, string> = {
  seminar: "🎤 Seminar", webinar: "💻 Webinar", workshop: "🔧 Workshop", bootcamp: "⚡ Bootcamp",
};


export default function AdminEventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  function loadEvents() {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });
    setLoading(true);
    fetch(`/api/admin/events?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) { setEvents(body.data?.events ?? body.data ?? []); setTotal(body.data?.total ?? 0); }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadEvents(); }, [page, statusFilter]); // eslint-disable-line
  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); loadEvents(); }

  async function updateStatus(id: string, status: string) {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadEvents();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="dash-container flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Manajemen Event</h1>
          <p className="mt-1 text-sm text-text-secondary">Kelola jadwal pelatihan, webinar, dan workshop &middot; {total.toLocaleString("id-ID")} event total</p>
        </div>
      </div>

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
            {["all", "published", "ongoing", "ended", "draft", "cancelled"].map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "all" ? "Semua" : STATUS_MAP[s]?.label ?? s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </FilterBar>

      {loading ? (
        <DashboardLoading />
      ) : events.length === 0 ? (
        <EmptyState icon={Ticket} title="Tidak ada event ditemukan" />
      ) : (
        <div className="dash-grid">
          {events.map((ev) => {
            const s = STATUS_MAP[ev.status] ?? STATUS_MAP["draft"]!;
            const regRate = ev.maxAttendees ? Math.round((ev.registeredCount / ev.maxAttendees) * 100) : null;
            return (
              <Card key={ev.id} hoverable className="col-span-12 flex flex-col p-6 md:col-span-6 xl:col-span-4">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="info" className="mb-2">{TYPE_LABEL[ev.type] ?? ev.type}</Badge>
                    <p className="text-sm font-bold leading-tight text-text-primary">{ev.title}</p>
                    {ev.organizer && <p className="mt-0.5 text-xs text-text-muted">oleh {ev.organizer.name}</p>}
                  </div>
                  <Badge variant={s.variant} className="shrink-0">{s.label}</Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(ev.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {ev.location}</span>}
                  <span className="inline-flex items-center gap-1"><Wallet size={13} /> {Number(ev.price) === 0 ? "Gratis" : `Rp ${Number(ev.price).toLocaleString("id-ID")}`}</span>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Users size={13} /> {ev.registeredCount}{ev.maxAttendees ? `/${ev.maxAttendees}` : ""} peserta
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
                  {ev.status === "draft" && (
                    <TableActionButton variant="ok" onClick={() => updateStatus(ev.id, "published")}>Publikasi</TableActionButton>
                  )}
                  {ev.status === "published" && (
                    <>
                      <TableActionButton variant="neutral" className="bg-blue-500/10 text-blue-700 hover:bg-blue-600 hover:text-white" onClick={() => updateStatus(ev.id, "ongoing")}>Mulai</TableActionButton>
                      <TableActionButton variant="danger" onClick={() => updateStatus(ev.id, "cancelled")}>Batalkan</TableActionButton>
                    </>
                  )}
                  {ev.status === "ongoing" && (
                    <TableActionButton variant="neutral" className="bg-accent-purple/10 text-accent-purple hover:bg-accent-purple hover:text-white" onClick={() => updateStatus(ev.id, "ended")}>Selesai</TableActionButton>
                  )}
                  {ev.status === "cancelled" && (
                    <TableActionButton variant="ok" onClick={() => updateStatus(ev.id, "published")}>Aktifkan Lagi</TableActionButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
