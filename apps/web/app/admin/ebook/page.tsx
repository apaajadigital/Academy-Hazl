"use client";

import { useEffect, useState } from "react";
import { Search, Plus, BookMarked } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  ModalContent,
  Pagination,
  FilterBar,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableActionButton,
  DashboardLoading,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { getValidToken } from "@/lib/auth/token";

type EBook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  fileUrl: string;
  coverUrl: string | null;
  author: string | null;
  pages: number | null;
  category: string | null;
  status: string;
  createdAt: string;
};

export default function AdminEbookPage() {
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [formSalePrice, setFormSalePrice] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formPages, setFormPages] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStatus, setFormStatus] = useState("draft");

  const [saving, setSaving] = useState(false);

  async function loadEbooks() {
    const token = await getValidToken();
    if (!token) return;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });

    setLoading(true);
    fetch(`/api/admin/ebooks?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setEbooks(body.data ?? []);
          setTotal(body.meta?.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEbooks();
  }, [page, statusFilter]); // eslint-disable-line

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadEbooks();
  }

  function handleOpenCreate() {
    setModalMode("create");
    setEditingId(null);
    setFormSlug("");
    setFormTitle("");
    setFormDesc("");
    setFormPrice(0);
    setFormSalePrice("");
    setFormFileUrl("");
    setFormCoverUrl("");
    setFormAuthor("");
    setFormPages("");
    setFormCategory("");
    setFormStatus("draft");
    setShowModal(true);
  }

  function handleOpenEdit(ebook: EBook) {
    setModalMode("edit");
    setEditingId(ebook.id);
    setFormSlug(ebook.slug);
    setFormTitle(ebook.title);
    setFormDesc(ebook.description ?? "");
    setFormPrice(Number(ebook.price));
    setFormSalePrice(ebook.salePrice !== null ? String(ebook.salePrice) : "");
    setFormFileUrl(ebook.fileUrl);
    setFormCoverUrl(ebook.coverUrl ?? "");
    setFormAuthor(ebook.author ?? "");
    setFormPages(ebook.pages !== null ? String(ebook.pages) : "");
    setFormCategory(ebook.category ?? "");
    setFormStatus(ebook.status);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formSlug || !formTitle || !formFileUrl) {
      alert("Slug, Judul, dan URL File PDF wajib diisi.");
      return;
    }

    const token = await getValidToken();
    if (!token) return;

    setSaving(true);
    const url = modalMode === "create" ? "/api/admin/ebooks" : `/api/admin/ebooks/${editingId}`;
    const method = modalMode === "create" ? "POST" : "PATCH";

    const payload = {
      slug: formSlug,
      title: formTitle,
      description: formDesc || null,
      price: Number(formPrice),
      salePrice: formSalePrice ? Number(formSalePrice) : null,
      fileUrl: formFileUrl,
      coverUrl: formCoverUrl || null,
      author: formAuthor || null,
      pages: formPages ? Number(formPages) : null,
      category: formCategory || null,
      status: formStatus,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (body.success) {
        setShowModal(false);
        loadEbooks();
      } else {
        alert(body.error?.message ?? "Gagal menyimpan E-Book.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus E-Book "${title}"?`)) return;

    const token = await getValidToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/ebooks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (body.success) {
        loadEbooks();
      } else {
        alert(body.error?.message ?? "Gagal menghapus E-Book.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Manajemen E-Book</h1>
          <p className="mt-1 text-sm text-text-secondary">{total.toLocaleString("id-ID")} e-book terdaftar</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus size={16} aria-hidden="true" />}>
          Tambah E-Book
        </Button>
      </div>

      {/* Filters */}
      <FilterBar
        search={
          <form onSubmit={handleSearch} className="flex w-full items-end gap-2">
            <Input
              containerClassName="flex-1"
              leftIcon={<Search size={16} aria-hidden="true" />}
              placeholder="Cari judul atau penulis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari e-book"
            />
            <Button type="submit" variant="cyan" size="sm" className="bg-accent-cyan-strong text-white hover:bg-accent-cyan-strong">Cari</Button>
          </form>
        }
        filters={
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <TabsList className="flex-wrap">
              {["all", "published", "draft"].map((st) => (
                <TabsTrigger key={st} value={st}>
                  {st === "all" ? "Semua" : st === "published" ? "Aktif" : "Draft"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* Table */}
      {loading ? (
        <DashboardLoading />
      ) : ebooks.length === 0 ? (
        <EmptyState icon={BookMarked} title="Tidak ada e-book ditemukan" description="Mulai dengan menambahkan e-book baru." />
      ) : (
        <TableContainer>
          <Table className="min-w-[800px]">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Judul E-Book</TH>
                  <TH>Kategori</TH>
                  <TH>Penulis</TH>
                  <TH>Halaman</TH>
                  <TH>Harga</TH>
                  <TH>Status</TH>
                  <TH>Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {ebooks.map((ebook) => (
                  <TR key={ebook.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-14 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-surface-sunken text-[10px] font-bold text-text-secondary">
                          {ebook.coverUrl ? (
                            <img src={ebook.coverUrl} alt={ebook.title} className="h-full w-full object-cover" />
                          ) : (
                            "PDF"
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary">{ebook.title}</p>
                          <p className="text-xs text-text-muted">slug: {ebook.slug}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      {ebook.category ? (
                        <span className="text-sm font-semibold text-accent-cyan-strong">{ebook.category}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </TD>
                    <TD className="text-text-secondary">{ebook.author ?? "—"}</TD>
                    <TD className="text-text-secondary">{ebook.pages ?? "—"}</TD>
                    <TD>
                      <p className="font-bold text-text-primary">Rp {Number(ebook.price).toLocaleString("id-ID")}</p>
                      {ebook.salePrice !== null && (
                        <p className="text-xs font-semibold text-green-700">Sale: Rp {Number(ebook.salePrice).toLocaleString("id-ID")}</p>
                      )}
                    </TD>
                    <TD>
                      <Badge variant={ebook.status === "published" ? "success" : "neutral"} dot>
                        {ebook.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <TableActionButton
                          variant="neutral"
                          onClick={() => handleOpenEdit(ebook)}
                          className="bg-surface-accent-soft text-accent-cyan-strong hover:bg-accent-cyan-strong hover:text-white"
                        >
                          Edit
                        </TableActionButton>
                        <TableActionButton
                          variant="danger"
                          onClick={() => handleDelete(ebook.id, ebook.title)}
                        >
                          Hapus
                        </TableActionButton>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default bg-surface-sunken px-6 py-4">
              <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
              <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
          )}
        </TableContainer>
      )}

      {/* CRUD Modal */}
      <Modal open={showModal} onOpenChange={(o) => { if (!o) setShowModal(false); }}>
        <ModalContent title={modalMode === "create" ? "Tambah E-Book Baru" : "Edit E-Book"} className="max-w-2xl">
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Judul E-Book"
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Contoh: Belajar Python Praktis"
              />
              <Input
                label="Slug URL"
                type="text"
                required
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="Contoh: belajar-python-praktis"
              />
              <Input
                label="Penulis"
                type="text"
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                placeholder="Nama Penulis"
              />
              <Input
                label="Kategori"
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="Contoh: Marketing, Teknologi"
              />
              <Input
                label="Harga (Rp)"
                type="number"
                min="0"
                required
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
              />
              <Input
                label="Harga Diskon (Rp) (Opsional)"
                type="number"
                min="0"
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                placeholder="Biarkan kosong jika tidak diskon"
              />
              <Input
                label="Jumlah Halaman"
                type="number"
                min="1"
                value={formPages}
                onChange={(e) => setFormPages(e.target.value)}
                placeholder="Jumlah halaman buku"
              />
              <Select
                label="Status Publikasi"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="draft">Draft (Sembunyikan)</option>
                <option value="published">Published (Aktif Jual)</option>
              </Select>
              <Input
                containerClassName="md:col-span-2"
                label="URL File PDF E-Book (Google Drive / Secure Server Link)"
                type="text"
                required
                value={formFileUrl}
                onChange={(e) => setFormFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <Input
                containerClassName="md:col-span-2"
                label="URL Cover Image Buku"
                type="text"
                value={formCoverUrl}
                onChange={(e) => setFormCoverUrl(e.target.value)}
                placeholder="https://media.jago.id/..."
              />
              <Textarea
                containerClassName="md:col-span-2"
                label="Deskripsi E-Book"
                rows={3}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Deskripsi ringkas isi buku..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="cyan" size="sm" className="bg-accent-cyan-strong text-white hover:bg-accent-cyan-strong" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan E-Book"}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
