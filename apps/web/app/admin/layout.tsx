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
        {/* Logo — branded Jago Akademi mark (matches member shell) */}
        <div className="al-logo-row">
          {!collapsed && (
            <div className="al-logo-wrap">
              <Link href="/" className="al-logo-link">
                <Image src="/logo.png" alt="Jago Akademi" width={120} height={32} className="al-logo-img" />
              </Link>
              <span className="al-logo-sub">Control Panel</span>
            </div>
          )}
          <button className="al-collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar" aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
        </div>

        {/* User card — mirrors the member shell (avatar + name + role badge + email) */}
        <div className="al-user-card">
          <div className="al-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="al-user-info">
              <p className="al-user-name">
                <span>{admin?.name}</span>
                <span className="al-role-badge">Super Admin</span>
              </p>
              <p className="al-user-email">{admin?.email}</p>
            </div>
          )}
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

        {/* Bottom — "Situs Utama" link + red logout pinned at the very bottom (member shell) */}
        <div className="al-bottom">
          <Link href="/" className={`al-back-btn ${collapsed ? "al-back-btn-sm" : ""}`} title="Kembali ke situs">
            <ArrowLeft size={15} aria-hidden="true" />
            {!collapsed && <span>Situs Utama</span>}
          </Link>
          <button
            onClick={logout}
            className={`al-logout-btn ${collapsed ? "al-logout-btn-sm" : ""}`}
            title="Keluar"
          >
            <LogOut size={15} aria-hidden="true" />
            {!collapsed && <span>Keluar</span>}
          </button>
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
        .al-logo-wrap { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
        .al-logo-link { display: flex; align-items: center; }
        .al-logo-img { height: 26px; width: auto; }
        .al-logo-sub { font-size: 10px; color: #6E6E73; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }

        .al-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: #F5F5F7; border: 1px solid #E5E5E5;
          color: #6E6E73;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.18s;
        }
        .al-collapse-btn:hover { background: #EBECEF; color: #1D1D1F; }

        /* ── User card (top) — mirrors member .sidebar-user-card ── */
        .al-user-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 14px; border-bottom: 1px solid #E5E5E5;
          background: #FAFAFA; flex-shrink: 0;
        }
        .al-collapsed .al-user-card { justify-content: center; padding: 16px 8px; }
        .al-user-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #0077A8, #CC0052);
          color: white; font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; border: 2px solid #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .al-user-info { min-width: 0; }
        .al-user-name {
          display: flex; align-items: center; gap: 6px;
          color: #1D1D1F; font-size: 13px; font-weight: 600;
        }
        .al-user-name > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .al-user-email {
          color: #6E6E73; font-size: 11px; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .al-role-badge {
          background: #EBE5FC; color: #7C3AED;
          font-size: 9px; font-weight: 800; line-height: 1;
          padding: 1.5px 5px; border-radius: 4px; letter-spacing: 0.05em;
          border: 1px solid rgba(124, 58, 237, 0.2); flex-shrink: 0;
        }

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
          display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 10px;
          color: #636366; font-size: 13.5px; font-weight: 500;
          text-decoration: none; transition: all 0.18s;
          position: relative; white-space: nowrap;
        }
        .al-collapsed .al-nav-item { justify-content: center; gap: 0; }
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
