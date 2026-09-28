"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { features } from "@/lib/features";
import { useAuthSession } from "@/lib/auth/useAuthSession";

const brand = { name: "Hazl Academy" } as const;

// Community-group items — each link only surfaces once its feature ships
// (flags are build-time). Empty array = the whole dropdown is omitted.
const komunitasChildren = [
  ...(features.community
    ? [{ label: "Komunitas", href: "/komunitas", desc: "Bergabung dengan komunitas belajar" }]
    : []),
  ...(features.alumni
    ? [{ label: "Alumni", href: "/alumni", desc: "Cerita nyata dari alumni kami" }]
    : []),
  ...(features.portfolio
    ? [{ label: "Portofolio Member", href: "/portofolio-member", desc: "Karya nyata member komunitas" }]
    : []),
];

// Produk-group items — same "empty children = omit the whole dropdown" rule as
// the Komunitas group below, so a fully-scoped-down build doesn't leave a
// "Produk" menu that opens to nothing.
const produkChildren = [
  { label: "E-Book",             href: "/ebook",           desc: "Buku digital berkualitas" },
  { label: "Kelas Gratis",       href: "/kelas-gratis",    desc: "Mulai belajar tanpa biaya" },
  // Only surfaced once the private-class catalog ships (flag is build-time).
  ...(features.privateClass
    ? [{ label: "Private Class", href: "/kelas-privat", desc: "Mentoring intensif bareng mentor" }]
    : []),
  ...(features.trainerProgram
    ? [{ label: "Trainer Program", href: "/trainer-program", desc: "Jadilah trainer profesional" }]
    : []),
  ...(features.clients
    ? [{ label: "Paket LMS", href: "/clients", desc: "LMS untuk institusi & perusahaan" }]
    : []),
  // desc must match real inventory — the page lists e-books, not event recordings.
  ...(features.marketplace
    ? [{ label: "Marketplace Materi", href: "/marketplace", desc: "Etalase materi digital praktisi" }]
    : []),
];

const navLinks = [
  { label: "E-Course", href: "/e-course" },
  { label: "Event", href: "/event" },
  ...(produkChildren.length > 0
    ? [{ label: "Produk", href: "#", children: produkChildren }]
    : []),
  // The Komunitas dropdown only renders when at least one community feature is on.
  ...(komunitasChildren.length > 0
    ? [{ label: "Komunitas", href: "#", children: komunitasChildren }]
    : []),
  ...(features.blog ? [{ label: "Blog", href: "/blog" }] : []),
  { label: "Tentang", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isLoggedIn, user } = useAuthSession();
  const userInitials = useMemo(() => {
    const name = user?.name ?? "";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
  }, [user]);
  const mobileMenuId = "mobile-nav-menu";
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setIsMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openDropdown = useCallback((label: string) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActiveDropdown(label);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  }, []);

  // Hidden on checkout/payment pages
  if (pathname?.startsWith("/checkout") || pathname?.startsWith("/payment")) {
    return null;
  }

  return (
    <>
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md",
        isScrolled
          ? "bg-white/85 border-b border-border-default shadow-e2"
          : "bg-white/70 border-b border-transparent"
      )}
    >
      <nav className="container-pad flex items-center justify-between h-16 md:h-[4.5rem]" aria-label="Navigasi utama">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative w-32 h-9">
            <Image
              src="/logo.png"
              alt={brand.name}
              fill
              sizes="128px"
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {navLinks.map((link) =>
            link.children ? (
              <li
                key={link.label}
                className="relative"
                onMouseEnter={() => openDropdown(link.label)}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === link.label}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === link.label ? null : link.label)
                  }
                  onFocus={() => openDropdown(link.label)}
                  onBlur={scheduleClose}
                  className={cn(
                    "flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-medium transition-colors",
                    activeDropdown === link.label
                      ? "text-accent-cyan-strong bg-surface-accent-soft"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-sunken"
                  )}
                >
                  {link.label}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={cn(
                      "transition-transform duration-200",
                      activeDropdown === link.label && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown */}
                {activeDropdown === link.label && (
                  <div
                    role="menu"
                    className="absolute top-full left-0 pt-2"
                    onMouseEnter={() => openDropdown(link.label)}
                    onMouseLeave={scheduleClose}
                    onFocus={() => openDropdown(link.label)}
                    onBlur={scheduleClose}
                  >
                    <div className="card-glow min-w-[240px] p-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          role="menuitem"
                          className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl hover:bg-surface-accent-soft transition-colors group"
                        >
                          <span className="text-sm font-semibold text-text-primary group-hover:text-accent-cyan-strong transition-colors">
                            {child.label}
                          </span>
                          <span className="text-xs text-text-muted">{child.desc}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ) : (
              <li key={link.label}>
                <Link
                  href={link.href}
                  aria-current={pathname.startsWith(link.href) && link.href !== "#" ? "page" : undefined}
                  className={cn(
                    "px-3.5 py-2 rounded-full text-sm font-medium transition-colors",
                    pathname.startsWith(link.href) && link.href !== "#"
                      ? "text-accent-cyan-strong bg-surface-accent-soft"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-sunken"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            )
          )}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {features.trainerHub && (
            <Link
              href="/kolaborasi"
              className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-accent-cyan-strong transition-colors"
            >
              <Sparkles size={14} aria-hidden="true" />
              Kolaborasi
            </Link>
          )}
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 btn-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard"
                aria-label="Profil saya"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-gradient text-white text-xs font-bold shadow-e1 hover:opacity-90 transition-opacity"
              >
                {userInitials}
              </Link>
            </>
          ) : (
            <>
              <Link href="/masuk" className="btn btn-outline btn-sm">
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 btn-sm"
              >
                Mulai Gratis
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={isMobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMobileOpen}
          aria-controls={mobileMenuId}
          className="md:hidden p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </nav>
    </header>

    {/* Mobile drawer (gap G8 — slide-in nav). Rendered OUTSIDE <header> so the
        header's backdrop-blur (which establishes a containing block for fixed
        descendants) can't clip the full-height fixed drawer. */}
    {isMobileOpen && (
        <>
          {/* Scrim */}
          <div
            className="md:hidden fixed top-16 left-0 right-0 bottom-0 z-40 bg-[#1D1D1F]/40 backdrop-blur-sm animate-overlay-in"
            aria-hidden="true"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Panel */}
          <div
            id={mobileMenuId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi mobile"
            className="md:hidden fixed top-16 right-0 bottom-0 z-50 w-[86%] max-w-sm bg-white shadow-e4 flex flex-col overflow-y-auto animate-drawer-in"
          >
            <div className="flex-1 px-5 py-6 space-y-1">
              {navLinks.map((link) =>
                link.children ? (
                  <div key={link.label} className="pt-2">
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      {link.label}
                    </p>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-accent-cyan-strong hover:bg-surface-accent-soft transition-colors"
                        onClick={() => setIsMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    aria-current={pathname.startsWith(link.href) && link.href !== "#" ? "page" : undefined}
                    className={cn(
                      "block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      pathname.startsWith(link.href) && link.href !== "#"
                        ? "text-accent-cyan-strong bg-surface-accent-soft"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-sunken"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}

              {features.trainerHub && (
                <Link
                  href="/kolaborasi"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-accent-cyan-strong hover:bg-surface-accent-soft transition-colors"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Sparkles size={15} aria-hidden="true" />
                  Kolaborasi
                </Link>
              )}
            </div>

            <div className="px-5 py-5 border-t border-border-default flex flex-col gap-2">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 w-full justify-center"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Dashboard Saya
                </Link>
              ) : (
                <>
                  <Link href="/masuk" className="btn btn-outline w-full justify-center" onClick={() => setIsMobileOpen(false)}>
                    Masuk
                  </Link>
                  <Link
                    href="/daftar"
                    className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 w-full justify-center"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Mulai Gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
