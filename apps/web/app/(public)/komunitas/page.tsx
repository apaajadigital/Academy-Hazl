import type { Metadata } from "next";
import Image from "next/image";
import {
  MessageSquare,
  Users,
  Radio,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Flame,
  Code2,
  Tv,
} from "lucide-react";
import { LeadCaptureForm } from "@/components/landing/LeadCaptureForm";
import { waLink, CONTACT_FALLBACK_HREF } from "@/lib/config";

const waHref = waLink("Halo, saya ingin bergabung dengan Komunitas Kreator Hazl Academy");

export const metadata: Metadata = {
  title: "Komunitas Kreator Video AI | Hazl Academy",
  description:
    "Gabung komunitas kreator video AI Hazl Academy — diskusi, feedback karya, dan info event lewat WhatsApp & Discord.",
};

const RAW_GROUP_URL = process.env.NEXT_PUBLIC_WA_COMMUNITY_GROUP;
const GROUP_URL = RAW_GROUP_URL?.startsWith("https://") ? RAW_GROUP_URL : null;
const DISCORD_URL = "https://discord.gg/hazl-academy";

const DISCORD_CHANNELS = [
  { name: "#01-prompt-and-motion", desc: "Text-to-Video, Camera Control, Seed Tuning", activeCount: "420 aktif" },
  { name: "#02-comfyui-node-builders", desc: "Node Architecture, AnimateDiff, IP-Adapter", activeCount: "310 aktif" },
  { name: "#03-commercial-ugc-briefs", desc: "Review Portofolio Iklan & Feedback Klien", activeCount: "195 aktif" },
  { name: "#04-commercial-job-board", desc: "Loker Agensi, Proyek Freelance TVC", activeCount: "85 update/bln" },
];

const WA_CIRCLES = [
  { region: "DKI Jakarta & Sekitarnya", members: "250+ kreator", tag: "Meetup Rutin" },
  { region: "Jawa Barat & Bandung", members: "210+ kreator", tag: "Creative Hub" },
  { region: "Jawa Timur & Bali Hub", members: "180+ kreator", tag: "Production Studio" },
  { region: "Commercial UGC VIP Circle", members: "Invite Only", tag: "Client Projects" },
];

const DISCUSSIONS = [
  {
    id: 1,
    author: "Fajar Ramadhan",
    batch: "Batch 12 • Commercial Video",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    time: "26 menit yang lalu",
    title: "Review arsitektur prompt consistency di Kling 1.5 + Midjourney v6: cara cegah face flickering saat camera panning?",
    snippet:
      "Saya sedang render 10 shot b-roll fashion untuk klien coffee brand. Problem: di shot 3 dan 5 struktur wajah talent agak bergeser saat ada motion blur. Solusinya: pakai LoRA custom atau lock seed di ComfyUI?",
    tags: ["Kling AI 1.5", "Consistent Face", "ComfyUI IP-Adapter", "Prompting"],
    mentorReply: {
      mentor: "Rian Kurniawan",
      role: "Lead Mentor",
      text: "Gunakan IP-Adapter FaceID Plus v2 di ComfyUI sebelum pass ke Kling, kunci seed di 420918 dan turunkan denoise ke 0.45. Workflow JSON sudah saya pin di channel #02-comfyui-node-builders.",
    },
    commentsCount: 14,
    reactionCount: 8,
  },
  {
    id: 2,
    author: "Nabila Prasetyo",
    batch: "Batch 9 • Motion Design",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    time: "1 jam yang lalu",
    title: "Tips bikin text-to-video yang pas sinkron beat audio di ElevenLabs + Suno v3?",
    snippet:
      "Metode paling presisi yang saya temukan: potong video berdasarkan waveform drum hit di CapCut dulu, baru generate in-between frame pakai Runway Gen-3 lip-sync. Render time turun 40% dan feel visualnya terasa natural.",
    tags: ["ElevenLabs", "Audio Sync", "Runway Gen-3", "Workflow"],
    commentsCount: 29,
    reactionCount: 19,
  },
  {
    id: 3,
    author: "Hazl Study Jam Bot",
    batch: "Official Event • Hazl Hub",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    time: "Kemarin, 20.30 WIB",
    title: "Study Jam Rutin ke-14: Hands-on Bedah Pembuatan TVC Skincare 30 Detik dari Nol",
    snippet:
      "Live session bedah pipeline lengkap bareng Fikri Ramadhan. Kita praktekkan prompt script di Claude 3.5 Sonnet, visual gen di Flux.1, animasi camera di Kling, dan upscaler 4K di Topaz Video AI.",
    tags: ["Study Jam", "TVC Commercial", "Flux.1", "Topaz 4K"],
    commentsCount: 48,
    reactionCount: 35,
    isEvent: true,
  },
];

const RITUALS = [
  {
    icon: Radio,
    step: "01 / SETIAP SELASA",
    title: "Weekly Live Prompting & Peer Review",
    desc: "Sesi live streaming mingguan di Discord Stage: bedah prompt peserta, simulasi brief klien real-time, dan evaluasi hasil render tanpa sensor.",
    schedule: "Selasa malam, 19.30 – 21.00 WIB",
  },
  {
    icon: Code2,
    step: "02 / DEEP INSPECTION",
    title: "1-on-1 Deep Node Inspection",
    desc: "Bedah alur ComfyUI dan otomasi pipeline video bersama lead mentor. Setiap node, kontroler ekspresi, dan model checkpoint diperiksa sampai bebas error.",
    schedule: "Jadwal booking via kalender internal",
  },
  {
    icon: Tv,
    step: "03 / KARIER & KLIEN",
    title: "Internal Job Board & Client Referral",
    desc: "Akses eksklusif proyek komersial video AI dari 40+ agensi partner, production house, dan brand retail yang membutuhkan talenta terverifikasi.",
    schedule: "Rilis proyek baru setiap hari kerja",
  },
  {
    icon: Users,
    step: "04 / NETWORKING NYATA",
    title: "Meetup Offline & Coworking Day",
    desc: "Kumpul temu muka bulanan di Jakarta Creative Hub, Bandung, dan Surabaya. Diskusi santai, eksplorasi kamera AI, dan kolaborasi karya bersama.",
    schedule: "Sabtu pekan ke-3 setiap bulan",
  },
];

const CHAMPIONS = [
  {
    name: "Dimas Bagaskara",
    role: "Community Lead",
    badge: "AI Pipeline Specialist",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    bio: "Mantan Technical Director agensi digital dengan pengalaman 6+ tahun otomasi render dan video visual generative.",
  },
  {
    name: "Rian Kurniawan",
    role: "Lead Mentor",
    badge: "Prompt Architect & ComfyUI",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    bio: "Pionir eksplorasi ComfyUI & AnimateDiff di Indonesia. Mengampu kurikulum rekayasa node dan konsistensi karakter.",
  },
  {
    name: "Maya Anggraini",
    role: "Creative Director",
    badge: "Commercial UGC Lead",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    bio: "Spesialis produksi video iklan komersial UGC berbasis Kling AI dan Runway untuk brand FMCG dan fesyen nasional.",
  },
  {
    name: "Fikri Ramadhan",
    role: "Visual Engineer",
    badge: "Motion & Colorist",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    bio: "Praktisi post-production dan grading visual AI dengan portofolio TVC digital dan music video berstandar broadcast.",
  },
];

export default function KomunitasPage() {
  return (
    <main id="main-content" className="min-h-screen bg-surface-page">
      {/* ── 1. Hero Header ─────────────────────────────────────────── */}
      <section className="border-b border-border-default bg-white py-16 md:py-20">
        <div className="container-pad text-center">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3.5 py-1 text-xs font-semibold text-accent-cyan-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan-strong animate-pulse" />
              EKOSISTEM BELAJAR BERBASIS PEER-LEARNING
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              Bukan Sekadar Belajar Sendiri, Bangun Karier Bersama{" "}
              <span className="text-accent-cyan-strong">14.200+ Rekan Kreator</span>
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-text-secondary">
              Ruang diskusi teknis prompt, bedah node workflow, kritik portofolio real, study jam akhir pekan, dan jejaring kerja langsung di Discord &amp; WhatsApp komunitas.
            </p>
          </div>

          {/* ── 2. Top Community Anchor Cards ──────────────────────── */}
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 text-left">
            {/* Discord Server Card */}
            <div className="rounded-2xl border border-border-default bg-white p-6 md:p-8 shadow-sm transition-all hover:border-accent-cyan-strong">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2]">
                    <MessageSquare size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">Discord Server Hazl Hub</h2>
                    <p className="text-xs text-text-muted">Interactive 24/7 Workspace</p>
                  </div>
                </div>
                <span className="rounded-full bg-surface-accent-soft px-3 py-1 text-[11px] font-bold text-accent-cyan-strong">
                  14.200+ Siswa
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-text-secondary">
                Hub utama pertukaran workflow JSON, prompt breakdown, showcase karya mingguan, dan live voice room antar kreator.
              </p>

              <div className="mt-5 space-y-2 rounded-xl border border-border-default bg-surface-page p-3.5">
                {DISCORD_CHANNELS.map((ch) => (
                  <div key={ch.name} className="flex items-center justify-between text-xs py-1">
                    <span className="font-mono font-semibold text-text-primary">{ch.name}</span>
                    <span className="text-[11px] text-text-muted">{ch.activeCount}</span>
                  </div>
                ))}
              </div>

              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-5 py-3 text-xs font-bold text-white transition-opacity hover:opacity-95"
              >
                Gabung Discord Hazl Hub
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>

            {/* WhatsApp Regional Circles Card */}
            <div className="rounded-2xl border border-border-default bg-white p-6 md:p-8 shadow-sm transition-all hover:border-accent-cyan-strong">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#16A34A]/10 text-[#16A34A]">
                    <MessageCircle size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">WhatsApp Regional &amp; Circles</h2>
                    <p className="text-xs text-text-muted">Grup Wilayah &amp; Khusus</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-[#16A34A]">
                  Group Terkurasi
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-text-secondary">
                Lingkaran koordinasi regional dan sharing santai di Jabodetabek, Bandung, Surabaya, serta circle privat komersial.
              </p>

              <div className="mt-5 space-y-2 rounded-xl border border-border-default bg-surface-page p-3.5">
                {WA_CIRCLES.map((c) => (
                  <div key={c.region} className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-text-primary">{c.region}</span>
                    <span className="rounded-md border border-border-default bg-white px-2 py-0.5 text-[10px] text-text-secondary">
                      {c.tag}
                    </span>
                  </div>
                ))}
              </div>

              {GROUP_URL ? (
                <a
                  href={GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#16A34A] px-5 py-3 text-xs font-bold text-white transition-opacity hover:opacity-95"
                >
                  Pilih WhatsApp Circle
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              ) : (
                <a
                  href={waHref ?? CONTACT_FALLBACK_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#16A34A] px-5 py-3 text-xs font-bold text-white transition-opacity hover:opacity-95"
                >
                  Hubungi Admin Circle
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Lead Registration Form Card (Zero Regression for E2E) ── */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border-default bg-white p-6 md:p-10 shadow-sm">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
              <div className="md:col-span-6 space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-accent-soft px-3 py-1 text-xs font-bold text-accent-cyan-strong">
                  <ShieldCheck size={14} aria-hidden="true" />
                  VERIFIKASI ANGGOTA KOMUNITAS
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-text-primary">
                  Daftar Jadi Anggota
                </h2>
                <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                  Isi data singkat Anda untuk diverifikasi oleh admin. Kami akan mengirimkan undangan resmi Discord VIP, akses repository prompt, dan group regional WhatsApp.
                </p>
                <div className="space-y-2 pt-2 text-xs text-text-secondary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-accent-cyan-strong" aria-hidden="true" />
                    <span>Akses gratis seumur hidup tanpa biaya iuran bulanan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-accent-cyan-strong" aria-hidden="true" />
                    <span>Prioritas undangan webinar live dan study jam</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-6 rounded-xl border border-border-default bg-surface-page p-6">
                <LeadCaptureForm source="community" submitLabel="Gabung Komunitas" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Aktivitas & Diskusi Teknis Terkini ──────────────────── */}
      <section className="section-sm pt-4">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-default pb-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Aktivitas &amp; Diskusi Teknis Terkini</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Tanya jawab langsung antar-pelajar, tanggapan mentor arsitektur, dan kritik karya anggota komunitas.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Semua Kategori", "Prompting", "Workflow Node", "Showcase UGC"].map((tab, idx) => (
                  <button
                    key={tab}
                    type="button"
                    className={`rounded-full px-3.5 py-1 font-semibold transition-colors ${
                      idx === 0
                        ? "bg-accent-cyan-strong text-white"
                        : "border border-border-default bg-white text-text-secondary hover:bg-surface-page"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Threads feed */}
            <div className="mt-6 space-y-4">
              {DISCUSSIONS.map((d) => (
                <article
                  key={d.id}
                  className="rounded-2xl border border-border-default bg-white p-5 md:p-6 shadow-sm transition-all hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-page">
                        <Image src={d.avatar} alt={d.author} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">{d.author}</span>
                          <span className="rounded bg-surface-page px-2 py-0.5 text-[10px] text-text-muted">
                            {d.batch}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted">{d.time}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm md:text-base font-bold text-text-primary hover:text-accent-cyan-strong cursor-pointer">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {d.snippet}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {d.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-border-default bg-surface-page px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {d.mentorReply && (
                    <div className="mt-4 rounded-xl border border-accent-cyan-strong/20 bg-surface-accent-soft/40 p-4 text-xs leading-relaxed">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-accent-cyan-strong">{d.mentorReply.mentor}</span>
                        <span className="rounded bg-accent-cyan-strong px-1.5 py-0.2 text-[9px] font-semibold text-white">
                          {d.mentorReply.role}
                        </span>
                      </div>
                      <p className="text-[#3C3C43]">{d.mentorReply.text}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border-default pt-3 text-[11px] text-text-muted">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare size={13} aria-hidden="true" />
                        {d.commentsCount} tanggapan
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Flame size={13} className="text-accent-pink-strong" aria-hidden="true" />
                        {d.reactionCount} reaksi
                      </span>
                    </div>
                    <span className="text-accent-cyan-strong font-semibold hover:underline cursor-pointer">
                      Buka di Discord Hub →
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. 4 Ritual Nyata yang Menempa Standar Kreator ──────────── */}
      <section className="section-sm bg-white border-y border-border-default mt-8">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="text-left space-y-1 mb-8">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">
                RITUAL &amp; AKUNTABILITAS BELAJAR
              </p>
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                4 Ritual Nyata yang Menempa Standar Kreator Kami
              </h2>
              <p className="text-xs md:text-sm text-text-secondary">
                Bukan sekadar grup chat tanpa arah. Setiap aktivitas dirancang untuk mengasah portofolio siap kerja di industri konten komersial.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {RITUALS.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.title}
                    className="rounded-2xl border border-border-default bg-surface-page p-6 shadow-sm transition-all hover:bg-white hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-accent-soft text-accent-cyan-strong">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[10px] font-bold text-text-muted">{r.step}</span>
                    </div>

                    <h3 className="mt-4 text-base font-bold text-text-primary">{r.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{r.desc}</p>

                    <div className="mt-4 flex items-center gap-2 border-t border-border-default pt-3 text-[11px] font-medium text-text-muted">
                      <Clock size={13} className="text-accent-cyan-strong" aria-hidden="true" />
                      <span>{r.schedule}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Pengurus Komunitas & Champions ──────────────────────── */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="text-left space-y-1 mb-8">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">
                DEWAN MENTOR &amp; FASILITATOR
              </p>
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Pengurus Komunitas &amp; Community Champions
              </h2>
              <p className="text-xs md:text-sm text-text-secondary">
                Para praktisi aktif yang selalu standby merespon pertanyaan teknis, membagikan workflow, dan menjaga standar kualitas diskusi.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CHAMPIONS.map((ch) => (
                <div
                  key={ch.name}
                  className="rounded-2xl border border-border-default bg-white p-5 text-center shadow-sm"
                >
                  <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-border-default bg-surface-page">
                    <Image src={ch.avatar} alt={ch.name} fill className="object-cover" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-text-primary">{ch.name}</h3>
                  <p className="text-xs font-semibold text-accent-cyan-strong">{ch.role}</p>
                  <span className="mt-1 inline-block rounded bg-surface-page px-2 py-0.5 text-[10px] text-text-muted">
                    {ch.badge}
                  </span>
                  <p className="mt-3 text-xs leading-relaxed text-text-secondary line-clamp-3">
                    {ch.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Closing CTA Band ────────────────────────────────────── */}
      <section className="border-t border-border-default bg-white py-16">
        <div className="container-pad text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
              Siap Bertumbuh Bersama Komunitas Tanpa Senioritas?
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-text-secondary">
              Mulai dari tanya prompt pertama, ikuti study jam akhir pekan, hingga peroleh rekomendasi proyek komersial video AI.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#5865F2] px-6 py-3 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                <MessageSquare size={16} aria-hidden="true" />
                Masuk Discord Hazl
              </a>
              {GROUP_URL ? (
                <a
                  href={GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-6 py-3 text-xs font-bold text-text-primary transition-colors hover:bg-white"
                >
                  <MessageCircle size={16} className="text-[#16A34A]" aria-hidden="true" />
                  Gabung Group WhatsApp
                </a>
              ) : (
                <a
                  href={waHref ?? CONTACT_FALLBACK_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-6 py-3 text-xs font-bold text-text-primary transition-colors hover:bg-white"
                >
                  <MessageCircle size={16} className="text-[#16A34A]" aria-hidden="true" />
                  Konsultasi Komunitas
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
