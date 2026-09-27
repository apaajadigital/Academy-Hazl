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
  Menu,
  X,
} from "lucide-react";
import { getToken, clearToken, refreshAccessToken } from "@/lib/auth/token";
import { logout as revokeSession } from "@/lib/auth/api";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Real role label (fix B1: no longer hardcoded "Super Admin").
  const [roleLabel, setRoleLabel] = useState("Admin");

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
      setRoleLabel(roleNames.includes("super_admin") ? "Super Admin" : "Admin");
      setAdmin(body.data);
      setReady(true);
    }
    initAuth();
  }, [router]);

  async function logout() {
    // Revoke the HttpOnly refresh cookie server-side first — clearToken() only
    // drops the access token, leaving `jg_rt` alive and the session resumable.
    // Failure here must never trap the user in the shell, so we swallow it and
    // always fall through to the local clear + redirect.
    await revokeSession().catch(() => undefined);
    clearToken();
    router.replace("/masuk");
  }

  if (!ready) {
    return (
      <div className="al-loading">
        <span className="al-spinner" />
        <style jsx>{`
          .al-loading { display:flex; align-items:center; justify-content:center; min-height:100vh; background:var(--surface-page); }
          .al-spinner { width:36px; height:36px; border-radius:50%; border:3px solid var(--brand-cyan-strong); border-top-color:transparent; animation:spin 0.8s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const initials = admin?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "A";

  return (
    <div className={`al-root ${collapsed ? "al-collapsed" : ""} ${sidebarOpen ? "al-drawer-open" : ""}`}>
      {/* Mobile overlay */}
      <div className="al-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      {/* Sidebar */}
      <aside className="al-sidebar">
        {/* Logo — branded Hazl Academy mark (matches member shell) */}
        <div className="al-logo-row">
          {!collapsed && (
            <div className="al-logo-wrap">
              <Link href="/" className="al-logo-link">
                <Image src="/logo.png" alt="Hazl Academy" width={158} height={32} className="al-logo-img" />
              </Link>
              <span className="al-logo-sub">Control Panel</span>
            </div>
          )}
          <button className="al-collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar" aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
          <button className="al-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* User card — mirrors the member shell (avatar + name + role badge + email) */}
        <div className="al-user-card">
          <div className="al-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="al-user-info">
              <p className="al-user-name">
                <span>{admin?.name}</span>
                <span className="al-role-badge">{roleLabel}</span>
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
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`al-nav-item ${isActive ? "al-nav-active" : ""}`}
                    title={collapsed ? item.label : ""}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setSidebarOpen(false)}
                  >
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
            <button className="al-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
              <Menu size={20} aria-hidden="true" />
            </button>
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
        /* Admin shell — token-driven (standardization Jul 2026). Shares the
           same color source of truth as the member & trainer shells. Content
           wrapper is vertical rhythm only; width/padding via .dash-container. */
        /* NOTE: "padding: 0" was removed here (Aug 2026).
           styled-jsx injects this block UNLAYERED, while Tailwind's utilities
           live in a cascade layer — and an unlayered rule beats every layered
           one regardless of specificity. The effect was measurable and total:
           on every admin page the p-6 utility computed to 0px and
           .dash-container lost its 16/24/32px inline padding, so cards sat
           flush against their own borders and the console ran to the viewport
           edge. Trainer and student have no such reset, which is why only
           admin looked cramped. Tailwind preflight already zeroes padding
           where it matters (lists, fieldset) from the base layer, where
           utilities can still override it. The margin reset is kept, so this
           changes spacing in one direction only. */
        * { box-sizing: border-box; margin: 0; }
        body { font-family: var(--font-body); }

        .al-root {
          display: flex;
          min-height: 100vh;
          background: var(--surface-page);
        }

        /* Mobile overlay (hidden on desktop) */
        .al-overlay {
          position: fixed; inset: 0;
          background: rgba(29,29,31,0.4);
          backdrop-filter: blur(2px);
          z-index: 40; display: none;
        }

        /* ── Sidebar (light) ── */
        .al-sidebar {
          width: 240px;
          background: var(--surface-card);
          border-right: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width 0.25s ease, transform 0.3s ease;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          z-index: 50;
        }
        .al-collapsed .al-sidebar { width: 64px; }

        .al-logo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 14px;
          border-bottom: 1px solid var(--border-default);
          min-height: 68px;
          flex-shrink: 0;
        }
        .al-logo-wrap { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
        .al-logo-link { display: flex; align-items: center; }
        .al-logo-img { height: 26px; width: auto; }
        .al-logo-sub { font-size: 10px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }

        .al-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--surface-page); border: 1px solid var(--border-default);
          color: var(--text-muted);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.18s;
        }
        .al-collapse-btn:hover { background: #EBECEF; color: var(--text-primary); }

        /* Close button — mobile drawer only */
        .al-close-btn {
          display: none;
          width: 32px; height: 32px;
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .al-close-btn:hover { color: var(--text-primary); }

        /* ── User card (top) — mirrors member .sidebar-user-card ── */
        .al-user-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 14px; border-bottom: 1px solid var(--border-default);
          background: var(--surface-sunken); flex-shrink: 0;
        }
        .al-collapsed .al-user-card { justify-content: center; padding: 16px 8px; }
        .al-user-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--brand-cyan-strong), var(--brand-pink-strong));
          color: #fff; font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; border: 2px solid var(--surface-card);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .al-user-info { min-width: 0; }
        .al-user-name {
          display: flex; align-items: center; gap: 6px;
          color: var(--text-primary); font-size: 13px; font-weight: 600;
        }
        .al-user-name > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .al-user-email {
          color: var(--text-muted); font-size: 11px; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .al-role-badge {
          background: var(--surface-accent-soft); color: var(--brand-cyan-strong);
          font-size: 9px; font-weight: 800; line-height: 1;
          padding: 2px 5px; border-radius: 4px; letter-spacing: 0.05em;
          border: 1px solid rgba(0, 119, 168, 0.2); flex-shrink: 0;
        }

        .al-nav { flex: 1; min-height: 0; padding: 12px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .al-nav::-webkit-scrollbar { width: 4px; }
        .al-nav::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .al-nav::-webkit-scrollbar-track { background: transparent; }
        .al-nav-group { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
        .al-group-label {
          font-size: 9px; font-weight: 700; color: #A0A0A7;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 6px 10px 4px;
        }
        .al-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px;
          color: var(--text-secondary); font-size: 13.5px; font-weight: 500;
          text-decoration: none; transition: all 0.18s;
          position: relative; white-space: nowrap;
        }
        .al-collapsed .al-nav-item { justify-content: center; gap: 0; }
        .al-nav-item:hover { background: var(--surface-page); color: var(--text-primary); }
        .al-nav-active {
          background: var(--surface-accent-soft) !important;
          color: var(--brand-cyan-strong) !important;
          font-weight: 600;
          box-shadow: inset 3px 0 0 var(--brand-cyan-strong);
        }
        .al-nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .al-nav-label { flex: 1; }

        .al-bottom {
          padding: 12px 8px 16px;
          border-top: 1px solid var(--border-default);
          display: flex; flex-direction: column; gap: 8px;
          flex-shrink: 0;
        }

        .al-back-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 10px;
          color: var(--text-secondary); font-size: 12px; font-weight: 500;
          text-decoration: none; transition: all 0.18s;
          background: var(--surface-page); border: 1px solid var(--border-default);
        }
        .al-back-btn:hover { background: #EBECEF; color: var(--text-primary); }
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
          height: 56px; background: var(--surface-card);
          border-bottom: 1px solid var(--border-default);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .al-topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .al-hamburger {
          display: none;
          background: none; border: none; color: var(--text-primary);
          cursor: pointer; padding: 4px; align-items: center;
        }
        .al-breadcrumb { font-size: 13px; color: var(--text-muted); }
        .al-bc-sep { margin: 0 6px; color: #C0C0C7; }
        .al-bc-item { color: var(--text-muted); }
        .al-bc-link { color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
        .al-bc-link:hover { color: var(--brand-cyan-strong); text-decoration: underline; }
        .al-bc-active { color: var(--text-primary); font-weight: 600; }
        .al-topbar-right { display: flex; align-items: center; }
        .al-topbar-avatar {
          width: 32px; height: 32px; border-radius: 10px;
          background: linear-gradient(135deg, var(--brand-cyan-strong), var(--brand-pink-strong));
          color: #fff; font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        /* Vertical rhythm only — horizontal width/padding via .dash-container. */
        .al-content {
          flex: 1; overflow-y: auto; padding: 32px 0;
        }

        /* ── Responsive: off-canvas drawer ≤768px ── */
        @media (max-width: 768px) {
          .al-sidebar {
            position: fixed; left: 0; top: 0; bottom: 0;
            height: 100vh; width: 260px;
            transform: translateX(-100%);
          }
          .al-collapsed .al-sidebar { width: 260px; }
          .al-drawer-open .al-sidebar { transform: translateX(0); }
          .al-drawer-open .al-overlay { display: block; }
          .al-collapse-btn { display: none; }
          .al-close-btn { display: flex; }
          .al-hamburger { display: flex; }
          .al-content { padding: 24px 0; }
        }
      `}</style>
    </div>
  );
}
