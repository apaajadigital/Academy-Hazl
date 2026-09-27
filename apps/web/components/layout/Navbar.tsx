"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Sparkles } from "lucide-react";

const brand = { name: "Hazl Academy" } as const;
import { cn } from "@/lib/utils";
import { features } from "@/lib/features";
import { useAuthSession } from "@/lib/auth/useAuthSession";

// Community-group items — each link only surfaces once its feature ships
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

const navLinks = [
  { label: "E-Course", href: "/e-course" },
  { label: "Event", href: "/event" },
  {
    label: "Produk",
    href: "#",
    children: [
      { label: "E-Book",             href: "/ebook",           desc: "Buku digital berkualitas" },
      { label: "Kelas Gratis",       href: "/kelas-gratis",    desc: "Mulai belajar tanpa biaya" },
      ...(features.privateClass
        ? [{ label: "Private Class", href: "/kelas-privat", desc: "Mentoring intensif bareng mentor" }]
        : []),
      { label: "Trainer Program",    href: "/trainer-program", desc: "Jadilah trainer profesional" },
      { label: "Paket LMS",          href: "/clients",         desc: "LMS untuk institusi & perusahaan" },
      { label: "Marketplace Materi", href: "/marketplace",     desc: "Etalase materi digital praktisi" },
    ],
  },
  ...(komunitasChildren.length > 0
    ? [{ label: "Komunitas", href: "#", children: komunitasChildren }]
    : []),
  { label: "Blog", href: "/blog" },
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
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
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
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-200 border-b",
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-[#E7E9EC] shadow-sm"
            : "bg-white border-[#E7E9EC]"
        )}
      >
        <nav className="max-w-[1440px] mx-auto px-6 lg:px-8 flex items-center justify-between h-16" aria-label="Navigasi utama">
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
                      "flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors",
                      activeDropdown === link.label
                        ? "text-[#0077A8] bg-[#EDEDF4]"
                        : "text-[#5B616E] hover:text-[#16181D] hover:bg-[#F6F7F9]"
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
                      <div className="bg-white border border-[#E7E9EC] rounded-xl shadow-lg min-w-[240px] p-2">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className="flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-[#F6F7F9] transition-colors group"
                          >
                            <span className="text-xs sm:text-sm font-semibold text-[#16181D] group-hover:text-[#0077A8] transition-colors">
                              {child.label}
                            </span>
                            <span className="text-[11px] text-[#707880]">{child.desc}</span>
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
                      "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors",
                      pathname.startsWith(link.href) && link.href !== "#"
                        ? "text-[#0077A8] bg-[#EDEDF4]"
                        : "text-[#5B616E] hover:text-[#16181D] hover:bg-[#F6F7F9]"
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
            <Link
              href="/kolaborasi"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#5B616E] hover:text-[#0077A8] transition-colors"
            >
              <Sparkles size={14} aria-hidden="true" />
              Kolaborasi
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-full bg-[#0077A8] text-white text-xs sm:text-sm font-semibold hover:bg-[#005D85] transition-colors shadow-none"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  aria-label="Profil saya"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-[#EDEDF4] border border-[#E7E9EC] text-[#16181D] text-xs font-bold hover:border-[#0077A8] transition-colors"
                >
                  {userInitials}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/masuk"
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium text-[#16181D] hover:text-[#0077A8] transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  className="px-5 py-2 rounded-full bg-[#36BDF2] text-[#16181D] text-xs sm:text-sm font-semibold hover:bg-[#72D2FF] active:scale-[0.99] transition-all shadow-none"
                >
                  Mulai Belajar Sekarang
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
            className="md:hidden p-2 rounded-lg text-[#5B616E] hover:text-[#16181D] hover:bg-[#F6F7F9] transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <>
          <div
            className="md:hidden fixed top-16 left-0 right-0 bottom-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setIsMobileOpen(false)}
          />
          <div
            id={mobileMenuId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi mobile"
            className="md:hidden fixed top-16 right-0 bottom-0 z-50 w-[86%] max-w-sm bg-white shadow-xl flex flex-col overflow-y-auto border-l border-[#E7E9EC]"
          >
            <div className="flex-1 px-5 py-6 space-y-1">
              {navLinks.map((link) =>
                link.children ? (
                  <div key={link.label} className="pt-2">
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#707880]">
                      {link.label}
                    </p>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 rounded-lg text-sm text-[#5B616E] hover:text-[#0077A8] hover:bg-[#F6F7F9] transition-colors"
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
                      "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname.startsWith(link.href) && link.href !== "#"
                        ? "text-[#0077A8] bg-[#EDEDF4]"
                        : "text-[#5B616E] hover:text-[#16181D] hover:bg-[#F6F7F9]"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}

              <Link
                href="/kolaborasi"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#5B616E] hover:text-[#0077A8] hover:bg-[#F6F7F9] transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <Sparkles size={15} aria-hidden="true" />
                Kolaborasi
              </Link>
            </div>

            <div className="px-5 py-5 border-t border-[#E7E9EC] flex flex-col gap-2">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="h-10 px-4 rounded-full bg-[#0077A8] text-white text-sm font-semibold flex items-center justify-center hover:bg-[#005D85] transition-colors"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Dashboard Saya
                </Link>
              ) : (
                <>
                  <Link
                    href="/masuk"
                    className="h-10 px-4 rounded-full border border-[#E7E9EC] text-[#16181D] text-sm font-medium flex items-center justify-center hover:bg-[#F6F7F9] transition-colors"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/daftar"
                    className="h-10 px-4 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-semibold flex items-center justify-center hover:bg-[#72D2FF] transition-colors"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Mulai Belajar Sekarang
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
