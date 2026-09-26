import type { Metadata } from "next";
import { Wallet, Link2, TrendingUp, Users, ShieldCheck, Headphones } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";

export const metadata: Metadata = {
  title: "Program Afiliasi — Hasilkan Komisi Bersama Jago Akademi",
  description:
    "Bergabung dengan Program Afiliasi Jago Akademi. Bagikan link, ajak orang belajar, dan dapatkan komisi dari setiap transaksi. Daftar minat sekarang.",
  alternates: { canonical: "/afiliasi" },
  openGraph: {
    title: "Program Afiliasi Jago Akademi",
    description: "Bagikan link, ajak belajar, dapatkan komisi. Daftar minat sekarang.",
    type: "website",
    url: "/afiliasi",
  },
};

const benefits = [
  { icon: Wallet, title: "Komisi berkelanjutan", body: "Dapatkan komisi dari setiap transaksi yang berasal dari link afiliasimu." },
  { icon: Link2, title: "Link & tracking mudah", body: "Satu link unik untuk melacak setiap klik dan konversi secara transparan." },
  { icon: TrendingUp, title: "Dashboard performa", body: "Pantau klik, konversi, dan pendapatan langsung dari dashboard afiliasi." },
  { icon: Users, title: "Cocok untuk siapa saja", body: "Kreator, komunitas, dosen, atau siapa pun yang ingin berbagi manfaat belajar." },
  { icon: ShieldCheck, title: "Pembayaran tepercaya", body: "Pencairan komisi yang jelas dengan pencatatan yang bisa kamu audit." },
  { icon: Headphones, title: "Didukung tim kami", body: "Materi promosi dan bantuan tim untuk memaksimalkan hasilmu." },
];

export default function AfiliasiPage() {
  return (
    <LandingTemplate
      eyebrow="Program Afiliasi"
      title={<>Bagikan ilmu, <span className="text-accent">dapatkan komisi</span></>}
      lede="Ajak lebih banyak orang belajar bersama Jago Akademi dan dapatkan komisi dari setiap transaksi yang kamu bawa. Daftarkan minatmu — tim kami akan menghubungi saat program dibuka."
      benefits={benefits}
      formSource="affiliate"
      formTitle="Daftar minat afiliasi"
      formLede="Isi data singkat, kami hubungi saat program siap."
    />
  );
}
