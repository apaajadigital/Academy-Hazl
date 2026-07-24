"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getValidToken } from "@/lib/auth/token";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal, ModalContent } from "@/components/ui/Modal";

type Batch = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  _count: { members: number; assignments: number };
};

export default function LmsAdminBatchesPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteBatchId, setInviteBatchId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [csvParsed, setCsvParsed] = useState<string[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const authHeaders = { Authorization: `Bearer ${token}` };
    const tenantDetail = await fetch(`/api/lms/portal/me`, { headers: authHeaders });
    const meData = await tenantDetail.json();
    const myTenant = meData.data?.find((t: { slug: string; id: string }) => t.slug === tenantSlug);
    if (!myTenant) { setLoading(false); return; }
    setTenantId(myTenant.id);
    const batchRes = await fetch(`/api/lms/tenants/${myTenant.id}/batches`, { headers: authHeaders });
    const batchData = await batchRes.json();
    setBatches(batchData.data ?? []);
    setLoading(false);
  }, [tenantSlug, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const res = await fetch(`/api/lms/tenants/${tenantId}/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ name: "", description: "" }); fetchData(); }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError(null);
    setCsvParsed([]);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setCsvError("File harus berformat .csv"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split(/\r?\n/).flatMap((row) => row.split(",")).map((v) => v.trim().replace(/^"|"$/g, "")).filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      if (rows.length === 0) { setCsvError("Tidak ada email valid ditemukan di file CSV."); return; }
      setCsvParsed(rows);
      setInviteEmails(rows.join("\n"));
    };
    reader.readAsText(file);
  }

  async function sendInvites(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !inviteEmails.trim()) return;
    setInviting(true);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const emails = inviteEmails.split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
    const res = await fetch(`/api/lms/tenants/${tenantId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emails, batchId: inviteBatchId || undefined }),
    });
    const data = await res.json();
    setInviting(false);
    if (data.success) {
      alert(`Undangan terkirim: ${data.data.created.length}, dilewati: ${data.data.skipped.length}`);
      setInviteEmails("");
      setCsvParsed([]);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-text-secondary">
        <Link href={`/lms/${tenantSlug}/admin`} className="transition-colors hover:text-accent-cyan-strong">Admin</Link>
        <span>/</span>
        <span className="text-text-primary">Batch</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text-primary">Manajemen Batch</h1>
        <Button variant="cyan" size="sm" onClick={() => setShowForm(true)}>
          + Batch Baru
        </Button>
      </div>

      <Modal open={showForm} onOpenChange={setShowForm}>
        <ModalContent title="Buat Batch Baru">
          <form onSubmit={createBatch} className="space-y-4">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama batch (cth: Angkatan 2025)" required />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi (opsional)" rows={3} />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" variant="cyan" className="flex-1">Buat</Button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      {loading ? (
        <div className="py-8 text-center text-text-secondary">Memuat...</div>
      ) : (
        <div className="mb-8 space-y-3">
          {batches.map((b) => (
            <Card key={b.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-text-primary">{b.name}</div>
                {b.description && <div className="mt-0.5 text-xs text-text-secondary">{b.description}</div>}
                <div className="mt-1 text-xs text-text-secondary">
                  {b._count.members} anggota · {b._count.assignments} kursus
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={b.isActive ? "success" : "neutral"}>
                  {b.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
                <Button variant="secondary" size="sm" onClick={() => setInviteBatchId(b.id)}>Undang</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Undang Peserta</h2>
        <form onSubmit={sendInvites} className="space-y-3">
          {batches.length > 0 && (
            <Select value={inviteBatchId} onChange={(e) => setInviteBatchId(e.target.value)}>
              <option value="">Tanpa batch (opsional)</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}

          {/* CSV upload */}
          <div className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface-sunken p-4">
            <div className="mb-2 text-xs font-medium text-text-primary">Import dari file CSV</div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="cursor-pointer text-xs text-text-secondary file:mr-3 file:rounded-lg file:border file:border-border-default file:bg-surface-card file:px-3 file:py-1 file:text-xs file:font-medium file:text-accent-cyan-strong hover:file:bg-surface-accent-soft"
            />
            {csvError && <p className="mt-2 text-xs text-red-600">{csvError}</p>}
            {csvParsed.length > 0 && (
              <p className="mt-2 text-xs font-medium text-green-700">
                ✓ {csvParsed.length} email valid ditemukan dari CSV
              </p>
            )}
            <p className="mt-2 text-xs text-text-secondary">
              Format: satu kolom berisi alamat email. Kolom lain akan diabaikan.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-default" /></div>
            <div className="relative flex justify-center"><span className="bg-surface-card px-2 text-xs text-text-secondary">atau ketik langsung</span></div>
          </div>

          <Textarea
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder={"Masukkan email (satu per baris atau dipisah koma):\nuser1@contoh.com\nuser2@contoh.com"}
            rows={5}
            className="font-mono"
          />
          {inviteEmails.trim() && (
            <p className="text-xs text-text-secondary">
              {inviteEmails.split(/[\n,]+/).map((v) => v.trim()).filter(Boolean).length} email akan diundang
            </p>
          )}
          <Button type="submit" variant="cyan" className="w-full" disabled={inviting || !inviteEmails.trim()}>
            {inviting ? "Mengirim undangan..." : "Kirim Undangan"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
