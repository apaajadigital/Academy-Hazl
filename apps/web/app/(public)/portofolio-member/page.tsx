"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  Sparkles,
  Search,
  ExternalLink,
  CheckCircle2,
  Tv,
  Film,
  Code2,
  ArrowRight,
  ShieldCheck,
  Send,
  FileCode,
} from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

const PAGE_SIZE = 12;

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiPortfolio = {
  id: string;
  name: string;
  role: string;
  headline?: string | null;
  photoUrl?: string | null;
  featured?: boolean;
};

type ApiMeta = {
  total?: number;
  page?: number;
  limit?: number;
};

// ─── Curated Showcase Works (Stitch 2.1-portofolio.png) ───────────────────────

const CURATED_WORKS = [
  {
    id: "showcase-1",
    title: "High-Paced Commercial TVC for Hydration Brand",
    author: "Dimas Bagaskara",
    batch: "Batch 12 • Commercial Video",
    desc: "Produksi 10 shot iklan komersial minuman olahraga dengan konsistensi talent dan pencahayaan dinamis.",
    stack: ["Kling AI 1.5", "Runway Gen-3", "Flux.1", "Topaz 4K"],
    verifiedBy: "Reviewed by Rian Kurniawan: Production Approved",
    tagBadge: "COMMERCIAL TVC",
    coverImg: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-2",
    title: "OmniPOS: Shortform Fashion Lookbook UGC",
    author: "Maya Anggraini",
    batch: "Batch 14 • Fashion & UGC",
    desc: "Video katalog fesyen musiman 30 detik untuk brand lokal dengan otomasi model virtual multi-pose.",
    stack: ["Midjourney v6", "ComfyUI IP-Adapter", "CapCut Pro"],
    verifiedBy: "Reviewed by Jessica Tan: Commercial Approved",
    tagBadge: "FASHION & PRODUCT",
    coverImg: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-3",
    title: "Cinematic Sci-Fi Teaser: Chronicles of Aegis",
    author: "Budi Pratama",
    batch: "Batch 11 • Cinematic World",
    desc: "Trailer film fiksi ilmiah berdurasi 60 detik dengan sinkronisasi sound design ElevenLabs dan Suno v3.",
    stack: ["Runway Gen-3 Alpha", "ElevenLabs", "Suno v3", "DaVinci"],
    verifiedBy: "Reviewed by Galih Perkasa: 100% Verified",
    tagBadge: "CINEMATIC TEASER",
    coverImg: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-4",
    title: "Automated Render Pipeline with ComfyUI Distributed Node",
    author: "Rizki Romadhon",
    batch: "Batch 10 • Pipeline Engineer",
    desc: "Arsitektur cloud worker node untuk render video 4K paralel, menghemat waktu proses hingga 75%.",
    stack: ["ComfyUI Custom Node", "Python", "RunPod GPU", "FFmpeg"],
    verifiedBy: "Reviewed by Arie Munandar: Production Approved",
    tagBadge: "COMFYUI ADVANCED",
    coverImg: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-5",
    title: "Fintech Mobile App 3D Explainer Video",
    author: "Kevin Sanjaya",
    batch: "Batch 13 • 3D Motion AI",
    desc: "Video animasi produk aplikasi perbankan digital dengan aset 3D render berbasis generative depth control.",
    stack: ["Spline 3D", "Luma Dream Machine", "ElevenLabs Voice"],
    verifiedBy: "Reviewed by Nabila Wibowo: Quality Passed",
    tagBadge: "PRODUCT EXPLAINER",
    coverImg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-6",
    title: "Automated Social Reels Bot for Daily E-Commerce Ads",
    author: "Sarah Danastri",
    batch: "Batch 10 • Social Automation",
    desc: "Generator otomatis 5 variasi video TikTok Shop harian dengan scraping tren produk dan AI voiceover.",
    stack: ["Make.com", "Kling API", "ElevenLabs", "CapCut Template"],
    verifiedBy: "Reviewed by Rian Kurniawan: Production Approved",
    tagBadge: "UGC AUTOMATION",
    coverImg: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "M"
  );
}

function safePhotoUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

// ─── Card Component (Matches E2E Selector Contract) ───────────────────────────

function MemberCard({ member }: { member: ApiPortfolio }) {
  const photo = safePhotoUrl(member.photoUrl);

  return (
    <Link
      href={`/portofolio-member/${encodeURIComponent(member.id)}`}
      className={`pm-card group flex flex-col justify-between rounded-2xl border border-border-default bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-cyan-strong hover:shadow-md ${
        member.featured ? "pm-card-featured border-accent-cyan-strong/40 bg-surface-page/50" : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {photo ? (
              <img src={photo} alt="" className="pm-avatar-img h-11 w-11 rounded-full border border-border-default object-cover" loading="lazy" />
            ) : (
              <div className="pm-avatar-initials flex h-11 w-11 items-center justify-center rounded-full bg-surface-accent-soft font-bold text-accent-cyan-strong" aria-hidden="true">
                {initialsOf(member.name)}
              </div>
            )}
            <div>
              <h2 className="pm-name text-sm font-bold text-text-primary group-hover:text-accent-cyan-strong">
                {member.name}
              </h2>
              <p className="pm-role text-xs text-text-muted">{member.role}</p>
            </div>
          </div>
          {member.featured && (
            <span className="pm-badge inline-flex items-center gap-1 rounded-full bg-surface-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent-cyan-strong">
              <Sparkles size={11} aria-hidden="true" />
              Unggulan
            </span>
          )}
        </div>

        {member.headline && (
          <p className="pm-headline mt-4 text-xs md:text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {member.headline}
          </p>
        )}
      </div>

      <div className="mt-5 border-t border-border-default pt-3">
        <span className="pm-view-link inline-flex items-center gap-1 text-xs font-bold text-accent-cyan-strong group-hover:underline">
          Lihat portofolio →
        </span>
      </div>
    </Link>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function PortofolioMemberPage() {
  const [members, setMembers] = useState<ApiPortfolio[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua Proyek");

  const fetchPage = useCallback(async (pageNum: number): Promise<{
    items: ApiPortfolio[];
    total: number | null;
  }> => {
    try {
      const res = await fetch(`${API}/api/portfolios?page=${pageNum}&limit=${PAGE_SIZE}`);
      const body = (await res.json()) as {
        success?: boolean;
        data?: unknown;
        meta?: ApiMeta;
      };
      if (!body?.success) return { items: [], total: null };
      const raw = Array.isArray(body.data) ? body.data : [];
      const items = (raw as ApiPortfolio[]).filter((m) => Boolean(m && m.id && m.name && m.role));
      const totalCount =
        typeof body.meta?.total === "number" && Number.isFinite(body.meta.total)
          ? body.meta.total
          : null;
      return { items, total: totalCount };
    } catch {
      return { items: [], total: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPage(1).then(({ items, total: t }) => {
      if (cancelled) return;
      setMembers(items);
      setTotal(t);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const hasApiMembers = Boolean(members && members.length > 0);

  return (
    <main id="main-content" className="pm-root min-h-screen bg-surface-page">
      {/* ── 1. Hero Header (Stitch 2.1-portofolio.png) ───────────────── */}
      <section className="border-b border-border-default bg-white py-16 md:py-20 text-center">
        <div className="container-pad">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3.5 py-1 text-xs font-semibold text-accent-cyan-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-pink-strong animate-pulse" />
              REPOSITORI KARYA MAHASISWA &amp; ALUMNI
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              Bukti Nyata Karya Standar Industri,{" "}
              <span className="text-accent-cyan-strong">Bukan Proyek Tutorial</span>
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-text-secondary">
              Eksplorasi video TVC komersial, arsitektur node ComfyUI, dan workflow iklan generative yang dibangun dan diverifikasi oleh member Hazl Academy.
            </p>

            {/* Search Input Bar */}
            <div className="mx-auto mt-8 max-w-xl">
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-4 text-text-muted" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Cari topik atau software stack (Kling, Runway, ComfyUI, Midjourney...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-border-default bg-surface-page py-3.5 pl-11 pr-24 text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan-strong focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-cyan-strong"
                />
                <button
                  type="button"
                  className="absolute right-2 rounded-full bg-accent-cyan-strong px-5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  Cari
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              {[
                "Semua Proyek",
                "Iklan Komersial TVC",
                "Cinematic Story",
                "Fashion & Product UGC",
                "Character Motion",
                "ComfyUI Node",
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${
                    activeCategory === cat
                      ? "bg-accent-cyan-strong text-white"
                      : "border border-border-default bg-surface-page text-text-secondary hover:bg-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Dynamic Member Portfolios (Matches E2E Test Contract) ─── */}
      {hasApiMembers && (
        <section className="section-sm border-b border-border-default bg-surface-page">
          <div className="container-pad">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-text-primary">Direktori Member Terdaftar</h2>
                <p className="text-xs text-text-secondary">Profil kreator aktif dengan portofolio yang dapat diverifikasi publik.</p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {members?.map((m) => (
                  <MemberCard key={m.id} member={m} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Curated Showcase Bento Cards (Stitch 2.1-portofolio.png) ─ */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end border-b border-border-default pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">
                  SHOWCASE REPOSITORI TERVERIFIKASI
                </p>
                <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                  Karya Pilihan Member &amp; Alumni
                </h2>
              </div>
              <p className="text-xs text-text-secondary">
                Setiap karya dilengkapi file master prompt, video render HD, dan review kelayakan lisensi komersial.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CURATED_WORKS.map((work) => (
                <div
                  key={work.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border-default bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-cyan-strong hover:shadow-md"
                >
                  <div>
                    {/* Thumbnail Cover */}
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-page">
                      <Image
                        src={work.coverImg}
                        alt={work.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-md bg-black/75 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-white backdrop-blur-sm">
                        {work.tagBadge}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      <h3 className="text-sm font-bold text-text-primary group-hover:text-accent-cyan-strong line-clamp-2">
                        {work.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {work.desc}
                      </p>

                      {/* Stack badges */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {work.stack.map((s) => (
                          <span
                            key={s}
                            className="rounded-md border border-border-default bg-surface-page px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Mentor verification notice */}
                      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 size={13} aria-hidden="true" />
                        <span className="truncate">{work.verifiedBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Author footer */}
                  <div className="flex items-center justify-between border-t border-border-default bg-surface-page/50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border-default">
                        <Image src={work.avatar} alt={work.author} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary leading-none">{work.author}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{work.batch}</p>
                      </div>
                    </div>
                    <Link
                      href={`/portofolio-member/${work.id}`}
                      className="text-xs font-semibold text-accent-cyan-strong hover:underline"
                    >
                      Studi Kasus →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Callout: Submit Capstone Portofolio ───────────────────── */}
      <section className="section-sm pt-0">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl rounded-2xl border border-border-default bg-white p-8 md:p-12 shadow-sm text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-pink-strong">
              STANDAR &amp; VERIFIKASI KODE KREATIF
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-text-primary tracking-tight md:text-3xl">
              Ingin Karyamu Ditampilkan di Portofolio Terverifikasi Hazl?
            </h2>
            <p className="mt-2 max-w-2xl text-xs md:text-sm leading-relaxed text-text-secondary">
              Setiap karya yang masuk ke repositori publik ini wajib melewati review nyata oleh Lead Mentor: pemeriksaan konsistensi karakter, sinkronisasi audio-visual, keaslian prompt, dan kesiapan lisensi komersial klien.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full bg-accent-pink-strong px-6 py-3 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                <Send size={15} aria-hidden="true" />
                Submit Portofolio Capstone
              </Link>
              <Link
                href="/faq"
                className="flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-6 py-3 text-xs font-bold text-text-primary transition-colors hover:bg-white"
              >
                <FileCode size={15} aria-hidden="true" />
                Baca Rubrik Penilaian Portofolio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
