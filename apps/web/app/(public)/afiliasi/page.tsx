import type { Metadata } from "next";
import { Wallet, Link2, TrendingUp, Users, ShieldCheck, Headphones } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";

export const metadata: Metadata = {
  title: "Program Afiliasi Kreator — Hazl Academy",
  description:
    "Bergabung dengan Program Afiliasi Hazl Academy. Bagikan link referal kursus Video AI, rekomendasikan tools, dan dapatkan komisi transparan dari setiap transaksi.",
  alternates: { canonical: "/afiliasi" },
  openGraph: {
    title: "Program Afiliasi Kreator — Hazl Academy",
    description: "Bagikan link referal Video AI, ajak kreator belajar, dan raih komisi berkelanjutan.",
    type: "website",
    url: "/afiliasi",
  },
};

const benefits = [
  { icon: Wallet, title: "Komisi Kompetitif & Otomatis", body: "Dapatkan bagi hasil menarik dari setiap transaksi pembelian kursus dan aset melalui link afiliasi unikmu." },
  { icon: Link2, title: "Tracking Cookie 30 Hari", body: "Sistem pelacakan referal cerdas yang memastikan setiap konversi pembelian dalam 30 hari tercatat ke akunmu." },
  { icon: TrendingUp, title: "Dashboard Analitik Real-time", body: "Pantau jumlah impresi klik, leads, status settlement, dan saldo komisi langsung dari dashboard." },
  { icon: Users, title: "Dukungan Materi Promosi", body: "Akses banner resmi, cuplikan teaser video, dan template copy promosi siap posting di media sosial." },
  { icon: ShieldCheck, title: "Pencairan Saldo Fleksibel", body: "Penarikan komisi ke seluruh rekening bank lokal dan e-wallet di Indonesia tanpa potongan tersembunyi." },
  { icon: Headphones, title: "Grup Dukungan Kreator", body: "Bimbingan strategi promosi dan update rilis kursus baru lebih awal bersama tim Hazl Academy." },
];

export default function AfiliasiPage() {
  return (
    <LandingTemplate
      eyebrow="Program Afiliasi"
      title={<>Bagikan Inspirasi <span className="text-accent">Video AI</span>, Dapatkan Komisi</>}
      lede="Ajak jejaring audiens Anda mempelajari keahlian Video AI di Hazl Academy dan nikmati pendapatan komisi berkelanjutan dari setiap pendaftaran yang berhasil."
      benefits={benefits}
      formSource="affiliate"
      formTitle="Daftar Program Afiliasi"
      formLede="Isi formulir pendaftaran mitra afiliasi — kami akan mengaktifkan link referal Anda."
    />
  );
}
