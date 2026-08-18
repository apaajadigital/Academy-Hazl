"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE as API } from "@/lib/api/base";
import { getValidToken } from "@/lib/auth/token";

const NAV = [
  { label: "Dashboard", href: "", icon: "📊" },
  { label: "Batch & Peserta", href: "/batches", icon: "👥" },
  { label: "Course Builder", href: "/courses", icon: "📚" },
  { label: "Laporan", href: "/reports", icon: "📈" },
  { label: "Pengaturan", href: "/settings", icon: "⚙️" },
];

export default function LmsAdminLayout({ children }: { children: ReactNode }) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /**
   * This shell had NO guard at all: it painted "LMS ADMIN", the tenant name and
   * the whole console navigation — Batch & Peserta, Course Builder, Laporan,
   * Pengaturan — to anyone who typed the URL. Measured with empty storage: the
   * chrome was on screen from 168ms to 632ms.
   *
   * The five pages underneath each call getValidToken() and bounce to /masuk on
   * their own, so tenant DATA was never exposed. What leaked was the shape of
   * another organisation's admin console, plus confirmation that a given tenant
   * slug exists. Gating here closes both, and makes this shell agree with
   * admin/layout.tsx and trainer-hub/layout.tsx.
   *
   * Authorisation reuses what already exists: /api/lms/portal/me returns every
   * tenant the caller can reach with `isAdmin` per tenant — the same endpoint
   * the member dashboard uses to decide whether to show the console link. No
   * new auth system, no duplicated token handling.
   */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function authorise() {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      const res = await fetch(`${API}/api/lms/portal/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (cancelled) return;

      if (!res || !res.ok) { router.replace("/masuk"); return; }

      const body = await res.json().catch(() => null);
      if (cancelled) return;

      const tenants: Array<{ slug: string; isAdmin?: boolean }> =
        body?.success && Array.isArray(body.data) ? body.data : [];
      const tenant = tenants.find((t) => t.slug === tenantSlug);

      // Not a member of this tenant at all — send them somewhere that belongs
      // to them. Their own dashboard, never another tenant's console.
      if (!tenant) { router.replace("/dashboard"); return; }

      // A member but not an admin: the participant portal is the correct home,
      // and it is a different route, so this cannot bounce back here.
      if (tenant.isAdmin !== true) { router.replace(`/lms/${tenantSlug}`); return; }

      setReady(true);
    }

    void authorise();
    return () => { cancelled = true; };
  }, [router, tenantSlug]);

  useEffect(() => {
    fetch(`${API}/api/lms/public/${tenantSlug}`, { cache: "force-cache" })
      .then((r) => r.json())
      .then((d) => { if (d.data?.name) setTenantName(d.data.name); })
      .catch(() => {});
  }, [tenantSlug]);

  const base = `/lms/${tenantSlug}/admin`;

  function isActive(href: string) {
    const full = base + href;
    if (href === "") return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(full);
  }

  // Gate before ANY console markup, including the tenant name — that alone
  // would confirm the slug exists to an unauthenticated visitor.
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <span
          aria-label="Memuat"
          role="status"
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#0077A8] border-t-transparent"
        />
      </div>
    );
  }

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-[#E5E5EA]">
        <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">LMS Admin</div>
        <div className="text-sm font-bold text-[#1D1D1F] truncate">{tenantName || tenantSlug}</div>
      </div>

      <div className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.map(({ label, href, icon }) => (
          <Link
            key={href}
            href={`${base}${href}`}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isActive(href)
                ? "bg-[#E8F4F9] text-[#0077A8] font-medium"
                : "text-[#3C3C43] hover:bg-[#F5F5F7]"
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-[#E5E5EA]">
        <Link
          href={`/lms/${tenantSlug}`}
          className="flex items-center gap-2 text-xs text-[#6E6E73] hover:text-[#0077A8] transition-colors"
        >
          ← Portal Peserta
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Mobile header */}
      <div className="md:hidden bg-white border-b border-[#E5E5EA] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-[#F5F5F7] text-[#1D1D1F]"
          aria-label="Buka menu"
        >
          ☰
        </button>
        <span className="text-sm font-semibold text-[#1D1D1F]">{tenantName || tenantSlug} — Admin</span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-white h-full shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 text-[#6E6E73] hover:text-[#1D1D1F] p-1"
              aria-label="Tutup menu"
            >
              ✕
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 bg-white border-r border-[#E5E5EA] flex-shrink-0">
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
