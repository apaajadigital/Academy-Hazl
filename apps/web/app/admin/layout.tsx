"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Activity,
  BookOpen,
  Newspaper,
  CalendarDays,
  Star,
  BookMarked,
  Images,
  Users,
  CreditCard,
  Wallet,
  ClipboardList,
  Tag,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { getToken, clearToken, refreshAccessToken } from "@/lib/auth/token";

const NAV_GROUPS = [
  {
    label: "Utama",
    items: [
      { href: "/admin/dashboard",     label: "Dashboard",  icon: LayoutDashboard, exact: true },
      { href: "/admin/sistem-health", label: "Kesehatan",  icon: Activity },
    ],
  },
  {
    label: "Akademi",
    items: [
      { href: "/admin/kursus",   label: "Kursus",    icon: BookOpen },
      { href: "/admin/blog",     label: "Blog",      icon: Newspaper },
      { href: "/admin/event",    label: "Event",     icon: CalendarDays },
      { href: "/admin/review",   label: "Review",    icon: Star },
      { href: "/admin/ebook",    label: "E-Book",    icon: BookMarked },
      { href: "/admin/portofolio", label: "Portofolio Member", icon: Images },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { href: "/admin/pengguna",  label: "Pengguna",  icon: Users },
      { href: "/admin/transaksi", label: "Transaksi", icon: CreditCard },
      { href: "/admin/payout",    label: "Payout",    icon: Wallet },
      { href: "/admin/leads",     label: "Leads",     icon: ClipboardList },
      { href: "/admin/kupon",     label: "Kupon",     icon: Tag },
      { href: "/admin/lms",       label: "LMS B2B",   icon: Building2 },
    ],
  },
];

type AdminUser = { name: string; email: string; avatarUrl: string | null };

// Friendly Indonesian labels for breadcrumb slugs (P2 polish). Slugs not listed
// fall back to Title-Case. A dynamic UUID segment (tenantId) renders as a static
// label instead of the raw id.
const BREADCRUMB_LABELS: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  "sistem-health": "Sistem Kesehatan",
  kursus: "Kursus",
  blog: "Blog",
  event: "Event",
  review: "Review",
  ebook: "E-Book",
  portofolio: "Portofolio",
  pengguna: "Pengguna",
  transaksi: "Transaksi",
  payout: "Payout",
  leads: "Leads",
  kupon: "Kupon",
  lms: "LMS B2B",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function crumbLabel(seg: string): string {
  if (UUID_RE.test(seg)) return "Detail Tenant";
  return BREADCRUMB_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function initAuth() {
      let token = getToken();
      if (!token) { router.replace("/masuk"); return; }

      // Attempt to fetch user info
      let res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      // If 401 → try token refresh once
      if (res && res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) { clearToken(); router.replace("/masuk"); return; }
        token = refreshed;
        res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }

      if (!res || !res.ok) { clearToken(); router.replace("/masuk"); return; }

      const body = await res.json();
      if (!body.success) { clearToken(); router.replace("/masuk"); return; }

      // Verify admin role
      const roleNames: string[] = (body.data.roles ?? []).map(
        (r: { role: string } | string) => (typeof r === "string" ? r : r.role)
      );
      const isAdmin = roleNames.some((r) => ["admin", "super_admin"].includes(r));
      if (!isAdmin) {
        // A5: enforce admin-only access. Non-admins are bounced to the user
        // dashboard (the backend still guards every /api/admin/* endpoint, but
        // the client must not render the admin shell to a non-admin).
        router.replace("/dashboard");
        return;
      }
      setAdmin(body.data);
      setReady(true);
    }
    initAuth();
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/masuk");
  }

  if (!ready) {
    return (
      <div className="al-loading">
        <span className="al-spinner" />
        <style jsx>{`
          .al-loading { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#F5F5F7; }
          .al-spinner { width:36px; height:36px; border-radius:50%; border:3px solid #0077A8; border-top-color:transparent; animation:spin 0.8s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const initials = admin?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "A";

  return (
    <div className={`al-root ${collapsed ? "al-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="al-sidebar">
        {/* Logo */}
        <div className="al-logo-row">
          {!collapsed && (
            <div className="al-logo-wrap">
              <Image src="/logo.png" alt="Jago Akademi" width={32} height={32} className="al-logo-img" />
              <div className="al-logo-text">
                <span className="al-logo-name">Jago Admin</span>
                <span className="al-logo-sub">Control Panel</span>
              </div>
            </div>
          )}
          <button className="al-collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar" aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="al-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="al-nav-group">
              {!collapsed && <p className="al-group-label">{group.label}</p>}
              {group.items.map((item) => {
                const isActive = ("exact" in item && item.exact) ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`al-nav-item ${isActive ? "al-nav-active" : ""}`} title={collapsed ? item.label : ""}>
                    <item.icon className="al-nav-icon" size={18} aria-hidden="true" />
                    {!collapsed && <span className="al-nav-label">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Admin user bottom */}
        <div className="al-bottom">
          <div className="al-admin-row">
            <div className="al-admin-avatar">{initials}</div>
            {!collapsed && (
              <div className="al-admin-info">
                <p className="al-admin-name">{admin?.name}</p>
                <p className="al-admin-role">Super Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`al-logout-btn ${collapsed ? "al-logout-btn-sm" : ""}`}
            title="Keluar"
          >
            <LogOut size={15} aria-hidden="true" />
            {!collapsed && <span>Keluar</span>}
          </button>
          <Link href="/" className={`al-back-btn ${collapsed ? "al-back-btn-sm" : ""}`} title="Kembali ke situs">
            <ArrowLeft size={15} aria-hidden="true" />
            {!collapsed && <span>Situs Utama</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="al-main">
        {/* Topbar */}
        <header className="al-topbar">
          <div className="al-topbar-left">
            <p className="al-breadcrumb">
              {pathname.split("/").filter(Boolean).map((seg, i, arr) => {
                const href = "/" + arr.slice(0, i + 1).join("/");
                const isLast = i === arr.length - 1;
                return (
                  <span key={href}>
                    {i > 0 && <span className="al-bc-sep">/</span>}
                    {isLast ? (
                      <span className="al-bc-active">{crumbLabel(seg)}</span>
                    ) : (
                      <Link href={href} className="al-bc-link">{crumbLabel(seg)}</Link>
                    )}
                  </span>
                );
              })}
            </p>
          </div>
          <div className="al-topbar-right">
            <div className="al-topbar-avatar">{initials}</div>
          </div>
        </header>

        <main className="al-content">
          {children}
        </main>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        .al-root {
          display: flex;
          min-height: 100vh;
          background: #F5F5F7;
        }

        /* ── Sidebar (light) ── */
        .al-sidebar {
          width: 240px;
          background: #FFFFFF;
          border-right: 1px solid #E5E5E5;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width 0.25s ease;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
        }
        .al-collapsed .al-sidebar { width: 64px; }

        .al-logo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 14px;
          border-bottom: 1px solid #E5E5E5;
          min-height: 68px;
          flex-shrink: 0;
        }
        .al-logo-wrap { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .al-logo-img { border-radius: 8px; flex-shrink: 0; }
        .al-logo-text { display: flex; flex-direction: column; white-space: nowrap; }
        .al-logo-name { font-size: 14px; font-weight: 800; color: #1D1D1F; letter-spacing: -0.01em; }
        .al-logo-sub { font-size: 10px; color: #6E6E73; font-weight: 500; margin-top: 1px; }

        .al-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: #F5F5F7; border: 1px solid #E5E5E5;
          color: #6E6E73;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.18s;
        }
        .al-collapse-btn:hover { background: #EBECEF; color: #1D1D1F; }

        .al-nav { flex: 1; min-height: 0; padding: 12px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .al-nav::-webkit-scrollbar { width: 4px; }
        .al-nav::-webkit-scrollbar-thumb { background: #D2D2D7; border-radius: 4px; }
        .al-nav::-webkit-scrollbar-track { background: transparent; }
        .al-nav-group { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
        .al-group-label {
          font-size: 9px; font-weight: 700; color: #A0A0A7;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 6px 10px 4px;
        }
        .al-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 10px;
          color: #636366; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: all 0.18s;
          position: relative; white-space: nowrap;
        }
        .al-nav-item:hover { background: #F5F5F7; color: #1D1D1F; }
        .al-nav-active {
          background: rgba(0, 212, 255, 0.08) !important;
          color: #0077A8 !important;
          font-weight: 600;
          box-shadow: inset 3px 0 0 #0077A8;
        }
        .al-nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .al-nav-label { flex: 1; }

        .al-bottom {
          padding: 12px 8px 16px;
          border-top: 1px solid #E5E5E5;
          display: flex; flex-direction: column; gap: 8px;
          flex-shrink: 0;
        }
        .al-admin-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; }
        .al-admin-avatar {
          width: 32px; height: 32px; border-radius: 10px;
          background: linear-gradient(135deg, #0077A8, #CC0052);
          color: white; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .al-admin-info { overflow: hidden; }
        .al-admin-name { font-size: 12px; font-weight: 600; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .al-admin-role { font-size: 10px; color: #6E6E73; margin-top: 1px; }

        .al-back-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 10px;
          color: #636366; font-size: 12px; font-weight: 500;
          text-decoration: none; transition: all 0.18s;
          background: #F5F5F7; border: 1px solid #E5E5E5;
        }
        .al-back-btn:hover { background: #EBECEF; color: #1D1D1F; }
        .al-back-btn-sm { justify-content: center; }

        /* Logout — red treatment mirrors the member dashboard (#DC2626) */
        .al-logout-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 10px;
          color: #DC2626; font-size: 12px; font-weight: 600;
          text-decoration: none; cursor: pointer; width: 100%;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.15);
          transition: all 0.18s;
        }
        .al-logout-btn:hover { background: rgba(220, 38, 38, 0.14); color: #B91C1C; }
        .al-logout-btn-sm { justify-content: center; }

        /* ── Main ── */
        .al-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

        .al-topbar {
          height: 56px; background: white;
          border-bottom: 1px solid #E5E5E5;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .al-breadcrumb { font-size: 13px; color: #6E6E73; }
        .al-bc-sep { margin: 0 6px; color: #C0C0C7; }
        .al-bc-item { color: #6E6E73; }
        .al-bc-link { color: #6E6E73; text-decoration: none; transition: color 0.15s; }
        .al-bc-link:hover { color: #0077A8; text-decoration: underline; }
        .al-bc-active { color: #1D1D1F; font-weight: 600; }
        .al-topbar-right { display: flex; align-items: center; }
        .al-topbar-avatar {
          width: 32px; height: 32px; border-radius: 10px;
          background: linear-gradient(135deg, #0077A8, #CC0052);
          color: white; font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .al-content {
          flex: 1; overflow-y: auto; padding: 24px;
        }
      `}</style>
    </div>
  );
}
