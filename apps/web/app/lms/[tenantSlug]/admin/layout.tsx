"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { API_BASE as API } from "@/lib/api/base";

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
  const [tenantName, setTenantName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
