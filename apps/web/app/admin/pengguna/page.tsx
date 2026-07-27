"use client";

import { useEffect, useState } from "react";
import { Search, Download, Users, Loader2 } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Input,
  Pagination,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Tabs,
  TabsList,
  TabsTrigger,
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


const ROLES_COLOR: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  affiliate: "bg-blue-100 text-blue-700",
  trainer: "bg-orange-100 text-orange-700",
  student: "bg-green-100 text-green-700",
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
    <div className="flex max-w-[1200px] flex-col gap-5">
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
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border-default bg-surface-card p-4 shadow-e1 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearch} className="flex w-full items-end gap-2 lg:max-w-sm">
          <Input
            containerClassName="flex-1"
            leftIcon={<Search size={16} aria-hidden="true" />}
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari pengguna"
          />
          <Button type="submit" variant="cyan" size="sm" className="bg-accent-cyan-strong text-white hover:bg-accent-cyan-strong">Cari</Button>
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center rounded-[var(--radius-lg)] border border-border-default bg-surface-card py-16 shadow-e1">
          <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Tidak ada pengguna ditemukan" description="Coba ubah kata kunci pencarian atau filter role." />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-default bg-surface-card shadow-e1">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Pengguna</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Provider</TH>
                  <TH>Kursus</TH>
                  <TH>Bergabung</TH>
                  <TH>Aksi</TH>
                </tr>
              </THead>
              <TBody>
                {users.map((user) => {
                  const roleNames = user.roles?.map((r) => r.role) ?? [];
                  return (
                    <TR key={user.id}>
                      <TD>
                        <div className="flex items-center gap-2.5">
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
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
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
                        <button
                          onClick={() => toggleVerify(user.id, user.isVerified)}
                          title={user.isVerified ? "Cabut verifikasi" : "Verifikasi email"}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                            user.isVerified
                              ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                              : "bg-green-600/10 text-green-700 hover:bg-green-600/20",
                          )}
                        >
                          {user.isVerified ? "Cabut" : "Verifikasi"}
                        </button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default bg-surface-sunken px-6 py-4">
              <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
              <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
