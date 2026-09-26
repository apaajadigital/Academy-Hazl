import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Clock, ArrowUpRight } from "lucide-react";
// Provisional literal (was `@repo/brand`, reverted for this deploy — package
// isn't finished/committed yet). Value matches packages/brand/src/index.ts.
const brand = { name: "Hazl Academy" } as const;
import { waLink, WA_NUMBER_DISPLAY, CONTACT_FALLBACK_HREF } from "@/lib/config";
import { features } from "@/lib/features";

// Resolved once at module scope: waLink() reads a build-time inlined constant,
// so the answer cannot change between renders.
const waHref = waLink();

const footerLinks = {
  Belajar: [
    { label: "Katalog Kursus",    href: "/e-course" },
    { label: "Event & Workshop",  href: "/event" },
    { label: "E-Book",            href: "/ebook" },
    { label: "Kelas Gratis",      href: "/kelas-gratis" },
    { label: "Marketplace Materi", href: "/marketplace" },
    // /berlangganan was unreachable from any public surface: its only inbound
    // links were post-login (/dashboard/berlangganan) and SubscriptionLock, which
    // itself sits behind the default-OFF learningPath flag. A public pricing page
    // no visitor can find is a dead funnel.
    { label: "Berlangganan",      href: "/berlangganan" },
    { label: "Blog",              href: "/blog" },
  ],
  Program: [
    // Only surfaced once the private-class catalog ships (flag is build-time).
    ...(features.privateClass ? [{ label: "Private Class", href: "/kelas-privat" }] : []),
    { label: "Trainer Program",  href: "/trainer-program" },
    { label: "Program Afiliasi", href: "/afiliasi" },
    { label: "Paket LMS",        href: "/clients" },
    { label: "Kolaborasi",       href: "/kolaborasi" },
    // Community links — each only surfaces once its feature ships (build-time flags).
    ...(features.community ? [{ label: "Komunitas", href: "/komunitas" }] : []),
    ...(features.alumni ? [{ label: "Cerita Alumni", href: "/alumni" }] : []),
    ...(features.portfolio ? [{ label: "Portofolio Member", href: "/portofolio-member" }] : []),
  ],
  Perusahaan: [
    { label: "Tentang Kami",  href: "/about" },
    { label: "Hubungi Kami",  href: "/contact" },
    { label: "FAQ",           href: "/faq" },
  ],
};

// lucide v1.21 ships no brand-social glyphs (per REDESIGN_ICON_MAP "do not port"
// note), so the social chips use the short text mark. hrefs preserved.
const socials = [
  { label: "IG", text: "Instagram", href: "https://instagram.com/jagoakademi" },
  { label: "YT", text: "YouTube", href: "https://youtube.com/@jagoakademi" },
  { label: "LI", text: "LinkedIn", href: "https://linkedin.com/company/jagoakademi" },
  { label: "X", text: "Twitter/X", href: "https://twitter.com/jagoakademi" },
];

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-surface-sunken">
      {/* Main footer */}
      <div className="container-pad py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="inline-flex">
              <div className="relative w-36 h-10">
                <Image
                  src="/logo.png"
                  alt={brand.name}
                  fill
                  sizes="144px"
                  className="object-contain object-left"
                />
              </div>
            </Link>
            {/*
              BL-23: two unearned claims removed from a block that renders on
              EVERY page, which makes it the widest-reaching copy in the app:
              "terlengkap Indonesia" (an unprovable superlative) and "ribuan
              profesional" (a headcount the platform does not have).
            */}
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
              Platform edukasi digital Indonesia. Belajar, berlatih, dan
              kembangkan kariermu.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-2.5">
              {socials.map(({ label, text, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={text}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-border-default text-text-secondary hover:text-accent-cyan-strong hover:border-border-brand hover:bg-surface-accent-soft transition-all duration-200 text-[11px] font-bold shadow-e1"
                >
                  {label}
                </a>
              ))}
            </div>

            {/* WhatsApp CTA — hidden entirely when no number is configured.
                A dead wa.me link is worse than no button: it looks like a
                working channel and silently drops the enquiry. */}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 btn-sm w-fit"
              >
                <MessageCircle size={16} aria-hidden="true" />
                Chat via WhatsApp
              </a>
            ) : (
              <Link
                href={CONTACT_FALLBACK_HREF}
                className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 btn-sm w-fit"
              >
                <MessageCircle size={16} aria-hidden="true" />
                Hubungi Kami
              </Link>
            )}
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <nav key={category} aria-label={`Navigasi ${category}`} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-accent-cyan-strong transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Kontak column */}
          <nav aria-label="Navigasi Kontak" className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Kontak
            </h4>
            <ul className="space-y-2.5">
              {waHref && (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-cyan-strong transition-colors group"
                  >
                    <MessageCircle size={15} aria-hidden="true" className="text-accent-cyan-strong" />
                    WhatsApp
                    <ArrowUpRight size={13} aria-hidden="true" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </li>
              )}
              {waHref && WA_NUMBER_DISPLAY && (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-accent-cyan-strong transition-colors"
                  >
                    {WA_NUMBER_DISPLAY}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-1.5 text-sm text-text-muted">
                <Clock size={15} aria-hidden="true" />
                Sen–Jum, 09.00–17.00 WIB
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Divider */}
      <div className="divider-gradient" />

      {/* Bottom bar */}
      <div className="container-pad py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          © 2025–2026 {brand.name}. Hak cipta dilindungi.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            Kebijakan Privasi
          </Link>
          <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            Syarat & Ketentuan
          </Link>
        </div>
      </div>
    </footer>
  );
}
