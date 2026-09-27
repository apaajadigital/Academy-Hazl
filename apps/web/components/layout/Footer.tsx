import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Clock, ArrowUpRight } from "lucide-react";

const brand = { name: "Hazl Academy" } as const;
import { waLink, WA_NUMBER_DISPLAY, CONTACT_FALLBACK_HREF } from "@/lib/config";
import { features } from "@/lib/features";

const waHref = waLink();

const footerLinks = {
  Program: [
    { label: "Katalog Kursus",    href: "/e-course" },
    { label: "Event & Workshop",  href: "/event" },
    { label: "E-Book",            href: "/ebook" },
    { label: "Kelas Gratis",      href: "/kelas-gratis" },
    { label: "Marketplace Materi", href: "/marketplace" },
    { label: "Berlangganan",      href: "/berlangganan" },
    { label: "Blog",              href: "/blog" },
    ...(features.privateClass ? [{ label: "Private Class", href: "/kelas-privat" }] : []),
    { label: "Trainer Program",   href: "/trainer-program" },
    { label: "Program Afiliasi",  href: "/afiliasi" },
    { label: "Paket LMS",         href: "/clients" },
    { label: "Kolaborasi",        href: "/kolaborasi" },
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

const socials = [
  { label: "IG", text: "Instagram", href: "https://instagram.com/jagoakademi" },
  { label: "YT", text: "YouTube", href: "https://youtube.com/@jagoakademi" },
  { label: "LI", text: "LinkedIn", href: "https://linkedin.com/company/jagoakademi" },
  { label: "X", text: "Twitter/X", href: "https://twitter.com/jagoakademi" },
];

export function Footer() {
  return (
    <footer className="w-full bg-[#FAFAFA] border-t border-[#E7E9EC] shadow-none">
      {/* Main footer */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-14">
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
            <p className="text-sm text-[#5B616E] leading-relaxed max-w-sm">
              Platform edukasi teknologi presisi tinggi untuk akselerasi karier software engineering, infrastruktur cloud, dan sistem data skala enterprise.
            </p>

            <div className="text-xs text-[#707880]">
              Terdaftar di Kementerian Hukum &amp; HAM RI
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2">
              {socials.map(({ label, text, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={text}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[#E7E9EC] text-[#5B616E] hover:text-[#0077A8] hover:border-[#0077A8] hover:bg-[#F6F7F9] transition-all text-[11px] font-bold shadow-none"
                >
                  {label}
                </a>
              ))}
            </div>

            {/* WhatsApp CTA */}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 rounded-full bg-[#0077A8] text-white text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#005D85] transition-colors shadow-none w-fit"
              >
                <MessageCircle size={15} aria-hidden="true" />
                Chat via WhatsApp
              </a>
            ) : (
              <Link
                href={CONTACT_FALLBACK_HREF}
                className="h-10 px-4 rounded-full bg-[#0077A8] text-white text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#005D85] transition-colors shadow-none w-fit"
              >
                <MessageCircle size={15} aria-hidden="true" />
                Hubungi Kami
              </Link>
            )}
          </div>

          {/* Program Column (Col-span 2) */}
          <nav aria-label="Navigasi Program" className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#707880]">
              Program &amp; Ekosistem
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {footerLinks.Program.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs sm:text-sm text-[#5B616E] hover:text-[#0077A8] transition-colors py-0.5"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Perusahaan Column */}
          <nav aria-label="Navigasi Perusahaan" className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#707880]">
              Perusahaan
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.Perusahaan.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-sm text-[#5B616E] hover:text-[#0077A8] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kontak column */}
          <nav aria-label="Navigasi Kontak" className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#707880]">
              Dukungan &amp; Kontak
            </h4>
            <ul className="space-y-2.5">
              {waHref && (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#5B616E] hover:text-[#0077A8] transition-colors group"
                  >
                    <MessageCircle size={14} aria-hidden="true" className="text-[#0077A8]" />
                    WhatsApp
                    <ArrowUpRight size={12} aria-hidden="true" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </li>
              )}
              {waHref && WA_NUMBER_DISPLAY && (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm text-[#5B616E] hover:text-[#0077A8] transition-colors"
                  >
                    {WA_NUMBER_DISPLAY}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-1.5 text-xs text-[#707880]">
                <Clock size={14} aria-hidden="true" />
                Sen–Jum, 09.00–17.00 WIB
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E7E9EC]" />

      {/* Bottom bar */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#707880]">
        <p>© 2025–2026 PT Hazl Akselerasi Indonesia. Hak cipta dilindungi.</p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-[#16181D] transition-colors">
            Kebijakan Privasi
          </Link>
          <Link href="/terms" className="hover:text-[#16181D] transition-colors">
            Syarat &amp; Ketentuan
          </Link>
          <span className="hidden md:inline text-[11px] text-[#BFC7D0]">
            Hazl Design System v1.0 • Jakarta
          </span>
        </div>
      </div>
    </footer>
  );
}
