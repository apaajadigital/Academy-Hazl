import { CalendarDays, MessageCircle, MessagesSquare, Tag, Users } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";
import { Section } from "@/components/ui/Section";
import { waLink, CONTACT_FALLBACK_HREF } from "@/lib/config";

const waLinkOrContact = (text: string): string => waLink(text) ?? CONTACT_FALLBACK_HREF;

// Falls back to /contact when WhatsApp is unconfigured — a consult CTA
// that goes nowhere is worse than one that goes to the contact form.
const WA_CONSULT_HREF = waLinkOrContact("Halo, saya ingin bergabung dengan Komunitas Hazl Academy");

// Optional WhatsApp community group link — config-only go-live switch. Only an
// https URL is honored; while unset, the lead form + admin follow-up IS the
// join flow (submissions land in the admin CRM).
const RAW_GROUP_URL = process.env.NEXT_PUBLIC_WA_COMMUNITY_GROUP;
const GROUP_URL = RAW_GROUP_URL?.startsWith("https://") ? RAW_GROUP_URL : null;

const benefits = [
  {
    icon: CalendarDays,
    title: "Sharing Session & Kelas Gratis",
    body: "Akses sharing session dan kelas gratis bulanan bersama komunitas — belajar hal baru tanpa biaya tambahan.",
  },
  {
    icon: Users,
    title: "Networking Sesama Learner",
    body: "Kenalan dan belajar bareng sesama learner dari berbagai latar belakang — saling dukung sepanjang perjalanan belajarmu.",
  },
  {
    icon: Tag,
    title: "Info Program & Diskon Lebih Dulu",
    body: "Jadi yang pertama tahu program baru, event, dan penawaran diskon khusus anggota komunitas.",
  },
  {
    icon: MessagesSquare,
    title: "Tanya-Jawab dengan Mentor",
    body: "Ajukan pertanyaan seputar materi dan karier langsung ke mentor di sesi tanya-jawab komunitas.",
  },
];

export default function KomunitasPage() {
  return (
    <>
      <LandingTemplate
        eyebrow="Komunitas"
        title={
          <>
            Gabung <span className="text-[var(--brand-cyan-strong)]">Komunitas</span> Hazl Academy
          </>
        }
        lede="Belajar bareng lebih seru. Ikut sharing session, perluas jaringan sesama learner, dan dapatkan info program lebih dulu — semuanya dimulai dari satu formulir pendaftaran."
        benefits={benefits}
        formSource="community"
        formTitle="Daftar Jadi Anggota"
        formLede="Isi data kamu — admin kami akan menghubungi untuk proses bergabung ke komunitas."
        submitLabel="Gabung Komunitas"
      />

      {/* Join CTA band — the conditional group link lives here (LeadCaptureForm's
          success state is generic), keeping go-live a config-only decision. */}
      <Section size="sm">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
            Masih ragu atau ada pertanyaan?
          </h2>
          <p className="text-base leading-relaxed text-[var(--text-secondary)]">
            {GROUP_URL
              ? "Langsung gabung ke grup WhatsApp komunitas, atau ngobrol dulu dengan tim kami."
              : "Ngobrol dulu dengan tim kami via WhatsApp — tanpa kewajiban apa pun."}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {GROUP_URL && (
              <a
                href={GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                <Users size={18} aria-hidden="true" />
                Join Grup WhatsApp
              </a>
            )}
            <a
              href={WA_CONSULT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-lg"
            >
              <MessageCircle size={18} aria-hidden="true" />
              Tanya dulu via WhatsApp
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
