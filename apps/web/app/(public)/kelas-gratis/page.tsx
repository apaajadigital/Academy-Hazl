import type { Metadata } from "next";
import { Gift, PlayCircle, FileText, BadgeCheck, Clock, Sparkles } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";
import { FreeCourseCatalog } from "@/components/kelas-gratis/FreeCourseCatalog";

export const metadata: Metadata = {
  title: { absolute: "Kelas Gratis Video AI — Mulai Belajar Tanpa Biaya | Hazl Academy" },
  description:
    "Akses kelas gratis video AI di Hazl Academy. Kuasai dasar prompt sinematik, camera motion, dan workflow pembuatan video tanpa biaya.",
  alternates: { canonical: "/kelas-gratis" },
  openGraph: {
    title: "Kelas Gratis Video AI | Hazl Academy",
    description: "Mulai belajar video AI tanpa biaya. Daftar sekarang dan pelajari dasar prompting sinematik.",
    type: "website",
    url: "/kelas-gratis",
  },
};

const benefits = [
  { icon: Gift,        title: "Sepenuhnya gratis",          body: "Materi video AI pengantar berkualitas tanpa biaya — cukup daftar untuk mulai." },
  { icon: PlayCircle,  title: "Praktik video nyata",        body: "Belajar bertahap dengan video beresolusi tinggi yang mudah dipahami." },
  { icon: FileText,    title: "Template prompt siap pakai", body: "Copy-paste prompt teruji untuk langsung dicoba di Kling AI dan Midjourney." },
  { icon: BadgeCheck,  title: "Sertifikat kelulusan",       body: "Selesaikan modul dan dapatkan sertifikat digital ber-QR instan." },
  { icon: Clock,       title: "Akses selamanya",            body: "Belajar kapan saja tanpa batas waktu dan tanpa kartu kredit." },
  { icon: Sparkles,    title: "Langkah ke jenjang kreator", body: "Rekomendasi kelas lanjutan untuk mulai jualan karya dan terima order video." },
];

export default function FreeClassPage() {
  return (
    <>
      {/* ── Lead-capture form ─────────────────────────────────────────────── */}
      <LandingTemplate
        eyebrow="Kelas Gratis Video AI"
        title={<>Coba dulu, <span className="text-[#0077A8]">Rp0 tanpa komitmen</span></>}
        lede="Rasakan cara belajar di Hazl Academy. Dapatkan akses materi pengantar prompt, tips kamera sinematik, dan template awal untuk karyamu."
        benefits={benefits}
        formSource="free-class"
        formTitle="Daftar kelas gratis"
        formLede="Isi data singkat, kami kirim akses kelas langsung ke akunmu."
        submitLabel="Mulai Belajar Gratis"
      />

      {/* ── Live free course catalog from API ────────────────────────────── */}
      <FreeCourseCatalog />
    </>
  );
}
