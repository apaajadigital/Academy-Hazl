import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Clock, ShieldCheck, Headphones } from "lucide-react";
import { Card } from "@/components/ui";
import ContactForm from "./ContactForm";
import { WA_NUMBER_DISPLAY, waLink } from "@/lib/config";

const waHref = waLink();

export const metadata: Metadata = {
  title: "Hubungi Kami — Hazl Academy",
  description:
    "Ada pertanyaan seputar kursus Video AI, akses workspace, atau kemitraan korporasi? Hubungi tim Hazl Academy melalui formulir, email, atau WhatsApp.",
};

const CONTACTS = [
  {
    icon: <Mail size={20} aria-hidden="true" />,
    label: "Email Resmi",
    value: "halo@hazl.academy",
    href: "mailto:halo@hazl.academy",
  },
  ...(waHref && WA_NUMBER_DISPLAY
    ? [
        {
          icon: <MessageCircle size={20} aria-hidden="true" />,
          label: "WhatsApp Support (24/7 CS)",
          value: WA_NUMBER_DISPLAY,
          href: waHref,
        },
      ]
    : []),
  {
    icon: <MapPin size={20} aria-hidden="true" />,
    label: "Kantor Operasional",
    value: "Menara Cakrawala Lt. 12, Jl. M.H. Thamrin No. 9, Jakarta Pusat 10340",
    href: null,
  },
  {
    icon: <Clock size={20} aria-hidden="true" />,
    label: "Jam Pelayanan Konsultasi",
    value: "Senin – Jumat: 09.00 – 18.00 WIB",
    href: null,
  },
];

const TRUST_METRICS = [
  {
    icon: Headphones,
    title: "Respon < 15 Menit",
    desc: "Bantuan teknis via WhatsApp pada jam operasional kerja.",
  },
  {
    icon: ShieldCheck,
    title: "Kerahasiaan Terjamin",
    desc: "Data profil dan invoice dienkripsi standar ISO/IEC 27001.",
  },
];

export default function ContactPage() {
  return (
    <main id="main-content" className="bg-surface-page min-h-screen">
      {/* Hero Header */}
      <section className="relative border-b border-border-default bg-white py-16 md:py-20">
        <div className="container-pad relative text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3.5 py-1 text-xs font-semibold text-accent-cyan-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan-strong animate-pulse" />
              PUSAT LAYANAN & DOKUMENTASI
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              Hubungi Tim <span className="text-accent-cyan-strong">Hazl Academy</span>
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-text-secondary">
              Punya pertanyaan mengenai materi Video AI, sertifikasi terverifikasi, atau kebutuhan pelatihan korporasi tim Anda? Kami siap membantu.
            </p>
          </div>
        </div>
      </section>

      {/* 2-column: contact info + message form */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="mx-auto grid max-w-5xl items-start gap-8 lg:grid-cols-12">
            {/* Info Column (5 cols) */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-2xl border border-border-default bg-white p-6 md:p-8 shadow-sm">
                <h2 className="mb-6 text-lg font-bold text-text-primary">Informasi Kontak Resmi</h2>
                <ul className="space-y-6">
                  {CONTACTS.map((c) => (
                    <li key={c.label} className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-default bg-surface-page text-accent-cyan-strong">
                        {c.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{c.label}</p>
                        {c.href ? (
                          <a
                            href={c.href}
                            className="mt-0.5 block text-sm font-semibold text-text-primary transition-colors hover:text-accent-cyan-strong"
                          >
                            {c.value}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-sm font-medium text-text-primary">{c.value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* WhatsApp button */}
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#16A34A] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#15803D]"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    Chat Langsung via WhatsApp
                  </a>
                )}
              </div>

              {/* Trust Metric Badges */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {TRUST_METRICS.map((tm) => {
                  const Icon = tm.icon;
                  return (
                    <div
                      key={tm.title}
                      className="flex items-start gap-3.5 rounded-xl border border-border-default bg-white p-4 text-left"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-accent-soft text-accent-cyan-strong">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{tm.title}</p>
                        <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">{tm.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* B2B callout */}
              <div className="rounded-2xl border border-border-default bg-white p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">Kemitraan Korporasi</p>
                <h3 className="mt-1 font-bold text-text-primary">Pelatihan Tim Kreatif Perusahaan</h3>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  Tingkatkan efisiensi produksi video agensi dan brand Anda dengan modul kurikulum Video AI terstruktur.
                </p>
                <a
                  href="/clients"
                  className="mt-4 inline-flex items-center text-xs font-semibold text-accent-cyan-strong hover:underline"
                >
                  Lihat Solusi B2B LMS →
                </a>
              </div>
            </div>

            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
