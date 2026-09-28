import type { Metadata } from "next";
import { OG_IMAGE_FALLBACK } from "@/lib/seo";
import { Users, Handshake, Building2, CalendarDays, Globe, TrendingUp } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";

export const metadata: Metadata = {
  title: "Kolaborasi Mitra & Ekosistem — Hazl Academy",
  description:
    "Bergabunglah sebagai mitra Hazl Academy. Kolaborasi terbuka untuk studio produksi, creative agency, instruktur Video AI, institusi pendidikan, dan korporat.",
  alternates: { canonical: "/kolaborasi" },
  openGraph: {
    ...OG_IMAGE_FALLBACK,
    title: "Kolaborasi dengan Hazl Academy",
    description: "Terbuka untuk studio, kreator Video AI, komunitas visual, dan korporat. Daftarkan minat kemitraan Anda.",
    type: "website",
    url: "/kolaborasi",
  },
};

const benefits = [
  {
    icon: Building2,
    title: "Production House & Agensi",
    body: "Kolaborasi talent pool kreator Video AI bersertifikat untuk percepatan produksi iklan komersial, storyboard, dan aset UGC.",
  },
  {
    icon: Users,
    title: "Kreator & Prompt Engineer",
    body: "Instruktur dan praktisi visual AI yang ingin menerbitkan kursus, workflow pack, atau mengadakan workshop berbayar di Hazl Academy.",
  },
  {
    icon: Globe,
    title: "Komunitas Kreatif & Visual AI",
    body: "Komunitas desain, film, dan multimedia yang ingin mengadakan program kurikulum eksklusif atau kompetisi prompt show.",
  },
  {
    icon: CalendarDays,
    title: "Event & Webinar Organizer",
    body: "Penyelenggara festival kreatif yang ingin menjual tiket terintegrasi, live broadcast studio, dan distribusi sertifikat digital ber-QR.",
  },
  {
    icon: Handshake,
    title: "Mitra Korporat & Enterprise",
    body: "Perusahaan yang ingin mengadopsi generative AI workflow untuk efisiensi tim marketing dan multimedia internal.",
  },
  {
    icon: TrendingUp,
    title: "Afiliasi & Creative Reseller",
    body: "Kreator konten yang ingin memonetisasi rekomendasi tools dan modul belajar Hazl Academy dengan komisi kompetitif.",
  },
];

export default function KolaborasiPage() {
  return (
    <LandingTemplate
      eyebrow="Program Kemitraan"
      title={<>Bangun Masa Depan <span className="text-[var(--brand-cyan-strong)]">Video AI</span> Bersama</>}
      lede="Hazl Academy membuka peluang kolaborasi seluas-luasnya bagi studio produksi, kreator konten generative AI, institusi, hingga mitra korporasi. Mari kembangkan standar industri konten visual AI di Indonesia."
      benefits={benefits}
      formSource="other"
      formTitle="Daftarkan Minat Kemitraan"
      formLede="Tim partnership kami akan menghubungi Anda dalam 1–2 hari kerja untuk eksplorasi sinergi kolaborasi."
      withCompany
      submitLabel="Kirim Formulir Kolaborasi"
    />
  );
}
