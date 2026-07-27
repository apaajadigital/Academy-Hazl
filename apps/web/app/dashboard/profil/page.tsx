"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Save,
  Lock,
  User as UserIcon,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import {
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DashboardLoading,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
};

const API = ""; // Relative path → Next.js proxy → backend


export default function ProfilPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", bio: "" });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profil" | "keamanan">("profil");

  // Password change state
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passMsg, setPassMsg] = useState("");
  const [passMsgType, setPassMsgType] = useState<"success" | "error">("success");
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    // Finding #4: refresh-aware token read avoids sending `Bearer null`.
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((body) => {
          if (!body.success) throw new Error(body.error?.message ?? "Gagal memuat profil.");
          const u: UserProfile = body.data;
          setUser(u);
          setForm({ name: u.name, phone: u.phone ?? "", bio: u.bio ?? "" });
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    })();
  }, [router]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Ukuran foto maks. 5 MB."); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    // Finding #4: refresh-aware token; redirect if the session is gone.
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    setUploadingAvatar(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await fetch(`${API}/api/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error?.message ?? "Gagal mengunggah foto.");
      setUser((prev) => prev ? { ...prev, avatarUrl: body.data.avatarUrl } : prev);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    // Finding #4: refresh-aware token; redirect if the session is gone.
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error?.message ?? "Gagal menyimpan.");
      setSuccess(true);
      setUser((prev) => prev ? { ...prev, ...form } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassMsg("Konfirmasi password tidak cocok.");
      setPassMsgType("error");
      return;
    }
    // Finding #4: refresh-aware token; redirect if the session is gone.
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    setSavingPass(true);
    setPassMsg("");
    try {
      const res = await fetch(`${API}/api/users/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword }),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error?.message ?? "Gagal mengubah password.");
      setPassMsg("Password berhasil diubah.");
      setPassMsgType("success");
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      setPassMsg(e instanceof Error ? e.message : "Gagal mengubah password.");
      setPassMsgType("error");
    } finally {
      setSavingPass(false);
    }
  }

  if (loading) {
    return <DashboardLoading />;
  }

  const currentAvatar = avatarPreview || user?.avatarUrl;

  const passwordFields = [
    { key: "currentPassword", label: "Password Saat Ini", placeholder: "Masukkan password lama" },
    { key: "newPassword", label: "Password Baru", placeholder: "Min. 8 karakter" },
    { key: "confirmPassword", label: "Konfirmasi Password", placeholder: "Ulangi password baru" },
  ];

  return (
    <div className="dash-container flex flex-col gap-8">
      {/* Page heading */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">Profil Member</h1>
        <p className="mt-1 text-sm text-text-secondary">Kelola informasi pribadi dan keamanan akun Anda.</p>
      </div>

      <div className="dash-grid">
        {/* Profile ID card */}
        <Card className="relative col-span-12 overflow-hidden lg:col-span-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent-cyan-strong/10 blur-2xl"
          />
          <div className="relative flex flex-col items-center p-8 text-center">
            <div className="relative mb-5">
              <Avatar
                size="xl"
                src={currentAvatar ?? undefined}
                name={user?.name}
                alt={user?.name ?? "Avatar"}
                className="h-28 w-28 text-3xl shadow-e3 ring-4 ring-white"
              />
              <button
                type="button"
                aria-label="Ganti foto profil"
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-accent-cyan-strong text-white shadow-e2 transition-transform hover:scale-110 active:scale-95"
                onClick={() => fileRef.current?.click()}
                title="Ganti foto profil"
              >
                <Camera size={18} aria-hidden="true" />
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <h2 className="font-display text-lg font-bold text-text-primary">{user?.name}</h2>
            <p className="mt-1 text-sm text-text-secondary">{user?.email}</p>

            {user?.isVerified && (
              <Badge variant="success" className="mt-3">
                <BadgeCheck size={14} aria-hidden="true" /> Email Terverifikasi
              </Badge>
            )}

            <p className="mt-3 text-xs text-text-muted">
              Member sejak {new Date(user?.createdAt ?? "").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </p>

            {avatarFile && (
              <div className="mt-5 w-full space-y-2 border-t border-border-default pt-5">
                <p className="truncate text-xs text-text-muted">{avatarFile.name}</p>
                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="cyan"
                    onClick={uploadAvatar}
                    loading={uploadingAvatar}
                    leftIcon={<Save size={15} aria-hidden="true" />}
                  >
                    {uploadingAvatar ? "Mengunggah..." : "Simpan Foto"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Forms column */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "profil" | "keamanan")}
          className="col-span-12 lg:col-span-8"
        >
          <TabsList>
            <TabsTrigger value="profil">
              <UserIcon size={16} aria-hidden="true" /> Data Profil
            </TabsTrigger>
            <TabsTrigger value="keamanan">
              <Lock size={16} aria-hidden="true" /> Keamanan
            </TabsTrigger>
          </TabsList>

          {/* Profil tab */}
          <TabsContent value="profil">
            <Card>
              <CardHeader>
                <h3 className="font-display text-lg font-bold text-text-primary">Informasi Profil</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {success && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    <CheckCircle2 size={16} aria-hidden="true" /> Profil berhasil disimpan.
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    <AlertCircle size={16} aria-hidden="true" /> {error}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                  <Input
                    label="Nama Lengkap"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama lengkap Anda"
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    hint="Email tidak dapat diubah."
                  />

                  <Input
                    label="Nomor Telepon"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />

                  <Textarea
                    label="Bio / Tentang Saya"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Ceritakan sedikit tentang diri Anda..."
                    rows={3}
                    maxLength={300}
                    hint={`${form.bio.length}/300 karakter`}
                  />

                  <Button type="submit" loading={saving} leftIcon={<Save size={18} aria-hidden="true" />}>
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keamanan tab */}
          <TabsContent value="keamanan">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent-purple/10 text-accent-purple">
                    <Lock size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-text-primary">Ubah Password</h3>
                    <p className="text-sm text-text-secondary">
                      Pastikan password baru Anda kuat dan tidak mudah ditebak.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {passMsg && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium",
                      passMsgType === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-green-200 bg-green-50 text-green-700",
                    )}
                  >
                    {passMsgType === "error" ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                    {passMsg}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordFields.map(({ key, label, placeholder }) => (
                    <Input
                      key={key}
                      label={label}
                      type="password"
                      required
                      minLength={key !== "currentPassword" ? 8 : undefined}
                      value={passForm[key as keyof typeof passForm]}
                      onChange={(e) => setPassForm({ ...passForm, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  ))}

                  <Button type="submit" loading={savingPass} leftIcon={<Lock size={18} aria-hidden="true" />}>
                    {savingPass ? "Menyimpan..." : "Ubah Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
