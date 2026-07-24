import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui";
import ContactForm from "./ContactForm";
import { WA_NUMBER_DISPLAY, waLink } from "@/lib/config";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Ada pertanyaan atau ingin berkolaborasi? Hubungi tim Jago Akademi melalui form, email, atau WhatsApp.",
};

const CONTACTS = [
  {
    icon: <Mail size={20} aria-hidden="true" />,
    label: "Email",
    value: "halo@jagoakademi.com",
    href: "mailto:halo@jagoakademi.com",
  },
  {
    icon: <MessageCircle size={20} aria-hidden="true" />,
    label: "WhatsApp",
    value: WA_NUMBER_DISPLAY,
    href: waLink(),
  },
  {
    icon: <MapPin size={20} aria-hidden="true" />,
    label: "Alamat",
    value: "Jakarta Selatan, DKI Jakarta",
    href: null,
  },
];

export default function ContactPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface-page pt-20 pb-16">
        {/* Decorative gradient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-cyan-strong/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-purple/10 blur-3xl"
        />
        <div className="container-pad relative text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-pink-strong">Kontak</p>
            <h1 className="text-4xl font-bold text-text-primary md:text-5xl">Hubungi Kami</h1>
            <p className="text-text-secondary">
              Tim kami siap membantu Anda dari Senin–Jumat pukul 09.00–17.00 WIB.
            </p>
          </div>
        </div>
      </section>

      {/* 2-column: contact info + message form */}
      <section className="bg-surface-card section-sm">
        <div className="container-pad">
          <div className="mx-auto grid max-w-5xl items-start gap-12 md:grid-cols-2">
            {/* Info */}
            <div className="space-y-6">
              <Card className="p-6 md:p-8">
                <h2 className="mb-6 text-xl font-bold text-text-primary">Informasi Kontak</h2>
                <ul className="space-y-5">
                  {CONTACTS.map((c) => (
                    <li key={c.label} className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-accent-soft text-accent-cyan-strong">
                        {c.icon}
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">{c.label}</p>
                        {c.href ? (
                          <a
                            href={c.href}
                            className="font-medium text-text-primary transition-colors hover:text-accent-cyan-strong"
                          >
                            {c.value}
                          </a>
                        ) : (
                          <p className="font-medium text-text-primary">{c.value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Prominent WhatsApp CTA */}
                <a
                  href={waLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#16A34A] px-5 py-3.5 font-semibold text-white shadow-e1 transition-opacity hover:opacity-90"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  Chat via WhatsApp
                </a>
              </Card>

              <div className="space-y-3 rounded-2xl bg-surface-page p-6">
                <h3 className="font-semibold text-text-primary">Butuh solusi korporat?</h3>
                <p className="text-sm text-text-secondary">
                  Tim sales kami siap membantu Anda merancang program pelatihan yang tepat untuk organisasi Anda.
                </p>
                <a href="/clients" className="text-sm font-medium text-accent-cyan-strong hover:underline">
                  Lihat paket korporat →
                </a>
              </div>
            </div>

            {/* Form */}
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
