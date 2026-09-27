import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  Clock,
  MapPin,
  Mail,
  MessageSquare,
  FileCode2,
  GitPullRequest,
  Building2,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import ContactForm from "../contact/ContactForm";

export const metadata: Metadata = {
  title: "Tentang Kami — Hazl Academy",
  description:
    "Hazl Academy adalah platform edukasi video AI dan ekosistem kreator digital terdepan di Indonesia. Belajar alur kerja komersial Runway, Kling AI, Midjourney, dan ComfyUI.",
};

const STATS = [
  { value: "4.200+", label: "Kreator & Siswa Aktif" },
  { value: "100%", label: "Kurikulum Praktikal Berlisensi" },
  { value: "35+", label: "Modul & Template Siap Pakai" },
  { value: "ISO 27001", label: "Terakreditasi Keamanan Data" },
];

const VALUES = [
  {
    icon: FileCode2,
    badge: "01",
    title: "Production-First Rigor",
    desc: "Kurikulum disusun langsung dari studi kasus komersial riil — formulasi prompt presisi, alur editing lanjutan, hingga kalkulasi rate card UMKM & brand.",
    linkText: "Komersial & Standar QC",
    href: "/e-course",
  },
  {
    icon: GitPullRequest,
    badge: "02",
    title: "1-on-1 Prompt & Node Review",
    desc: "Bukan sekadar video pasif satu arah. Setiap tugas dan workflow node ComfyUI dievaluasi langsung oleh mentor praktisi untuk memastikan hasil visual konsisten.",
    linkText: "Struktur Evaluasi Praktik",
    href: "/e-course",
  },
  {
    icon: ShieldCheck,
    badge: "03",
    title: "Standar Lisensi & Hak Cipta",
    desc: "Membekali kreator dengan pemahaman legalitas hak cipta model AI, etika komersial, model release, serta perlindungan karya di ranah industri global.",
    linkText: "Perlindungan Hukum & Lisensi",
    href: "/terms",
  },
];

const TIMELINE = [
  {
    year: "2024",
    tag: "R&D",
    title: "Inisiasi Komunitas & Modul Generatif",
    desc: "Dimulai dari kelompok riset workflow difusi video AI, menguji stabilitas prompt dan konsistensi karakter untuk iklan pendek.",
  },
  {
    year: "2025",
    tag: "EXPAND",
    title: "Peluncuran Platform Terpadu",
    desc: "Merilis ekosistem all-in-one: Katalog E-Course Video AI, Formula Prompt E-Book, dan integrasi payment gateway instan.",
  },
  {
    year: "2026",
    tag: "SCALE",
    title: "Akreditasi & Integrasi Industri",
    desc: "Mengimplementasikan sertifikat QR kriptografis, verifikasi keamanan ISO/IEC 27001, dan jejaring agensi kreatif rekanan.",
  },
  {
    year: "2026+",
    tag: "UPCOMING",
    title: "Hazl B2B Enterprise & Studio Hub",
    desc: "Ekspansi kurikulum otomatisasi video AI untuk in-house marketing korporat dan inkubator studio produksi konten berskala nasional.",
  },
];

const LEADERS = [
  {
    name: "Bayu Pratama",
    role: "Principal AI Architect & Founder",
    bio: "Ex-Creative Tech Lead Unicorn dengan 10+ tahun pengalaman memimpin integrasi visual generatif dan arsitektur kreatif.",
    avatar: "/uploads/images/demo/c-kling.webp",
  },
  {
    name: "Annisa Paramita",
    role: "Head of Commercial UGC & Prompt Director",
    bio: "Kreator video AI bersertifikat internasional dengan portofolio ratusan campaign iklan brand terkemuka.",
    avatar: "/uploads/images/demo/c-midjourney.webp",
  },
  {
    name: "Ferial Daniswara",
    role: "Lead Node Synthesis & ComfyUI Specialist",
    bio: "Spesialis arsitektur model visual kustom, LoRA training, dan workflow komputasi grafis berperforma tinggi.",
    avatar: "/uploads/images/demo/c-comfyui.webp",
  },
  {
    name: "Dr. Kemal Santoso",
    role: "Advisor Legalitas & Etika Hak Cipta AI",
    bio: "Konsultan hukum kekayaan intelektual digital, membimbing standardisasi lisensi komersial kreator Hazl.",
    avatar: "/uploads/images/demo/c-runway.webp",
  },
];

export default function AboutPage() {
  return (
    <main id="main-content" className="bg-[#FAFAFA] text-[#16181D] antialiased">
      {/* 1. Hero Section */}
      <section className="border-b border-[#E7E9EC] bg-white px-6 pb-16 pt-20 sm:pt-24">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BDE5F8] bg-[#E8F6FF] px-4 py-1 text-xs font-bold text-[#0077A8]">
            <span className="h-2 w-2 rounded-full bg-[#0077A8] animate-pulse" />
            TENTANG HAZL ACADEMY • REKAYASA &amp; KREATIF
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight text-[#16181D]">
            Menjembatani Kesenjangan Antara Teori dan Praktik Video AI Komersial Skala Industri
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-[#5B616E]">
            Didirikan oleh praktisi kreatif dan AI engineer untuk melahirkan talenta kreator yang siap menghasilkan karya bernilai tinggi, standar lisensi global, dan alur kerja produksi modern.
          </p>

          {/* Meta Chips */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold text-[#5B616E]">
            <span className="rounded-full border border-[#E7E9EC] bg-[#FAFAFA] px-3.5 py-1">
              Didirikan 2024
            </span>
            <span className="rounded-full border border-[#E7E9EC] bg-[#FAFAFA] px-3.5 py-1">
              100% Praktikal &amp; Bebas AI-Slop
            </span>
            <span className="rounded-full border border-[#E7E9EC] bg-[#FAFAFA] px-3.5 py-1">
              4.200+ Kreator Tergabung
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-1">
              Sertifikasi Ber-QR Kriptografis
            </span>
          </div>
        </div>
      </section>

      {/* 2. Stats Grid */}
      <section className="border-b border-[#E7E9EC] bg-[#FAFAFA] py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#E7E9EC] bg-white p-5 text-center shadow-sm">
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#0077A8]">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-[#5B616E]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Core Values (Nilai Inti Rekayasa Hazl) */}
      <section className="border-b border-[#E7E9EC] bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E]">
                PRINSIP &amp; NILAI INTI
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D]">
                Nilai Inti Rekayasa Hazl
              </h2>
            </div>
            <p className="text-xs text-[#5B616E] max-w-sm">
              Standar baku pembelajaran yang menjamin karya yang diproduksi bernilai jual tinggi dan diterima standar agensi profesional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="flex flex-col justify-between rounded-[26px] border border-[#E7E9EC] bg-[#FAFAFA] p-6 hover:border-[#0077A8] hover:bg-white transition-all shadow-sm group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
                      <v.icon size={20} />
                    </div>
                    <span className="font-mono text-xs font-extrabold text-[#8A909A]">{v.badge}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#16181D]">{v.title}</h3>
                  <p className="text-xs text-[#5B616E] leading-relaxed">{v.desc}</p>
                </div>

                <Link
                  href={v.href}
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[#0077A8] hover:underline"
                >
                  <span>{v.linkText}</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Timeline (Jejak Langkah & Dampak) */}
      <section className="border-b border-[#E7E9EC] bg-[#FAFAFA] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl space-y-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E]">
              PERJALANAN KAMI
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D]">
              Jejak Langkah &amp; Dampak Rekayasa
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIMELINE.map((item) => (
              <div
                key={item.year}
                className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-extrabold text-[#16181D]">
                      {item.year}
                    </span>
                    <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[10px] font-bold text-[#5B616E]">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#16181D]">{item.title}</h3>
                  <p className="text-xs text-[#5B616E] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Leadership & Mentors (Kepemimpinan & Dewan Praktisi) */}
      <section className="border-b border-[#E7E9EC] bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E]">
                DEWAN MENTOR &amp; TIM
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D]">
                Kepemimpinan &amp; Dewan Praktisi
              </h2>
            </div>
            <p className="text-xs text-[#5B616E] max-w-sm">
              Mentor yang aktif memproduksi karya komersial nyata, bukan sekadar teori visual.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LEADERS.map((leader) => (
              <div
                key={leader.name}
                className="rounded-[24px] border border-[#E7E9EC] bg-[#FAFAFA] p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#E8F6FF] mb-4">
                    <Image
                      src={leader.avatar}
                      alt={leader.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-base text-[#16181D]">{leader.name}</h3>
                  <p className="text-[11px] font-semibold text-[#0077A8] mt-0.5">{leader.role}</p>
                  <p className="text-xs text-[#5B616E] mt-2.5 leading-relaxed">{leader.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Contact & Office Info Section */}
      <section className="bg-[#FAFAFA] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl space-y-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E]">
              KOLABORASI &amp; PERTANYAAN
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D]">
              Hubungi Tim Rekayasa &amp; Konsultan Hazl
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#5B616E]">
              Punya kebutuhan kelas privat korporat, kemitraan B2B, atau masukan silabus? Hubungi kami sekarang.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Info Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#0077A8]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#16181D]">
                    Service Level Agreement (SLA)
                  </h3>
                </div>
                <p className="text-xs text-[#5B616E] leading-relaxed">
                  Semua email dan pertanyaan kemitraan akan direspons dalam waktu maksimal 4 jam kerja pada hari operasional.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 shadow-sm space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#0077A8] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#16181D] block">Kantor Pusat Jakarta</strong>
                    <p className="text-[#5B616E] mt-0.5">
                      District 8 SCBD, Prosperity Tower Lt. 18, Jakarta Selatan 12190
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E7E9EC] pt-3 flex items-start gap-3">
                  <Mail size={18} className="text-[#0077A8] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#16181D] block">Email Resmi</strong>
                    <a href="mailto:halo@hazl.academy" className="text-[#0077A8] font-semibold hover:underline">
                      halo@hazl.academy
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form Column (7 cols) */}
            <div className="lg:col-span-7 rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="font-bold text-base text-[#16181D] mb-1">Kirim Pesan Langsung</h3>
              <p className="text-xs text-[#5B616E] mb-5">
                Isi form di bawah ini dan tim konsultan kami akan menghubungi Anda kembali.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
