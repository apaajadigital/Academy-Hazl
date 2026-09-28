"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  TrendingUp,
  ArrowRight,
  } from "lucide-react";
import { fetchList, resolveListState, type ListState } from "@/lib/api/listResource";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiTestimonial = {
  id?: string;
  name: string;
  role: string;
  company?: string | null;
  quote: string;
  rating?: number | null;
  photoUrl?: string | null;
  featured?: boolean;
  category?: string;
  outcome?: string | null;
};

// ─── Curated Spotlight Data (Stitch 2.1-alumni.png) ───────────────────────────

const SPOTLIGHT_ALUMNI = [
  {
    name: "Aditya Nugraha",
    role: "Commercial Video Director",
    company: "Telkomsel Digital",
    batch: "Batch 08 • Full-Pipeline Video AI",
    outcome: "Full-Time Lead AI Video Director",
    quote:
      "Saat klien hanya punya budget satu video konvensional, saya tawarkan 10 variasi video AI dengan karakter dan pencahayaan konsisten. Efisiensi ini melipatgandakan closing deal hingga 4x lipat.",
    tags: ["Kling AI 1.5", "ElevenLabs", "Commercial Storyboard"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    actionLabel: "Verifikasi Portofolio",
    actionHref: "/portofolio-member",
  },
  {
    name: "Annisa Lestari",
    role: "Visual Prompting Specialist",
    company: "Paragon Technology",
    batch: "Batch 11 • Fashion & Product AI",
    outcome: "Creative Lead In-House Studio",
    quote:
      "Modul prompt architecture di Hazl membuka mata saya bahwa konsistensi pencahayaan studio dan tekstur produk di Midjourney & ComfyUI bisa menggantikan photoshoot fisik bernilai puluhan juta rupiah.",
    tags: ["Midjourney v6", "Flux Dev LoRA", "Topaz Video 4K"],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    actionLabel: "Lihat Studi Kasus UGC",
    actionHref: "/portofolio-member",
  },
  {
    name: "Fikri Ramadhan",
    role: "Founder & Creative Producer",
    company: "Nocturnal AI Studio",
    batch: "Batch 05 • Advanced Node Engineering",
    outcome: "Mendirikan Studio AI 12+ Klien",
    quote:
      "Saya bangun agensi video AI dari nol berbekal workflow dari Hazl. Kini kami menangani produksi video iklan TVC dan social media ads untuk 12+ brand nasional tiap bulannya.",
    tags: ["ComfyUI Pipeline", "Runway Gen-3", "Suno v3"],
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    actionLabel: "Lihat Showreel Studio",
    actionHref: "/portofolio-member",
  },
];

const TRUST_STATS = [
  {
    stat: "94%",
    label: "Penempatan & Proyek Cepat",
    desc: "Lulusan menerima tawaran proyek komersial dalam 45 hari pasca kelulusan.",
  },
  {
    stat: "2.8x",
    label: "Rata-rata Peningkatan Fee",
    desc: "Kenaikan pendapatan bulanan alumni setelah memiliki keahlian Video AI berlisensi.",
  },
  {
    stat: "140+",
    label: "Mitra Produksi Terhubung",
    desc: "Agensi periklanan, production house, dan brand retail aktif merekrut talenta Hazl.",
  },
];

const PARTNER_COMPANIES = [
  { name: "Telkom Indonesia", division: "Enterprise Creative Lab", alumniCount: "14 Alumni" },
  { name: "GoTo Ecosystem", division: "Visual Media Team", alumniCount: "42 Alumni" },
  { name: "Bank Mandiri", division: "Branding & Digital Media", alumniCount: "18 Alumni" },
  { name: "Bukalapak", division: "Creative Multimedia Hub", alumniCount: "21 Alumni" },
  { name: "BCA Digital", division: "Campaign Innovation", alumniCount: "16 Alumni" },
  { name: "Tokopedia", division: "Social Video Strategy", alumniCount: "25 Alumni" },
  { name: "EMTEK Media", division: "Broadcast Generative", alumniCount: "12 Alumni" },
  { name: "Shopee Video", division: "Regional Content Lab", alumniCount: "17 Alumni" },
];

const MILESTONES = [
  {
    tag: "KASUS 1 • PROYEK TVC 48 JAM",
    title: "Deadlock Render di Menit Terakhir & Penyelamatan Deadline TVC",
    author: "Rian Pratama",
    nowRole: "Senior Motion Lead di Hakuhodo Indonesia",
    story:
      "Proyek TVC skincare klien kami tiba-tiba crash saat proses rendering 4K di server lokal karena memory leak. Berbekal modul cloud distributed render ComfyUI yang diajarkan mentor Hazl, pipeline berhasil saya alihkan ke cloud node cluster dalam kurun waktu 3 jam dan tayang tepat waktu.",
    tools: ["ComfyUI Cloud Node", "Kling AI 1.5", "Topaz Video AI"],
  },
  {
    tag: "KASUS 2 • REVISI BRAND 50X",
    title: "Menangani 50 Catatan Revisi Klien Skincare Menggunakan Master Prompt Matrix",
    author: "Nathalia Tan",
    nowRole: "Creative Video Producer di Social Lab",
    story:
      "Klien menuntut talent yang sama persis di 12 setting lokasi berbeda (indoor, outdoor malam, pantai). Dulu ini mimpi buruk. Dengan sistem seed locking dan IP-Adapter control net yang dipelajari di kelas, semua variasi bisa diproduksi konsisten tanpa perlu shooting ulang.",
    tools: ["Midjourney v6 Character", "IP-Adapter FaceID", "CapCut Pro"],
  },
  {
    tag: "KASUS 3 • FREELANCE GLOBAL",
    title: "Tembus Pitch Proyek Komersial Pertama Senilai Rp 35 Juta di Upwork",
    author: "Dimas Wahyudi",
    nowRole: "Top-Rated Plus Creative AI Director",
    story:
      "Sebelumnya saya ragu apakah portofolio video AI saya diakui klien luar negeri. Sertifikat ber-QR kriptografis dan breakdown node yang saya lampirkan di proposal berhasil memenangkan bidding TV commercial agensi fesyen asal Australia.",
    tools: ["Runway Gen-3", "Flux.1 Cinematic", "Suno v3 Soundtrack"],
  },
];

const MENTOR_ALUMNI = [
  {
    name: "Bagus Prabowo",
    role: "Lead AI Producer di Leo Burnett",
    specialty: "Sistem Komersial Iklan TVC, Prompt Architecture",
    slots: "Tersedia 3 Slot",
  },
  {
    name: "Citra Wulandari",
    role: "Creative Motion Lead di GoTo",
    specialty: "Social Media UGC Scale, Runway & ElevenLabs",
    slots: "Tersedia 2 Slot",
  },
  {
    name: "Hendra Saputra",
    role: "VFX & Colorist di Studio Antelope",
    specialty: "ComfyUI Node Tuning, 4K Broadcast Finishing",
    slots: "Waiting List",
  },
  {
    name: "Ryan David",
    role: "AI Creative Director di VaynerMedia",
    specialty: "Pitching Klien Korporat & Penentuan Rate Card",
    slots: "Tersedia 4 Slot",
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
      .slice(0, 2) || "A"
  );
}

function safePhotoUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

function clampRating(rating: number | null | undefined): number | null {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
  const r = Math.round(rating);
  return r >= 1 && r <= 5 ? r : null;
}

// ─── Card Component (Matches E2E Selector Contract) ───────────────────────────

function AlumniCard({ item }: { item: ApiTestimonial }) {
  const photo = safePhotoUrl(item.photoUrl);
  const rating = clampRating(item.rating);

  return (
    <article
      className={`al-card group rounded-2xl border border-border-default bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-cyan-strong hover:shadow-md ${
        item.featured ? "al-card-featured border-accent-cyan-strong/40 bg-surface-page/50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {photo ? (
            <img src={photo} alt="" className="al-avatar-img h-12 w-12 rounded-full border border-border-default object-cover" loading="lazy" />
          ) : (
            <div className="al-avatar-initials flex h-12 w-12 items-center justify-center rounded-full bg-surface-accent-soft font-bold text-accent-cyan-strong" aria-hidden="true">
              {initialsOf(item.name)}
            </div>
          )}
          <div>
            <h3 className="al-name text-sm font-bold text-text-primary">{item.name}</h3>
            <p className="al-role text-xs text-text-muted">
              {item.role}
              {item.company && <> · <span className="font-semibold text-text-secondary">{item.company}</span></>}
            </p>
          </div>
        </div>
        {item.featured && (
          <span className="al-badge rounded-full bg-surface-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent-cyan-strong">
            Alumni Terverifikasi
          </span>
        )}
      </div>

      {item.outcome && (
        <div className="al-outcome mt-4 flex items-center gap-2 rounded-lg border border-border-default bg-surface-page px-3 py-2 text-xs font-semibold text-accent-cyan-strong">
          <TrendingUp size={14} className="shrink-0" aria-hidden="true" />
          <span>{item.outcome}</span>
        </div>
      )}

      <blockquote className="al-quote mt-3 text-xs md:text-sm leading-relaxed text-[#3C3C43]">
        &ldquo;{item.quote}&rdquo;
      </blockquote>

      {rating !== null && (
        <div className="al-stars mt-4 flex gap-1 border-t border-border-default pt-3" role="img" aria-label={`Rating ${rating} dari 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={13}
              aria-hidden="true"
              className={i <= rating ? "al-star-on fill-amber-400 text-amber-400" : "al-star-off text-gray-300"}
            />
          ))}
        </div>
      )}
    </article>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AlumniPage() {
  const [state, setState] = useState<ListState<ApiTestimonial>>({ kind: "loading" });
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const id = ++requestIdRef.current;
    setState({ kind: "loading" });
    void fetchList<ApiTestimonial>(
      "/api/testimonials?category=alumni",
      (rows) =>
        (rows as ApiTestimonial[]).filter((t) => Boolean(t && t.name && t.quote && t.role)),
    ).then((result) => {
      if (id !== requestIdRef.current) return;
      setState(resolveListState(result));
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main id="main-content" className="al-root min-h-screen bg-surface-page">
      {/* ── 1. Hero Header (Stitch 2.1-alumni.png) ───────────────────── */}
      <section className="border-b border-border-default bg-white py-16 md:py-20 text-center">
        <div className="container-pad">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3.5 py-1 text-xs font-semibold text-accent-cyan-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-pink-strong" />
              CERITA SUKSES ALUMNI REKAYASA &amp; KREATIF
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              Dari Siswa Pemula Menjadi <span className="text-accent-cyan-strong">AI Video Director</span>, Creative Lead, &amp; Studio Founder
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-text-secondary">
              14.200+ lulusan Hazl Academy kini berkarya memproduksi konten iklan komersial, kampanye brand global, dan otomasi generative di studio agensi ternama Asia Tenggara.
            </p>
          </div>

          {/* Filter chips bar */}
          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-2 text-xs">
            {[
              "Semua Jalur",
              "Karier Full-Time",
              "Freelance & Proyek Lepas",
              "Commercial TVC",
              "Shortform UGC",
              "Founder Studio",
            ].map((chip, idx) => (
              <button
                key={chip}
                type="button"
                className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${
                  idx === 0
                    ? "bg-accent-cyan-strong text-white"
                    : "border border-border-default bg-surface-page text-text-secondary hover:bg-white"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Dynamic API Testimonials Section (E2E Contract) ──────── */}
      {state.kind === "empty" && (
        <section className="section-sm border-b border-border-default bg-surface-page">
          <div className="container-pad">
            <div className="mx-auto max-w-xl text-center rounded-2xl border border-border-default bg-white p-8 md:p-12 shadow-sm">
              <div className="text-4xl mb-3">🎓</div>
              <h2 className="al-empty-title text-xl font-bold text-text-primary mb-2">
                Cerita alumni segera hadir
              </h2>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed mb-6">
                Kami hanya menampilkan cerita asli dari alumni sungguhan yang telah menyelesaikan program verifikasi portofolio.
              </p>
              <Link
                href="/kelas-gratis"
                className="al-btn-primary inline-flex items-center gap-2 rounded-full bg-accent-cyan-strong px-6 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                Mulai dari Kelas Gratis
              </Link>
            </div>
          </div>
        </section>
      )}

      {state.kind === "list" && state.items.length > 0 && (
        <section className="section-sm border-b border-border-default bg-surface-page">
          <div className="container-pad">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Kisah Alumni Terverifikasi Terbaru</h2>
                  <p className="text-xs text-text-secondary">Ditinjau dan diverifikasi langsung dari basis data student record.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {state.items.map((item, idx) => (
                  <AlumniCard key={item.id ?? `${item.name}-${idx}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Alumni Spotlight (Stitch 2.1-alumni.png 3-Column) ─────── */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end border-b border-border-default pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">
                  CASE SPOTLIGHT
                </p>
                <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                  Alumni Spotlight
                </h2>
              </div>
              <p className="text-xs text-text-secondary max-w-md text-left sm:text-right">
                Kisah otentik tentang transformasi keahlian, lompatan profesional, dan pencapaian nyata di industri konten kreatif.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {SPOTLIGHT_ALUMNI.map((al) => (
                <div
                  key={al.name}
                  className="flex flex-col justify-between rounded-2xl border border-border-default bg-white p-6 shadow-sm transition-all hover:border-accent-cyan-strong hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border-default bg-surface-page">
                        <Image src={al.avatar} alt={al.name} fill className="object-cover" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">{al.name}</h3>
                        <p className="text-xs text-accent-cyan-strong font-medium">{al.role}</p>
                        <p className="text-[11px] text-text-muted">{al.company}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-border-default bg-surface-page p-3 text-xs space-y-1">
                      <div className="flex justify-between text-[11px] text-text-muted">
                        <span>Jalur Pembelajaran:</span>
                        <span className="font-semibold text-text-primary">{al.batch}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-text-muted">
                        <span>Pencapaian:</span>
                        <span className="font-bold text-accent-cyan-strong">{al.outcome}</span>
                      </div>
                    </div>

                    <blockquote className="mt-4 text-xs md:text-sm leading-relaxed text-[#3C3C43]">
                      &ldquo;{al.quote}&rdquo;
                    </blockquote>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {al.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-border-default bg-surface-page px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-border-default pt-4">
                    <Link
                      href={al.actionHref}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-cyan-strong hover:underline"
                    >
                      {al.actionLabel}
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Trust Metrics & Hiring Partners ──────────────────────── */}
      <section className="section-sm bg-white border-y border-border-default">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            {/* 3 Large Stat Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border-default bg-surface-page p-6">
                  <div className="text-3xl md:text-4xl font-extrabold text-accent-cyan-strong tracking-tight font-mono">
                    {s.stat}
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-text-primary">{s.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Hiring Partners Grid */}
            <div className="mt-12 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">
                EKOSISTEM TALENTA DILETAKKAN DI PRODUKSI &amp; STUDIO NASIONAL
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PARTNER_COMPANIES.map((c) => (
                  <div
                    key={c.name}
                    className="rounded-xl border border-border-default bg-surface-page p-4 text-left transition-colors hover:border-accent-cyan-strong hover:bg-white"
                  >
                    <p className="text-xs font-bold text-text-primary">{c.name}</p>
                    <p className="text-[11px] text-text-muted truncate">{c.division}</p>
                    <span className="mt-2 inline-block rounded bg-surface-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-cyan-strong">
                      {c.alumniCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bukan Cerita Sukses Instan (Case Breakdowns) ─────────── */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-left space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">
                KASUS REALITA
              </p>
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Bukan Cerita Sukses Instan
              </h2>
              <p className="text-xs md:text-sm text-text-secondary">
                Simak bagaimana alumni melewati momen krusial di depan klien: tantangan konsistensi render, review puluhan revisi, hingga tembus proposal bernilai tinggi.
              </p>
            </div>

            <div className="space-y-4">
              {MILESTONES.map((m) => (
                <div
                  key={m.title}
                  className="rounded-2xl border border-border-default bg-white p-6 md:p-8 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border-default pb-3">
                    <span className="font-mono text-xs font-bold text-accent-cyan-strong">{m.tag}</span>
                    <div className="text-xs text-text-muted">
                      Diceritakan oleh <strong className="text-text-primary">{m.author}</strong> ({m.nowRole})
                    </div>
                  </div>

                  <h3 className="mt-4 text-base md:text-lg font-bold text-text-primary">
                    {m.title}
                  </h3>

                  <p className="mt-2 text-xs md:text-sm leading-relaxed text-[#3C3C43]">
                    {m.story}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-[11px] font-semibold text-text-muted">Tools Terapan:</span>
                    {m.tools.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-border-default bg-surface-page px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Bimbingan 1-on-1 Bersama Alumni Senior ────────────────── */}
      <section className="section-sm bg-white border-t border-border-default">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end border-b border-border-default pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan-strong">
                  SESI MENTORSHIP
                </p>
                <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                  Bimbingan 1-on-1 Bersama Alumni Senior
                </h2>
              </div>
              <p className="text-xs text-text-secondary max-w-md text-left sm:text-right">
                Alumni yang telah mapan meluangkan jam mentoring mingguan untuk mereview portofolio dan strategi negosiasi proyek Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MENTOR_ALUMNI.map((ma) => (
                <div
                  key={ma.name}
                  className="flex flex-col justify-between rounded-xl border border-border-default bg-surface-page p-5 text-left"
                >
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{ma.name}</h3>
                    <p className="text-xs text-accent-cyan-strong font-medium mt-0.5">{ma.role}</p>
                    <p className="mt-2 text-xs text-text-secondary leading-relaxed">{ma.specialty}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border-default pt-3">
                    <span className="text-[11px] font-semibold text-emerald-600">{ma.slots}</span>
                    <Link
                      href="/komunitas"
                      className="rounded-full bg-white border border-border-default px-3 py-1 text-[11px] font-bold text-text-primary hover:bg-surface-page"
                    >
                      Pesan Sesi
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
