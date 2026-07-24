"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Image as ImageIcon, X } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  ModalContent,
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
} from "@/components/ui";

type PortfolioItem = {
  title: string;
  url?: string | null;
  imageUrl?: string | null;
  description?: string | null;
};

type Member = {
  id: string;
  name: string;
  role: string;
  headline?: string | null;
  photoUrl?: string | null;
  featured: boolean;
  status: string;
  portfolioItems?: PortfolioItem[] | null;
  createdAt: string;
};

const MAX_ITEMS = 30;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export default function AdminPortofolioPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formHeadline, setFormHeadline] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formStatus, setFormStatus] = useState("draft");
  const [formItems, setFormItems] = useState<PortfolioItem[]>([]);

  const [saving, setSaving] = useState(false);

  async function loadMembers() {
    const token = await getValidToken();
    if (!token) return;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });

    setLoading(true);
    fetch(`/api/admin/portfolios?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setMembers(Array.isArray(body.data) ? body.data : []);
          setTotal(body.meta?.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMembers();
  }, [page, statusFilter]); // eslint-disable-line

  function handleOpenCreate() {
    setModalMode("create");
    setEditingId(null);
    setFormName("");
    setFormRole("");
    setFormHeadline("");
    setFormPhotoUrl("");
    setFormFeatured(false);
    setFormStatus("draft");
    setFormItems([]);
    setShowModal(true);
  }

  function handleOpenEdit(member: Member) {
    setModalMode("edit");
    setEditingId(member.id);
    setFormName(member.name);
    setFormRole(member.role);
    setFormHeadline(member.headline ?? "");
    setFormPhotoUrl(member.photoUrl ?? "");
    setFormFeatured(member.featured);
    setFormStatus(member.status);
    setFormItems(
      (member.portfolioItems ?? []).map((it) => ({
        title: it.title ?? "",
        url: it.url ?? "",
        imageUrl: it.imageUrl ?? "",
        description: it.description ?? "",
      })),
    );
    setShowModal(true);
  }

  function handleAddItem() {
    if (formItems.length >= MAX_ITEMS) {
      alert(`Maksimal ${MAX_ITEMS} item portofolio.`);
      return;
    }
    setFormItems([...formItems, { title: "", url: "", imageUrl: "", description: "" }]);
  }

  function handleRemoveItem(index: number) {
    setFormItems(formItems.filter((_, i) => i !== index));
  }

  function handleItemChange(index: number, field: keyof PortfolioItem, value: string) {
    setFormItems(formItems.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  // Client-side guards mirroring the server rules (Zod on the API boundary).
  function validateForm(): string | null {
    const name = formName.trim();
    const role = formRole.trim();
    if (name.length < 2 || name.length > 120) return "Nama wajib 2-120 karakter.";
    if (role.length < 2 || role.length > 120) return "Role wajib 2-120 karakter.";
    if (formHeadline.trim().length > 200) return "Headline maksimal 200 karakter.";
    if (formPhotoUrl.trim() && !isHttpsUrl(formPhotoUrl.trim())) {
      return "URL Foto harus berupa link https:// yang valid.";
    }
    if (formItems.length > MAX_ITEMS) return `Maksimal ${MAX_ITEMS} item portofolio.`;
    for (const [i, it] of formItems.entries()) {
      const title = (it.title ?? "").trim();
      if (title.length < 1 || title.length > 160) {
        return `Item #${i + 1}: judul wajib 1-160 karakter.`;
      }
      if ((it.url ?? "").trim() && !isHttpsUrl((it.url ?? "").trim())) {
        return `Item #${i + 1}: URL harus berupa link https:// yang valid.`;
      }
      if ((it.imageUrl ?? "").trim() && !isHttpsUrl((it.imageUrl ?? "").trim())) {
        return `Item #${i + 1}: URL gambar harus berupa link https:// yang valid.`;
      }
      if ((it.description ?? "").trim().length > 300) {
        return `Item #${i + 1}: deskripsi maksimal 300 karakter.`;
      }
    }
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const token = await getValidToken();
    if (!token) return;

    setSaving(true);
    const url = modalMode === "create" ? "/api/admin/portfolios" : `/api/admin/portfolios/${editingId}`;
    const method = modalMode === "create" ? "POST" : "PATCH";

    const payload = {
      name: formName.trim(),
      role: formRole.trim(),
      headline: formHeadline.trim() || null,
      photoUrl: formPhotoUrl.trim() || null,
      featured: formFeatured,
      status: formStatus,
      portfolioItems: formItems.map((it) => ({
        title: (it.title ?? "").trim(),
        url: (it.url ?? "").trim() || null,
        imageUrl: (it.imageUrl ?? "").trim() || null,
        description: (it.description ?? "").trim() || null,
      })),
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
        loadMembers();
      } else {
        alert(body.error?.message ?? "Gagal menyimpan portofolio member.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus member "${name}"?`)) return;

    const token = await getValidToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/portfolios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (body.success) {
        loadMembers();
      } else {
        alert(body.error?.message ?? "Gagal menghapus member.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex max-w-[1200px] flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-text-primary">Portofolio Member</h1>
          <p className="mt-1 text-sm text-text-secondary">{total.toLocaleString("id-ID")} member terdaftar</p>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="sm" leftIcon={<Plus size={16} />}>Tambah Member</Button>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
        <TabsList className="flex-wrap">
          {["all", "published", "draft"].map((st) => (
            <TabsTrigger key={st} value={st}>
              {st === "all" ? "Semua" : st === "published" ? "Published" : "Draft"}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><span className="size-8 animate-spin rounded-full border-[3px] border-accent-cyan-strong border-t-transparent" /></div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card py-12 text-text-muted">
          <ImageIcon size={32} className="text-border-strong" />
          <p className="text-sm">Tidak ada member ditemukan</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Member</TH><TH>Role</TH><TH>Karya</TH><TH>Status</TH><TH>Featured</TH><TH>Dibuat</TH><TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {members.map((member) => (
                <TR key={member.id}>
                  <TD className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] text-xs font-extrabold text-white">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="size-full object-cover" />
                        ) : (
                          <span>{(member.name ?? "?").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{member.name}</p>
                        {member.headline && <p className="mt-0.5 max-w-[320px] truncate text-xs text-text-muted">{member.headline}</p>}
                      </div>
                    </div>
                  </TD>
                  <TD className="py-3">
                    <span className="rounded-md bg-surface-accent-soft px-2 py-1 text-xs font-semibold text-accent-cyan-strong">{member.role}</span>
                  </TD>
                  <TD className="py-3 text-sm text-text-secondary">{member.portfolioItems?.length ?? 0} item</TD>
                  <TD className="py-3">
                    <Badge variant={member.status === "published" ? "success" : "neutral"}>
                      {member.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </TD>
                  <TD className="py-3">
                    <Star size={16} className={member.featured ? "text-amber-400" : "text-border-strong"} fill={member.featured ? "currentColor" : "none"} />
                  </TD>
                  <TD className="py-3 text-sm text-text-secondary">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString("id-ID") : "—"}
                  </TD>
                  <TD className="py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleOpenEdit(member)} className="rounded-lg bg-surface-accent-soft px-3 py-1.5 text-xs font-bold text-accent-cyan-strong transition-colors hover:bg-accent-cyan-strong hover:text-white">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(member.id, member.name)} className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white">
                        Hapus
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* CRUD Modal */}
      <Modal open={showModal} onOpenChange={setShowModal}>
        <ModalContent
          title={modalMode === "create" ? "Tambah Member Baru" : "Edit Member"}
          className="max-w-2xl"
        >
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Input
                label="Nama Member"
                type="text"
                required
                maxLength={120}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
              />
              <Input
                label="Role / Profesi"
                type="text"
                required
                maxLength={120}
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                placeholder="Contoh: UI/UX Designer"
              />
              <Input
                label="Headline (Opsional, maks 200)"
                type="text"
                maxLength={200}
                value={formHeadline}
                onChange={(e) => setFormHeadline(e.target.value)}
                placeholder="Contoh: Alumni Bootcamp Batch 3 — kini bekerja di startup fintech"
                containerClassName="md:col-span-2"
              />
              <Input
                label="URL Foto (https)"
                type="text"
                value={formPhotoUrl}
                onChange={(e) => setFormPhotoUrl(e.target.value)}
                placeholder="https://media.jago.id/..."
                containerClassName="md:col-span-2"
              />
              <Select
                label="Status Publikasi"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="draft">Draft (Sembunyikan)</option>
                <option value="published">Published (Tampilkan)</option>
              </Select>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="size-4 accent-[var(--brand-cyan-strong)]"
                />
                <span>★ Featured (tampil paling depan)</span>
              </label>
            </div>

            {/* Dynamic portfolio items editor */}
            <div className="flex flex-col gap-2.5 border-t border-solid border-border-default pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary">
                  Item Portofolio ({formItems.length}/{MAX_ITEMS})
                </label>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={formItems.length >= MAX_ITEMS}
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                >
                  Tambah Item
                </Button>
              </div>
              {formItems.length === 0 && (
                <p className="py-2 text-xs text-text-muted">Belum ada item. Klik &quot;Tambah Item&quot; untuk menambahkan karya.</p>
              )}
              {formItems.map((item, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-border-default bg-surface-sunken p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary">Item #{index + 1}</span>
                    <button type="button" onClick={() => handleRemoveItem(index)} className="inline-flex items-center gap-1 rounded-md bg-red-600/10 px-2 py-1 text-[10px] font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white">
                      <X size={11} /> Hapus
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Input
                      type="text"
                      maxLength={160}
                      value={item.title ?? ""}
                      onChange={(e) => handleItemChange(index, "title", e.target.value)}
                      placeholder="Judul karya (wajib, maks 160)"
                      className="py-2 text-sm"
                    />
                    <Input
                      type="text"
                      value={item.url ?? ""}
                      onChange={(e) => handleItemChange(index, "url", e.target.value)}
                      placeholder="URL karya https:// (opsional)"
                      className="py-2 text-sm"
                    />
                    <Input
                      type="text"
                      value={item.imageUrl ?? ""}
                      onChange={(e) => handleItemChange(index, "imageUrl", e.target.value)}
                      placeholder="URL gambar https:// (opsional)"
                      className="py-2 text-sm"
                    />
                    <Input
                      type="text"
                      maxLength={300}
                      value={item.description ?? ""}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      placeholder="Deskripsi singkat (opsional, maks 300)"
                      className="py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5">
              <Button type="button" onClick={() => setShowModal(false)} variant="ghost" size="sm">
                Batal
              </Button>
              <Button type="submit" disabled={saving} variant="cyan" size="sm">
                {saving ? "Menyimpan..." : "Simpan Member"}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
