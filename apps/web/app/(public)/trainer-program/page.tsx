import type { Metadata } from "next";
import { GraduationCap, BadgeCheck, Presentation, Wallet, Users, Rocket } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";

export const metadata: Metadata = {
  title: "Trainer Program — Jadi Trainer Bersertifikat",
  description:
    "Jadilah trainer profesional bersertifikat bersama Jago Akademi: kembangkan personal brand, ajar audiens luas, dan hasilkan pendapatan. Daftar minat sekarang.",
  alternates: { canonical: "/trainer-program" },
  openGraph: {
    title: "Trainer Program — Jago Akademi",
    description: "Jadi trainer bersertifikat: personal brand, audiens luas, pendapatan. Daftar minat.",
    type: "website",
    url: "/trainer-program",
  },
};

const benefits = [
  { icon: BadgeCheck, title: "Sertifikasi trainer", body: "Ikuti program terstruktur dan lulus asesmen untuk jadi trainer resmi." },
  { icon: Presentation, title: "Bangun kelas sendiri", body: "Rancang dan terbitkan materimu ke ribuan pembelajar." },
  { icon: Wallet, title: "Hasilkan pendapatan", body: "Dapatkan bagi hasil dari setiap peserta yang belajar bersamamu." },
  { icon: Users, title: "Audiens luas", body: "Manfaatkan platform Jago Akademi untuk menjangkau lebih banyak orang." },
  { icon: GraduationCap, title: "Dibimbing hingga siap", body: "Pendampingan menyiapkan kurikulum, rekaman, dan strategi kelas." },
  { icon: Rocket, title: "Kembangkan personal brand", body: "Jadikan keahlianmu sebagai reputasi profesional yang diakui." },
];

export default function TrainerProgramPage() {
  return (
    <LandingTemplate
      eyebrow="Trainer Program"
      title={<>Ubah keahlianmu jadi <span className="text-accent">dampak</span></>}
      lede="Jadilah trainer bersertifikat Jago Akademi — bangun kelasmu sendiri, jangkau audiens luas, dan hasilkan pendapatan dari ilmu yang kamu bagikan. Daftarkan minatmu, tim kami akan menghubungi."
      benefits={benefits}
      formSource="trainer"
      formTitle="Daftar minat trainer"
      formLede="Isi data singkat — kami hubungi saat batch dibuka."
      // Exit path for visitors who are ready now: the landing otherwise ends at
      // the lead form, with no way into the product.
      secondaryCta={{ label: "Sudah siap? Buat akun dulu", href: "/daftar" }}
    />
  );
}
