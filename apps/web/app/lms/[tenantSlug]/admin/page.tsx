"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, BookOpen, GraduationCap, Mail, BarChart3, Settings, ArrowRight } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { Card } from "@/components/ui/Card";

type TenantStat = {
  id: string;
  name: string;
  slug: string;
  _count: { batches: number; courses: number; enrollments: number; invites: number };
};

export default function LmsAdminDashboardPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [stat, setStat] = useState<TenantStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStat = async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      const authHeaders = { Authorization: `Bearer ${token}` };
      const meRes = await fetch("/api/lms/portal/me", { headers: authHeaders });
      const meData = await meRes.json();
      const myTenant = meData.data?.find((t: { slug: string; id: string }) => t.slug === tenantSlug);
      if (!myTenant) { setLoading(false); return; }
      const detailRes = await fetch(`/api/lms/tenants/${myTenant.id}`, { headers: authHeaders });
      const detailData = await detailRes.json();
      if (detailData.success) setStat(detailData.data);
      setLoading(false);
    };
    fetchStat();
  }, [tenantSlug, router]);

  if (loading) return <div className="p-6 text-center text-text-secondary">Memuat...</div>;
  if (!stat) return <div className="p-6 text-center text-red-600">Tidak ada akses atau tenant tidak ditemukan.</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Welcome hero */}
      <div className="relative mb-8 overflow-hidden rounded-[var(--radius-xl)] bg-brand-gradient p-6 text-white shadow-e2 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <h1 className="font-display text-2xl font-bold">{stat.name} — Admin LMS</h1>
          <p className="mt-2 max-w-xl text-sm text-white/90">Kelola pembelajaran, peserta, dan laporan organisasi Anda.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Batch Aktif", value: stat._count.batches, Icon: Users, tint: "bg-surface-accent-soft text-accent-cyan-strong" },
          { label: "Kursus LMS", value: stat._count.courses, Icon: BookOpen, tint: "bg-accent-purple/10 text-accent-purple" },
          { label: "Enrollment", value: stat._count.enrollments, Icon: GraduationCap, tint: "bg-green-600/10 text-green-700" },
          { label: "Undangan", value: stat._count.invites, Icon: Mail, tint: "bg-amber-500/10 text-amber-700" },
        ].map(({ label, value, Icon, tint }) => (
          <Card key={label} className="p-4 text-center">
            <span className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
              <Icon size={20} />
            </span>
            <div className="text-3xl font-bold text-text-primary">{value}</div>
            <div className="mt-1 text-xs text-text-secondary">{label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Batch & Peserta", desc: "Buat batch, undang peserta via email, import CSV", href: `/lms/${tenantSlug}/admin/batches`, Icon: Users, tint: "bg-surface-accent-soft text-accent-cyan-strong" },
          { label: "Course Builder", desc: "Buat kursus, tambah pelajaran, dan kuis", href: `/lms/${tenantSlug}/admin/courses`, Icon: BookOpen, tint: "bg-accent-purple/10 text-accent-purple" },
          { label: "Laporan Completion", desc: "Pantau progres peserta, unduh CSV & PDF", href: `/lms/${tenantSlug}/admin/reports`, Icon: BarChart3, tint: "bg-green-600/10 text-green-700" },
          { label: "Pengaturan Workspace", desc: "Logo, warna brand, domain kustom", href: `/lms/${tenantSlug}/admin/settings`, Icon: Settings, tint: "bg-amber-500/10 text-amber-700" },
        ].map(({ label, desc, href, Icon, tint }) => (
          <Link key={href} href={href} className="group">
            <Card hoverable className="flex items-start gap-4 p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 flex items-center gap-1 font-semibold text-text-primary">
                  {label}
                  <ArrowRight size={16} className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-cyan-strong" />
                </h3>
                <p className="text-xs text-text-secondary">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
