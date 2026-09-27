"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Trophy, GraduationCap, ArrowLeft, Settings } from "lucide-react";
import { Avatar } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Props = {
  slug: string;
  /** Tenant branding, resolved server-side by the portal layout. */
  name: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

/** One entry of `/api/lms/portal/me` — the caller's tenant memberships. */
type PortalMembership = {
  slug: string;
  /** True when the caller administers this tenant. */
  isAdmin?: boolean;
};

export default function PortalSidebar({ slug, name, logoUrl, primaryColor }: Props) {
  const pathname = usePathname();
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);

  // The admin console and the course player each render their own full-screen
  // shell with its own navigation. Painting this rail beside them would stack
  // two sidebars, so they keep their existing chrome.
  const hasOwnShell =
    pathname.startsWith(`/lms/${slug}/admin`) || pathname.startsWith(`/lms/${slug}/courses/`);

  useEffect(() => {
    if (hasOwnShell) return;
    let cancelled = false;

    const probeAdmin = async () => {
      try {
        const token = await getValidToken();
        // Unauthenticated visitors are bounced by the pages themselves; the rail
        // simply stays non-admin instead of redirecting from the layout.
        if (!token) return;
        const res = await fetch("/api/lms/portal/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const membership: PortalMembership | undefined = data.data?.find(
          (t: PortalMembership) => t.slug === slug,
        );
        // `/api/lms/portal/me` reports `isAdmin` per tenant (derived from the same
        // UserRole rows `requireLmsAdmin` checks). Compare strictly so an older API
        // response omitting the field hides the console link instead of offering
        // one that would land on a 403.
        if (!cancelled) setIsTenantAdmin(membership?.isAdmin === true);
      } catch {
        // A failed probe must not break navigation — keep the console link hidden.
      }
    };

    void probeAdmin();
    return () => {
      cancelled = true;
    };
  }, [slug, hasOwnShell]);

  if (hasOwnShell) return null;

  const navItems = [
    { href: `/lms/${slug}`,              icon: Home,     label: "Kursus Saya" },
    { href: `/lms/${slug}/certificates`, icon: Trophy,   label: "Sertifikat" },
    // The admin console is otherwise unreachable by click. It is appended only
    // for confirmed admins — showing it to an employee would promise a page the
    // API answers with 403.
    ...(isTenantAdmin
      ? [{ href: `/lms/${slug}/admin`, icon: Settings, label: "Konsol Admin" }]
      : []),
  ];

  return (
    <aside className="sticky top-0 flex min-h-screen w-64 flex-shrink-0 flex-col border-r border-border-default bg-surface-card">
      {/* Company brand — tenant logo + name (white-label branding hook) */}
      <div className="border-b border-border-default px-4 py-5">
        <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3">
          <Avatar
            src={logoUrl ?? undefined}
            name={name ?? slug}
            size="md"
            className="rounded-xl border-0"
            style={logoUrl ? undefined : { background: primaryColor, color: "#ffffff" }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">{name ?? slug}</p>
            <p className="text-[11px] text-text-secondary">LMS Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3">
        {navItems.map(({ href, icon: Icon, label }) => {
          // Read from usePathname, not window.location: the rail now lives in the
          // layout and survives sub-route navigation, so a one-shot window read
          // would leave the highlight stuck on the entry page.
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: isActive ? `${primaryColor}15` : "transparent",
                color: isActive ? primaryColor : "var(--text-secondary)",
              }}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Back links */}
      <div className="flex flex-col gap-2 border-t border-border-default px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[11px] text-text-secondary transition-colors hover:text-accent-cyan-strong"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[11px] text-text-muted transition-colors hover:text-accent-cyan-strong"
        >
          <GraduationCap size={13} aria-hidden="true" />
          Hazl Academy
        </Link>
      </div>
    </aside>
  );
}
