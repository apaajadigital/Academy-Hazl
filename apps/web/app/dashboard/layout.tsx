"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  BookOpen,
  Award,
  BookMarked,
  Ticket,
  ShoppingBag,
  Crown,
  Handshake,
  User,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Settings,
} from "lucide-react";
import { getToken, setToken, clearToken, refreshAccessToken } from "@/lib/auth/token";
import { logout as revokeSession } from "@/lib/auth/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: Home, exact: true },
  { href: "/dashboard/kursus", label: "Kursus Saya", icon: BookOpen },
  { href: "/dashboard/sertifikat", label: "Sertifikat", icon: Award },
  { href: "/dashboard/ebook", label: "E-Book Saya", icon: BookMarked },
  { href: "/dashboard/tiket", label: "Tiket Event", icon: Ticket },
  { href: "/dashboard/pesanan", label: "Pesanan", icon: ShoppingBag },
  { href: "/dashboard/berlangganan", label: "Berlangganan", icon: Crown },
  { href: "/dashboard/afiliasi", label: "Afiliasi", icon: Handshake },
  { href: "/dashboard/profil", label: "Profil Saya", icon: User },
];

type UserInfo = {
  name: string;
  email: string;
  avatarUrl: string | null;
  roles?: {role: string}[];
  subscription?: { status: string; expiresAt: string } | null;
};
/** `isAdmin` is served per tenant by `/api/lms/portal/me`. */
type LmsTenant = { id: string; name: string; slug: string; isAdmin: boolean };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lmsTenants, setLmsTenants] = useState<LmsTenant[]>([]);
  /**
   * Nothing protected renders until this is true.
   *
   * Without it this shell painted the full student navigation — Kursus Saya,
   * Sertifikat, Pesanan, Afiliasi, Keluar — to anyone who typed /dashboard,
   * for ~900ms, before the redirect to /masuk landed. Measured, not assumed:
   * the menu was on screen from 103ms to 1001ms with empty storage. The data
   * behind it was never exposed (every child fetches with a Bearer token), but
   * the structure of a signed-in account was, and it flashed unstyled because
   * the `style jsx` had not applied yet.
   *
   * `admin/layout.tsx` and `trainer-hub/layout.tsx` already gate exactly this
   * way. This makes the third shell agree with them rather than inventing
   * anything new. It is set ONLY on the success path — every `router.replace`
   * above returns without setting it, so a redirecting visitor keeps seeing the
   * spinner instead of a shell they are about to be moved away from.
   */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initAuth() {
      let token = getToken();
      if (!token) { router.replace("/masuk"); return; }

      // Sync from localStorage to sessionStorage if needed
      if (!sessionStorage.getItem("access_token") && token) {
        setToken(token);
      }

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

      const roleNames: string[] = (body.data.roles ?? []).map(
        (r: { role: string } | string) => (typeof r === "string" ? r : r.role)
      );
      if (roleNames.some((r) => ["admin", "super_admin"].includes(r))) {
        router.replace("/admin/dashboard");
        return;
      }
      if (roleNames.includes("trainer")) {
        router.replace("/trainer-hub");
        return;
      }

      // Only now is this visitor confirmed to belong in THIS shell. setUser
      // moved below the role checks on purpose: setting it earlier would paint
      // the student sidebar for an admin who is a tick away from being sent to
      // /admin/dashboard.
      setUser(body.data);
      setReady(true);
      // `/api/lms/portal/me` lists every tenant the user can reach — batch
      // memberships plus tenants they administer — and carries `isAdmin` per
      // tenant, so the admin-console link needs no extra permission probe.
      // Default `isAdmin` to false so an older API response hides the link
      // rather than showing one that would land on a 403.
      fetch("/api/lms/portal/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((b) => {
          if (!b.success || !Array.isArray(b.data)) return;
          const tenants = (b.data as LmsTenant[]).map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            isAdmin: t.isAdmin === true,
          }));
          setLmsTenants(tenants);
        })
        .catch(() => {});
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

  // Gate BEFORE any protected markup — same shape as admin/layout.tsx and
  // trainer-hub/layout.tsx. A spinner leaks nothing about who is signed in.
  if (!ready) {
    return (
      <div className="dash-auth-loading">
        <span className="dash-auth-spinner" />
        <style jsx>{`
          .dash-auth-loading { display:flex; align-items:center; justify-content:center; min-height:100vh; background:var(--surface-page); }
          .dash-auth-spinner { width:36px; height:36px; border-radius:50%; border:3px solid var(--brand-cyan-strong); border-top-color:transparent; animation:spin 0.8s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="dashboard-root">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <Link href="/" className="sidebar-logo-link">
            <Image src="/logo.png" alt="Hazl Academy" width={158} height={32} className="sidebar-logo-img" />
          </Link>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* User card mini */}
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">
            {user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} width={40} height={40} className="sidebar-avatar-img" />
            ) : (
              <span className="sidebar-avatar-initials">{initials}</span>
            )}
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>{user?.name ?? "Memuat..."}</span>
              {user?.subscription?.status === "active" && (
                <span className="pro-badge">PRO</span>
              )}
            </p>
            <p className="sidebar-user-email">{user?.email ?? ""}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Menu Dashboard">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? "sidebar-nav-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="sidebar-nav-icon" size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* LMS Portal shortcut (only for LMS members) */}
        {lmsTenants.length > 0 && (
          <div className="sidebar-admin-wrap">
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 12px", marginBottom: 4 }}>LMS Portal</p>
            {lmsTenants.map((t) => (
              <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <a href={`/lms/${t.slug}`} className="sidebar-admin-link" style={{ gap: 8 }}>
                  <GraduationCap size={16} aria-hidden="true" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                </a>
                {/* Only rendered for confirmed LMS admins of this tenant. */}
                {t.isAdmin && (
                  <a
                    href={`/lms/${t.slug}/admin`}
                    className="sidebar-admin-link"
                    style={{ gap: 8, fontSize: 12, marginLeft: 12 }}
                  >
                    <Settings size={14} aria-hidden="true" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Konsol Admin</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <div className="sidebar-footer">
          <button onClick={logout} className="sidebar-logout-btn">
            <LogOut className="sidebar-nav-icon" size={18} aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="dashboard-main">
        {/* Mobile topbar */}
        <header className="dashboard-topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link href="/" className="topbar-logo">
            <Image src="/logo.png" alt="Hazl Academy" width={129} height={26} />
          </Link>
          <div className="topbar-avatar">
            {user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user?.name ?? ""} width={32} height={32} className="topbar-avatar-img" />
            ) : (
              <span className="topbar-avatar-initials">{initials}</span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard-content" id="main-content">
          {children}
        </main>
      </div>

      <style jsx global>{`
        /* Dashboard shell — token-driven (standardization Jul 2026). Colors
           reference design tokens (app/globals.css) so the three dashboard
           shells share one source of truth. Content wrapper provides vertical
           rhythm only; horizontal width/padding is owned by .dash-container. */

        /* ── Pro Badge ── */
        .pro-badge {
          background: rgba(0, 119, 168, 0.1);
          color: var(--brand-cyan-strong);
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          border: 1px solid rgba(0, 119, 168, 0.25);
          display: inline-block;
          line-height: 1;
        }

        /* ── Root layout ── */
        .dashboard-root {
          display: flex;
          min-height: 100vh;
          background: var(--surface-page);
          font-family: var(--font-body);
        }

        /* ── Sidebar (light) ── */
        .dashboard-sidebar {
          width: 260px;
          min-height: 100vh;
          background: var(--surface-card);
          border-right: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 50;
          transition: transform 0.3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(29,29,31,0.4);
          backdrop-filter: blur(2px);
          z-index: 40;
          display: none;
        }

        .sidebar-logo {
          padding: 20px 20px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-default);
        }

        .sidebar-logo-link { display: flex; align-items: center; }
        .sidebar-logo-img { height: 28px; width: auto; }

        .sidebar-close-btn {
          display: none;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          align-items: center;
          justify-content: center;
        }
        .sidebar-close-btn:hover { color: var(--text-primary); }

        .sidebar-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-default);
          background: var(--surface-sunken);
        }

        .sidebar-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand-cyan-strong), var(--brand-pink-strong));
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: 2px solid var(--surface-card);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .sidebar-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .sidebar-avatar-initials { color: #fff; font-size: 14px; font-weight: 700; }

        .sidebar-user-info { min-width: 0; }
        .sidebar-user-name {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-email {
          color: var(--text-muted);
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.18s ease;
        }

        .sidebar-nav-item:hover {
          background: var(--surface-page);
          color: var(--text-primary);
        }

        .sidebar-nav-active {
          background: var(--surface-accent-soft);
          color: var(--brand-cyan-strong) !important;
          font-weight: 600;
          box-shadow: inset 3px 0 0 var(--brand-cyan-strong);
        }

        .sidebar-nav-icon { width: 18px; height: 18px; flex-shrink: 0; }

        .sidebar-admin-wrap {
          padding: 8px 12px;
          border-top: 1px solid var(--border-default);
        }
        .sidebar-admin-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          color: #B45309;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          background: rgba(245, 158, 11, 0.1);
          transition: all 0.18s;
        }
        .sidebar-admin-link:hover {
          background: rgba(245, 158, 11, 0.18);
          color: #92400E;
        }

        .sidebar-footer {
          padding: 12px 12px 20px;
          border-top: 1px solid var(--border-default);
        }

        .sidebar-logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #DC2626;
          font-size: 13.5px;
          font-weight: 500;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          transition: all 0.18s;
        }
        .sidebar-logout-btn:hover {
          background: rgba(220, 38, 38, 0.08);
          color: #B91C1C;
        }

        /* ── Main area ── */
        .dashboard-main {
          flex: 1;
          min-width: 0;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ── Mobile topbar (hidden on desktop) ── */
        .dashboard-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--surface-card);
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid var(--border-default);
        }

        .topbar-hamburger {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .topbar-logo { display: flex; align-items: center; }
        .topbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand-cyan-strong), var(--brand-pink-strong));
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .topbar-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .topbar-avatar-initials { color: #fff; font-size: 12px; font-weight: 700; }

        /* Vertical rhythm only — horizontal width/padding via .dash-container. */
        .dashboard-content {
          flex: 1;
          padding: 32px 0;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(-100%);
          }
          .sidebar-open {
            transform: translateX(0) !important;
          }
          .sidebar-overlay {
            display: block;
          }
          .sidebar-close-btn {
            display: flex;
          }
          .dashboard-main {
            margin-left: 0;
          }
          .dashboard-topbar {
            display: flex;
          }
          .dashboard-content {
            padding: 24px 0;
          }
        }
      `}</style>
    </div>
  );
}
