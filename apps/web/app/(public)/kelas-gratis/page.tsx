import type { Metadata } from "next";
import { Gift, PlayCircle, FileText, BadgeCheck, Clock, Sparkles } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";
import { FreeCourseCatalog } from "@/components/kelas-gratis/FreeCourseCatalog";

export const metadata: Metadata = {
  // Finding #6: root layout applies the "%s | Jago Akademi" template, so a
  // manual "| Jago Akademi" here produced a doubled suffix. Use `absolute` to
  // set the full title verbatim and bypass the template.
  title: { absolute: "Kelas Gratis — Mulai Belajar Tanpa Biaya | Jago Akademi" },
  description:
    "Akses kelas gratis Jago Akademi sebagai langkah pertama upgrade skill-mu. Daftar sekarang, dapatkan akses materi pengantar, dan lanjutkan ke jenjang berikutnya.",
  alternates: { canonical: "/kelas-gratis" },
  openGraph: {
    title: "Kelas Gratis — Jago Akademi",
    description: "Mulai belajar tanpa biaya. Daftar dan dapatkan akses materi pengantar.",
    type: "website",
    url: "/kelas-gratis",
  },
};

const benefits = [
  { icon: Gift,        title: "Sepenuhnya gratis",          body: "Materi pengantar berkualitas tanpa biaya — cukup daftar untuk mulai." },
  { icon: PlayCircle,  title: "Video terstruktur",           body: "Belajar bertahap lewat video yang mudah diikuti dari mana saja." },
  { icon: FileText,    title: "Worksheet praktis",           body: "Latihan aplikatif agar ilmu langsung bisa kamu terapkan." },
  { icon: BadgeCheck,  title: "Sertifikat penyelesaian",     body: "Selesaikan kelas dan dapatkan bukti belajarmu." },
  { icon: Clock,       title: "Akses fleksibel",             body: "Belajar kapan saja sesuai ritmemu, tanpa jadwal mengikat." },
  { icon: Sparkles,    title: "Langkah ke jenjang berikut",  body: "Rekomendasi jalur lanjutan yang pas setelah kelas gratis." },
];

export default function FreeClassPage() {
  return (
    <>
      {/* ── Lead-capture form (existing) ─────────────────────────────────── */}
      <LandingTemplate
        eyebrow="Kelas Gratis"
        title={<>Coba dulu, <span className="text-accent">gratis</span></>}
        lede="Rasakan cara belajar Jago Akademi lewat kelas gratis. Daftar sekarang untuk mendapatkan akses materi pengantar — dan temukan jalur belajar yang paling cocok untukmu."
        benefits={benefits}
        formSource="free-class"
        formTitle="Daftar kelas gratis"
        formLede="Isi data singkat, kami kirim akses & info kelasnya."
        submitLabel="Daftar Gratis"
      />

      {/* ── Live free course catalog from API ────────────────────────────── */}
      <FreeCourseCatalog />
    </>
  );
}
