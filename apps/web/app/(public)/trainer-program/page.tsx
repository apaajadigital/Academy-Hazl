import type { Metadata } from "next";
import { GraduationCap, BadgeCheck, Presentation, Wallet, Users, Rocket } from "lucide-react";
import { LandingTemplate } from "@/components/landing/LandingTemplate";

export const metadata: Metadata = {
  title: "Program Mentor & Trainer — Hazl Academy",
  description:
    "Jadilah mentor dan kreator kursus Video AI resmi di Hazl Academy: bangun reputasi profesional, monetisasi keahlian generative AI, dan ajar ribuan talenta kreatif.",
  alternates: { canonical: "/trainer-program" },
  openGraph: {
    title: "Program Mentor Video AI — Hazl Academy",
    description: "Jadilah mentor terverifikasi: personal brand, bagi hasil transparan, dan jangkauan audiens kreatif luas.",
    type: "website",
    url: "/trainer-program",
  },
};

const benefits = [
  { icon: BadgeCheck, title: "Kredensial Mentor Terverifikasi", body: "Lulus kurasi kurikulum dan peroleh badge instruktur resmi Hazl Academy." },
  { icon: Presentation, title: "Terbitkan Kursus & Workflow", body: "Rancang modul video, aset prompt pack, dan ComfyUI custom workflow di portal Trainer Hub." },
  { icon: Wallet, title: "Bagi Hasil Royalti Menarik", body: "Sistem payout otomatis transparan dari setiap penjualan kursus dan workshop Anda." },
  { icon: Users, title: "Jaringan Komunitas Kreator", body: "Akses langsung ke ekosistem talenta kreatif visual AI, agensi, dan production house partner." },
  { icon: GraduationCap, title: "Dukungan Produksi & Studio", body: "Pendampingan tim editorial kami untuk standardisasi kualitas audio, video, dan silabus." },
  { icon: Rocket, title: "Kembangkan Brand Otoritas", body: "Tingkatkan reputasi industri Anda sebagai pionir praktisi teknologi Video AI di Indonesia." },
];

export default function TrainerProgramPage() {
  return (
    <LandingTemplate
      eyebrow="Trainer & Mentor Hub"
      title={<>Ubah Kepiawaian <span className="text-accent">Video AI</span> Jadi Reputasi Global</>}
      lede="Jadilah instruktur bersertifikat Hazl Academy — bangun kelas spesialisasi Anda sendiri (Kling AI, Runway, Midjourney, ComfyUI), bimbing komunitas kreator, dan nikmati monetisasi berkelanjutan."
      benefits={benefits}
      formSource="trainer"
      formTitle="Daftar Menjadi Mentor"
      formLede="Kirimkan profil singkat dan portofolio karya Anda — tim kurikulum kami akan menghubungi."
      secondaryCta={{ label: "Sudah punya akun? Masuk Trainer Hub", href: "/trainer-hub" }}
    />
  );
}
