"use client";

import { useEffect, useState } from "react";
import { Search, Download, Users } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Input,
  Pagination,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Tabs,
  TabsList,
  TabsTrigger,
  FilterBar,
  TableActionButton,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth/token";

type User = {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  provider: string;
  createdAt: string;
  // GET /api/admin/users returns roles as { role: string }, not a nested object.
  roles: { role: string }[];
  _count?: { enrollments: number };
};

/**
 * Envelope of GET /api/admin/users (api/src/modules/admin/users.ts): `data` is a
 * FLAT array and the page info lives in `meta` (PaginationMeta). Reading
 * `data.total` — as this page used to — yields `undefined`, so the header showed
 * "0 pengguna terdaftar" and `totalPages` collapsed to 0, hiding the pagination
 * block entirely and stranding every admin on the 10 most recent users.
 */
type UserListResponse =
  | { success: true; data: User[]; meta?: { total: number; page: number; limit: number } }
  | { success: false; error?: { message?: string } };


// Lumina role chips — tinted, uppercase micro-label per role.
const ROLES_COLOR: Record<string, string> = {
  super_admin: "bg-slate-100 text-slate-600",
  affiliate: "bg-emerald-50 text-emerald-700",
  trainer: "bg-indigo-50 text-indigo-700",
  student: "bg-teal-50 text-teal-700",
};

const PAGE_SIZE = 10;

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // `search` is the input value; `appliedSearch` is what the last submit asked
  // for. Only the latter drives the fetch, so typing does not refetch per keystroke.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRole, setSelectedRole] = useState("all");
  const [exporting, setExporting] = useState(false);
  // Bumped to force a refetch when the query itself did not change (re-submitting
  // the same search, or reloading after a verify toggle).
  const [reloadKey, setReloadKey] = useState(0);

  async function handleExportCSV() {
    const token = getToken();
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch("/api/admin/users/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengunduh CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Gagal mengekspor data pengguna.");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    // `cancelled` makes the LAST requested page win: clicking next/prev quickly
    // fires overlapping requests, and without this an older, slower response
    // could overwrite the newer page's rows. Same guard as trainer-hub/payout.
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(appliedSearch ? { search: appliedSearch } : {}),
      ...(selectedRole !== "all" ? { role: selectedRole } : {}),
    });

    setLoading(true);
    setError("");
    (async () => {
      try {
        const r = await fetch(`/api/admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = (await r.json()) as UserListResponse;
        if (cancelled) return;
        if (d.success) {
          setUsers(d.data);
          // Older API builds sent no `meta`; fall back to the row count so the
          // header never shows a total smaller than what is on screen.
          setTotal(d.meta?.total ?? d.data.length);
        } else {
          setError(d.error?.message ?? "Gagal memuat daftar pengguna.");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat daftar pengguna.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, selectedRole, appliedSearch, reloadKey]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
    // Re-submitting the same term leaves both deps unchanged, so nudge the key.
    setReloadKey((k) => k + 1);
  }

  function toggleVerify(userId: string, current: boolean) {
    const token = getToken();
    if (!token) return;
    fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !current }),
    }).then(() => setReloadKey((k) => k + 1));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Manajemen Pengguna</h1>
          <p className="mt-1 text-sm text-text-secondary">{total.toLocaleString("id-ID")} pengguna terdaftar</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
          leftIcon={<Download size={16} aria-hidden="true" />}
        >
          {exporting ? "Mengekspor..." : "Ekspor CSV"}
        </Button>
      </div>

      {/* Filters */}
      <FilterBar>
        <form onSubmit={handleSearch} className="flex min-w-[240px] flex-1 items-end gap-2">
          <Input
            containerClassName="flex-1"
            leftIcon={<Search size={16} aria-hidden="true" />}
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari pengguna"
          />
          <Button type="submit" variant="cyan" size="sm">Cari</Button>
        </form>
        <Tabs value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setPage(1); }}>
          <TabsList className="flex-wrap">
            {["all", "student", "trainer", "affiliate", "super_admin"].map((role) => (
              <TabsTrigger key={role} value={role} className="capitalize">
                {role === "all" ? "Semua" : role.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </FilterBar>

      {/* Table */}
      {loading ? (
        <DashboardLoading />
      ) : error ? (
        // Without this a failed request rendered the empty state, which reads as
        // "there are no users" — a very different claim from "we could not load".
        <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Tidak ada pengguna ditemukan" description="Coba ubah kata kunci pencarian atau filter role." />
      ) : (
        <TableContainer>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Pengguna</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Provider</TH>
                  <TH>Kursus</TH>
                  <TH>Bergabung</TH>
                  <TH>Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {users.map((user) => {
                  const roleNames = user.roles?.map((r) => r.role) ?? [];
                  return (
                    <TR key={user.id}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <Avatar name={user.name} size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary">{user.name}</p>
                            <p className="text-xs text-text-secondary">{user.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          {roleNames.map((r) => (
                            <span
                              key={r}
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                ROLES_COLOR[r] ?? "bg-gray-100 text-gray-600",
                              )}
                            >
                              {r.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </TD>
                      <TD>
                        <Badge variant={user.isVerified ? "success" : "warning"} dot>
                          {user.isVerified ? "Terverifikasi" : "Belum"}
                        </Badge>
                      </TD>
                      <TD>
                        <span className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-text-secondary">
                          {user.provider ?? "email"}
                        </span>
                      </TD>
                      <TD>
                        <span className="font-bold text-accent-cyan-strong">{user._count?.enrollments ?? 0}</span>
                      </TD>
                      <TD className="whitespace-nowrap text-text-secondary">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </TD>
                      <TD>
                        <TableActionButton
                          variant={user.isVerified ? "warn" : "ok"}
                          onClick={() => toggleVerify(user.id, user.isVerified)}
                          title={user.isVerified ? "Cabut verifikasi" : "Verifikasi email"}
                          aria-label={user.isVerified ? "Cabut verifikasi" : "Verifikasi email"}
                        >
                          {user.isVerified ? "Cabut" : "Verifikasi"}
                        </TableActionButton>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
              <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
              <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
          )}
        </TableContainer>
      )}
    </div>
  );
}
