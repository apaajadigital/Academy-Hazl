import type { Metadata } from "next";
import { Users, Handshake, Building2, CalendarDays, Globe, TrendingUp } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";

export const metadata: Metadata = {
  title: "Kolaborasi — Hazl Academy",
  description:
    "Bergabunglah sebagai mitra Hazl Academy. Kolaborasi terbuka untuk institusi pendidikan, kreator konten, komunitas belajar, dan event organizer.",
  alternates: { canonical: "/kolaborasi" },
  openGraph: {
    title: "Kolaborasi dengan Hazl Academy",
    description: "Terbuka untuk institusi, kreator, komunitas, dan EO. Daftarkan minat kolaborasi Anda.",
    type: "website",
    url: "/kolaborasi",
  },
};

const benefits = [
  {
    icon: Building2,
    title: "Institusi Pendidikan",
    body: "Kampus, sekolah, dan lembaga pelatihan yang ingin memperluas akses konten edukasi berkualitas untuk peserta didik mereka.",
  },
  {
    icon: Users,
    title: "Kreator Konten",
    body: "Instruktur, dosen, dan praktisi yang ingin mempublish kursus, e-book, atau rekaman workshop ke platform Hazl Academy.",
  },
  {
    icon: Globe,
    title: "Komunitas Belajar",
    body: "Komunitas profesi, alumni, atau minat yang ingin mengadakan program pelatihan eksklusif bagi anggota mereka.",
  },
  {
    icon: CalendarDays,
    title: "Event Organizer",
    body: "EO dan panitia workshop yang ingin menjual tiket, merekam event, dan mendistribusikan materi kepada peserta.",
  },
  {
    icon: Handshake,
    title: "Mitra Korporat",
    body: "Perusahaan yang ingin menyediakan program LMS internal, pelatihan karyawan, atau program CSR pendidikan.",
  },
  {
    icon: TrendingUp,
    title: "Afiliasi & Reseller",
    body: "Individu atau tim yang ingin memonetisasi jaringan mereka dengan mempromosikan produk dan program Hazl Academy.",
  },
];

export default function KolaborasiPage() {
  return (
    <LandingTemplate
      eyebrow="Kolaborasi"
      title={<>Bersama Kita <span className="text-[var(--brand-cyan-strong)]">Lebih Jauh</span></>}
      lede="Hazl Academy terbuka untuk berbagai bentuk kemitraan — dari institusi pendidikan, kreator konten, komunitas belajar, hingga mitra korporat. Mari bangun ekosistem belajar yang lebih luas bersama."
      benefits={benefits}
      formSource="other"
      formTitle="Daftarkan Minat Anda"
      formLede="Tim kami akan menghubungi Anda dalam 1–2 hari kerja untuk membahas peluang kemitraan."
      withCompany
      submitLabel="Daftar Kolaborasi"
    />
  );
}
