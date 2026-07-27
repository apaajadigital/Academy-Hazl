"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  BookOpen,
  Wallet,
  Star,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { getToken, setToken, clearToken, refreshAccessToken } from "@/lib/auth/token";

const NAV_ITEMS = [
  { href: "/trainer-hub", label: "Beranda", icon: Home, exact: true },
  { href: "/trainer-hub/kursus", label: "Kursus Saya", icon: BookOpen },
  { href: "/trainer-hub/payout", label: "Payout", icon: Wallet },
  { href: "/trainer-hub/ulasan", label: "Ulasan", icon: Star },
  { href: "/trainer-hub/profil", label: "Profil", icon: User },
];

type TrainerUser = { name: string; email: string; avatarUrl: string | null };

export default function TrainerHubLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [trainer, setTrainer] = useState<TrainerUser | null>(null);
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard — mirrors apps/web/app/dashboard/layout.tsx initAuth verbatim
  // (getToken → /api/auth/me → 401 refresh once → me), with the role gate
  // adapted: this shell is trainer-only. Non-trainers are bounced to /dashboard
  // (which itself re-routes admins to /admin). The backend still guards every
  // /api/trainer/* endpoint; the client must not render the trainer shell to a
  // non-trainer.
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

      // Role gate: must be a trainer, else bounce to the member dashboard.
      const roleNames: string[] = (body.data.roles ?? []).map(
        (r: { role: string } | string) => (typeof r === "string" ? r : r.role)
      );
      if (!roleNames.includes("trainer")) {
        router.replace("/dashboard");
        return;
      }

      setTrainer(body.data);
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
      <div className="th-loading">
        <span className="th-spinner" />
        <style jsx>{`
          .th-loading { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#F5F5F7; }
          .th-spinner { width:36px; height:36px; border-radius:50%; border:3px solid #0077A8; border-top-color:transparent; animation:spin 0.8s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const initials = trainer?.name
    ? trainer.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "T";

  return (
    <div className={`th-root ${collapsed ? "th-collapsed" : ""}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="th-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar ── */}
      <aside className={`th-sidebar ${sidebarOpen ? "th-sidebar-open" : ""}`}>
        {/* Brand / logo */}
        <div className="th-logo">
          {!collapsed && (
            <Link href="/trainer-hub" className="th-logo-wrap">
              <Image src="/logo.png" alt="Jago Akademi" width={32} height={32} className="th-logo-img" />
              <span className="th-brand">
                <span className="th-brand-name">Jago Akademi</span>
                <span className="th-brand-sub">Trainer Hub</span>
              </span>
            </Link>
          )}
          {/* Desktop collapse toggle */}
          <button
            className="th-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
          {/* Mobile close */}
          <button
            className="th-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="th-nav" aria-label="Menu Trainer Hub">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`th-nav-item ${isActive ? "th-nav-active" : ""}`}
                title={collapsed ? item.label : ""}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="th-nav-icon" size={18} aria-hidden="true" />
                {!collapsed && <span className="th-nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + situs utama + logout */}
        <div className="th-bottom">
          <div className="th-user-row">
            <div className="th-user-avatar">
              {trainer?.avatarUrl ? (
                <Image src={trainer.avatarUrl} alt={trainer.name} width={32} height={32} className="th-user-avatar-img" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="th-user-info">
                <p className="th-user-name">{trainer?.name}</p>
                <p className="th-user-role">Trainer</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`th-logout-btn ${collapsed ? "th-logout-btn-sm" : ""}`}
            title="Keluar"
          >
            <LogOut size={15} aria-hidden="true" />
            {!collapsed && <span>Keluar</span>}
          </button>
          <Link href="/" className={`th-back-btn ${collapsed ? "th-back-btn-sm" : ""}`} title="Kembali ke situs">
            <ArrowLeft size={15} aria-hidden="true" />
            {!collapsed && <span>Situs Utama</span>}
          </Link>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="th-main">
        {/* Mobile topbar */}
        <header className="th-topbar">
          <button
            className="th-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link href="/trainer-hub" className="th-topbar-logo">
            <Image src="/logo.png" alt="Jago Akademi" width={100} height={26} />
          </Link>
          <div className="th-topbar-avatar">
            {trainer?.avatarUrl ? (
              <Image src={trainer.avatarUrl} alt={trainer?.name ?? ""} width={32} height={32} className="th-user-avatar-img" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </header>

        <main className="th-content" id="main-content">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .th-root {
          display: flex;
          min-height: 100vh;
          background: #F5F5F7;
          font-family: 'Inter', sans-serif;
        }

        /* ── Sidebar (light) ── */
        .th-sidebar {
          width: 260px;
          min-height: 100vh;
          background: #FFFFFF;
          border-right: 1px solid #E5E5E5;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 50;
          transition: transform 0.3s ease, width 0.25s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .th-collapsed .th-sidebar { width: 72px; }

        .th-overlay {
          position: fixed;
          inset: 0;
          background: rgba(29,29,31,0.4);
          backdrop-filter: blur(2px);
          z-index: 40;
          display: none;
        }

        .th-logo {
          padding: 18px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #E5E5E5;
          min-height: 68px;
          flex-shrink: 0;
        }
        .th-logo-wrap { display: flex; align-items: center; gap: 10px; overflow: hidden; text-decoration: none; }
        .th-logo-img { height: 28px; width: auto; border-radius: 8px; flex-shrink: 0; }
        .th-brand { display: flex; flex-direction: column; white-space: nowrap; }
        .th-brand-name { font-size: 14px; font-weight: 800; color: #1D1D1F; letter-spacing: -0.01em; }
        .th-brand-sub { font-size: 10px; color: #6E6E73; font-weight: 500; margin-top: 1px; }

        .th-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: #F5F5F7; border: 1px solid #E5E5E5;
          color: #6E6E73;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.18s;
        }
        .th-collapse-btn:hover { background: #EBECEF; color: #1D1D1F; }

        .th-close-btn {
          display: none;
          color: #6E6E73;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          align-items: center;
          justify-content: center;
        }
        .th-close-btn:hover { color: #1D1D1F; }

        .th-nav {
          flex: 1;
          min-height: 0;
          padding: 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .th-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #636366;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.18s ease;
        }
        .th-nav-item:hover { background: #F5F5F7; color: #1D1D1F; }
        .th-nav-active {
          background: rgba(0, 212, 255, 0.08) !important;
          color: #0077A8 !important;
          font-weight: 600;
          box-shadow: inset 3px 0 0 #0077A8;
        }
        .th-nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .th-nav-label { flex: 1; }
        .th-collapsed .th-nav-item { justify-content: center; }

        .th-bottom {
          padding: 12px 12px 20px;
          border-top: 1px solid #E5E5E5;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }
        .th-user-row { display: flex; align-items: center; gap: 10px; padding: 4px 4px; }
        .th-user-avatar {
          width: 32px; height: 32px; border-radius: 10px;
          background: linear-gradient(135deg, #0077A8, #CC0052);
          color: white; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .th-user-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .th-user-info { overflow: hidden; min-width: 0; }
        .th-user-name { font-size: 12px; font-weight: 600; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .th-user-role { font-size: 10px; color: #6E6E73; margin-top: 1px; }

        /* Logout — red treatment mirrors the member dashboard (#DC2626) */
        .th-logout-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 10px;
          color: #DC2626; font-size: 12.5px; font-weight: 600;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.15);
          cursor: pointer; width: 100%; transition: all 0.18s;
        }
        .th-logout-btn:hover { background: rgba(220, 38, 38, 0.14); color: #B91C1C; }
        .th-logout-btn-sm { justify-content: center; }

        .th-back-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 10px;
          color: #636366; font-size: 12.5px; font-weight: 500;
          text-decoration: none; transition: all 0.18s;
          background: #F5F5F7; border: 1px solid #E5E5E5;
        }
        .th-back-btn:hover { background: #EBECEF; color: #1D1D1F; }
        .th-back-btn-sm { justify-content: center; }

        /* ── Main area ── */
        .th-main {
          flex: 1;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
          transition: margin-left 0.25s ease;
        }
        .th-collapsed .th-main { margin-left: 72px; }

        /* ── Mobile topbar (hidden on desktop) ── */
        .th-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #FFFFFF;
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid #E5E5E5;
        }
        .th-hamburger {
          background: none; border: none; color: #1D1D1F;
          cursor: pointer; padding: 4px; display: flex; align-items: center;
        }
        .th-topbar-logo { display: flex; align-items: center; }
        .th-topbar-avatar {
          width: 32px; height: 32px; border-radius: 10px;
          background: linear-gradient(135deg, #0077A8, #CC0052);
          color: white; font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }

        .th-content { flex: 1; min-width: 0; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .th-sidebar { transform: translateX(-100%); width: 260px; }
          .th-collapsed .th-sidebar { width: 260px; }
          .th-sidebar-open { transform: translateX(0) !important; }
          .th-overlay { display: block; }
          .th-collapse-btn { display: none; }
          .th-close-btn { display: flex; }
          .th-main, .th-collapsed .th-main { margin-left: 0; }
          .th-topbar { display: flex; }
        }
      `}</style>
    </div>
  );
}
