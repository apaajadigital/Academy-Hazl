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


// Lumina role chips — tinted, uppercase micro-label per role.
const ROLES_COLOR: Record<string, string> = {
  super_admin: "bg-slate-100 text-slate-600",
  affiliate: "bg-emerald-50 text-emerald-700",
  trainer: "bg-indigo-50 text-indigo-700",
  student: "bg-teal-50 text-teal-700",
};

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRole, setSelectedRole] = useState("all");
  const [exporting, setExporting] = useState(false);
  const limit = 10;

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

  function loadUsers() {
    const token = getToken();
    if (!token) return;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
      ...(selectedRole !== "all" ? { role: selectedRole } : {}),
    });

    setLoading(true);
    fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setUsers(body.data?.users ?? body.data ?? []);
          setTotal(body.data?.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, [page, selectedRole]); // eslint-disable-line

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  function toggleVerify(userId: string, current: boolean) {
    const token = getToken();
    if (!token) return;
    fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !current }),
    }).then(() => loadUsers());
  }

  const totalPages = Math.ceil(total / limit);

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
