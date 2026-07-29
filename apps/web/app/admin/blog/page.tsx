"use client";

import { useEffect, useState } from "react";
import { Search, PenLine } from "lucide-react";
import { getToken } from "@/lib/auth/token";
import {
  Button,
  Input,
  Badge,
  type BadgeProps,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Pagination,
  FilterBar,
  TableActionButton,
  DashboardLoading,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  author: { name: string } | null;
  category: { name: string } | null;
  _count?: { comments: number };
};

const STATUS_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  draft:     { label: "Draft",   variant: "neutral" },
  published: { label: "Aktif",   variant: "success" },
  archived:  { label: "Arsip",   variant: "neutral" },
};


/**
 * `GET /api/admin/blog` answers `successResponse(posts, { total, page, limit })`:
 * `data` is a FLAT array and the page info lives in `meta`. Reading
 * `data.total` yielded undefined -> total 0 -> totalPages 0, so the header read
 * "0 artikel" and the pager never rendered — page 2 was unreachable. Same defect
 * as /admin/pengguna and /admin/transaksi; fixed together.
 */
type BlogListResponse = {
  success: boolean;
  data: BlogPost[];
  meta?: { total: number; page: number; limit: number };
};

const PAGE_SIZE = 10;

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  // Submit-time value, so typing does not refetch and the effect can depend on
  // it honestly instead of being silenced with an eslint-disable.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      ...(appliedSearch ? { search: appliedSearch } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });
    setLoading(true);
    fetch(`/api/admin/blog?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json() as Promise<BlogListResponse>)
      .then((body) => {
        // Guard against a slow response from an abandoned page overwriting a newer one.
        if (cancelled || !body.success) return;
        const list = Array.isArray(body.data) ? body.data : [];
        setPosts(list);
        setTotal(body.meta?.total ?? list.length);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, statusFilter, appliedSearch, reloadKey]);

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); setAppliedSearch(search); }

  async function updateStatus(id: string, status: string) {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/blog/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setReloadKey((k) => k + 1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="dash-container flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Manajemen Blog</h1>
          <p className="mt-1 text-sm text-text-secondary">Kelola konten dan artikel edukasi &middot; {total.toLocaleString("id-ID")} artikel</p>
        </div>
      </div>

      <FilterBar>
        <form onSubmit={handleSearch} className="flex min-w-[240px] flex-1 items-end gap-2">
          <Input
            placeholder="Cari artikel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            containerClassName="flex-1"
          />
          <Button type="submit" variant="cyan" size="sm">Cari</Button>
        </form>
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList>
            {["all", "published", "draft", "archived"].map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "all" ? "Semua" : STATUS_MAP[s]?.label ?? s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </FilterBar>

      {loading ? (
        <DashboardLoading />
      ) : posts.length === 0 ? (
        <EmptyState icon={PenLine} title="Tidak ada artikel ditemukan" />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Judul</TH><TH>Penulis</TH><TH>Kategori</TH><TH>Status</TH><TH>Dipublikasi</TH><TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {posts.map((p) => {
                const s = STATUS_MAP[p.status] ?? STATUS_MAP["draft"]!;
                return (
                  <TR key={p.id}>
                    <TD className="py-3">
                      <p className="max-w-[220px] text-sm font-semibold text-text-primary">{p.title}</p>
                      {p.excerpt && <p className="mt-0.5 text-xs text-text-muted">{p.excerpt.slice(0, 80)}…</p>}
                    </TD>
                    <TD className="py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm" name={p.author?.name ?? undefined} className="border-transparent bg-brand-gradient text-white" />
                        <span className="text-text-primary">{p.author?.name ?? "—"}</span>
                      </div>
                    </TD>
                    <TD className="py-3">
                      <Badge variant="info">{p.category?.name ?? "Umum"}</Badge>
                    </TD>
                    <TD className="py-3"><Badge variant={s.variant} dot>{s.label}</Badge></TD>
                    <TD className="py-3 text-xs text-text-secondary">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </TD>
                    <TD className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {p.status !== "published" && (
                          <TableActionButton variant="ok" onClick={() => updateStatus(p.id, "published")}>Publikasi</TableActionButton>
                        )}
                        {p.status === "published" && (
                          <TableActionButton variant="warn" onClick={() => updateStatus(p.id, "draft")}>Jadikan Draft</TableActionButton>
                        )}
                        {p.status !== "archived" && (
                          <TableActionButton variant="neutral" onClick={() => updateStatus(p.id, "archived")}>Arsip</TableActionButton>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableContainer>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
