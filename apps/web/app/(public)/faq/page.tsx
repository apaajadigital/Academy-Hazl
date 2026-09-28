import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { features } from "@/lib/features";
import {
  List,
  MessageCircle,
  UserCheck,
  CreditCard,
  Film,
  Award,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { waLink, CONTACT_FALLBACK_HREF } from "@/lib/config";
import FaqAccordion from "./FaqAccordion";

const waHref = waLink();

export const metadata: Metadata = {
  title: "Pusat Bantuan & FAQ — Hazl Academy",
  description:
    "Temukan jawaban atas pertanyaan umum seputar Hazl Academy — kursus Video AI, lisensi komersial, sertifikat ber-QR, pembayaran Duitku, dan refund.",
};

type FaqEntry = { q: string; a: ReactNode };
export type FaqGroup = { category: string; items: FaqEntry[] };

export const FAQ_CATEGORIES_TOP = [
  {
    icon: UserCheck,
    title: "Akun & Onboarding",
    desc: "Aktivasi akun, login SSO, dan manajemen workspace belajar.",
    target: "faq-umum-platform",
  },
  {
    icon: CreditCard,
    title: "Pembayaran & Faktur",
    desc: "Metode Duitku, QRIS, Virtual Account, dan invoice resmi PPN 11%.",
    target: "faq-pembayaran-transaksi",
  },
  {
    icon: Film,
    title: "Kurikulum & Software AI",
    desc: "Kling AI, Runway Gen-3, Midjourney, ComfyUI, dan workflow.",
    target: "faq-kurikulum-software-video-ai",
  },
  {
    icon: Award,
    title: "Kredensial & Hak Cipta",
    desc: "Sertifikat digital terverifikasi QR & lisensi komersial UGC.",
    target: "faq-sertifikasi-verifikasi-resmi",
  },
];

export const FAQ_ITEMS: FaqGroup[] = [
  {
    category: "Umum & Platform",
    items: [
      {
        q: "Apa itu Hazl Academy?",
        a: "Hazl Academy adalah ekosistem edukasi dan inkubasi kreator Video AI terdepan di Indonesia. Kami menyediakan e-course aplikatif, modul workflow produksi (Kling AI, Runway Gen-3, Midjourney, ComfyUI), sertifikasi terverifikasi QR code, serta jejaring talenta komersial untuk agensi dan brand.",
      },
      {
        q: "Apakah pemula tanpa latar belakang video/editing bisa belajar di sini?",
        a: "Sangat bisa. Seluruh kurikulum level Fundamental kami dirancang dari nol (zero-to-hero), mencakup dasar prompt engineering visual, logika komposisi kamera sinematik, hingga otomasi render tanpa memerlukan keahlian coding atau software editing rumit.",
      },
      {
        q: "Perangkat komputer apa yang dibutuhkan untuk mengikuti kelas?",
        a: "Sebagian besar model generative video mutakhir (seperti Kling AI, Runway Gen-3, Luma Dream Machine, Hailuo Minimax, dan Midjourney) beroperasi di cloud via browser, sehingga laptop standar atau MacBook Air sudah sangat memadai. Untuk materi tingkat lanjut ComfyUI lokal, kami sertakan opsi Google Colab / cloud GPU rental.",
      },
    ],
  },
  {
    category: "Pembayaran & Transaksi",
    items: [
      {
        q: "Metode pembayaran apa saja yang didukung?",
        a: "Kami bermitra resmi dengan Payment Gateway Duitku (berlisensi Bank Indonesia). Anda dapat bertransaksi instan melalui QRIS (GoPay, OVO, Dana, ShopeePay, BCA QR) serta Virtual Account otomatis dari BCA, Bank Mandiri, BNI, BRI, Permata, dan CIMB Niaga.",
      },
      {
        q: "Apakah transaksi dikenakan biaya tambahan atau langganan berkala?",
        a: "Tidak ada biaya tersembunyi. Sistem pembelian kursus bersifat One-Time Payment (Beli Sekali, Akses Selamanya). Harga yang tertera di checkout sudah final dan mencakup faktur elektronik resmi.",
      },
      {
        q: "Bagaimana jika pembayaran saya sudah terdebet tapi status masih Pending?",
        a: "Sistem kami terhubung webhook real-time. Jika jaringan bank mengalami keterlambatan sesaat, Anda cukup menekan tombol 'Cek Status Sekarang' di halaman konfirmasi. Tim billing kami juga siap memverifikasi manual dalam waktu < 15 menit via WhatsApp Support.",
      },
    ],
  },
  {
    category: "Kurikulum & Software Video AI",
    items: [
      {
        q: "Tools generative AI apa saja yang dipelajari secara mendalam?",
        a: "Kurikulum Hazl Academy mencakup stack industri lengkap: Text-to-Video & Image-to-Video (Kling AI 1.5, Runway Gen-3 Alpha, Hailuo Minimax), High-Fidelity Visual Prompting (Midjourney v6, Flux.1), Voice & Audio AI (ElevenLabs, Suno v3), serta Node-based Advanced Control (ComfyUI AnimateDiff & IP-Adapter).",
      },
      {
        q: "Apakah langganan tool AI (misal Kling AI / Midjourney) sudah termasuk dalam paket kursus?",
        a: "Biaya kursus mencakup seluruh materi video panduan, template prompt komersial, custom workflow JSON, dan pendampingan mentor. Akun tool generative AI dioperasikan masing-masing peserta. Namun, di dalam kelas kami membagikan strategi alokasi kredit free-tier dan trik efisiensi token render.",
      },
      {
        q: "Berapa lama masa aktif akses materi setelah pembelian?",
        a: "Seluruh kursus yang Anda beli memiliki Akses Seumur Hidup (Lifetime Access), termasuk pembaruan materi dan revisi modul saat terdapat update versi major dari engine AI bersangkutan.",
      },
    ],
  },
  {
    category: "Sertifikasi & Verifikasi Resmi",
    items: [
      {
        q: "Bagaimana cara memperoleh sertifikat kelulusan Hazl Academy?",
        a: "Sertifikat resmi diterbitkan otomatis setelah Anda menyelesaikan 100% video materi dan mengunggah tugas portofolio akhir (video showcase 15–30 detik). Portofolio akan direview oleh mentor dalam 1–2 hari kerja.",
      },
      {
        q: "Apakah sertifikat memiliki validasi keaslian yang dapat dicek pihak ketiga?",
        a: "Ya. Setiap sertifikat Hazl Academy dilengkapi dengan ID Kredensial Kriptografis unik dan QR Code dinamis yang langsung mengarah ke halaman verifikasi publik resmi di verify.hazl.academy untuk kebutuhan lamaran kerja atau portofolio agensi.",
      },
      {
        q: "Bisakah sertifikat ini dipamerkan langsung di profil LinkedIn?",
        a: "Tentu. Kami menyediakan tombol integrasi 1-klik 'Add to LinkedIn Profile' lengkap dengan Organization ID dan link verifikasi langsung.",
      },
    ],
  },
  {
    category: "Kebijakan Garansi & Refund",
    items: [
      {
        q: "Apakah Hazl Academy memberikan jaminan kepuasan (Money-Back Guarantee)?",
        a: "Ya, kami memberlakukan Garansi 100% Uang Kembali dalam waktu 7 hari setelah pembelian apabila materi kursus belum ditonton lebih dari 20% dan Anda merasa kurikulum tidak sesuai dengan ekspektasi awal.",
      },
      {
        q: "Bagaimana alur pengajuan refund?",
        a: "Anda cukup membuka halaman pesanan di Dashboard Siswa, klik 'Ajukan Bantuan / Refund', atau kirimkan email ke halo@hazl.academy dengan mencantumkan Order ID. Dana akan dikembalikan melalui rekening asal dalam 2–3 hari kerja bank.",
      },
    ],
  },
  ...(features.clients ? [
  {
    category: "Kemitraan Korporat & B2B LMS",
    items: [
      {
        q: "Apakah tersedia program pelatihan khusus in-house untuk perusahaan atau agensi?",
        a: (
          <>
            Ya, kami menyediakan platform LMS Multi-Tenant B2B untuk tim creative & marketing perusahaan. Kunjungi{" "}
            <Link href="/clients" className="font-semibold text-accent-cyan-strong hover:underline">
              Halaman Paket Korporasi LMS
            </Link>{" "}
            untuk informasi workspace dedicated, kurikulum kustom, dan laporan analitik tim.
          </>
        ),
      },
      {
        q: "Berapa jumlah minimum peserta untuk paket B2B?",
        a: "Paket onboarding korporasi dimulai dari skala batch kecil (10 kursi) hingga enterprise tanpa batas pengguna, didukung Dedicated Account Manager dan SLA prioritas.",
      },
    ],
  },
  ] : []),
];

export function faqAnchorId(category: string): string {
  return `faq-${category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export default function FaqPage() {
  return (
    <main id="main-content" className="min-h-screen bg-surface-page">
      {/* Hero */}
      <section className="border-b border-border-default bg-white py-16 md:py-20">
        <div className="container-pad text-center">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3.5 py-1 text-xs font-semibold text-accent-cyan-strong">
              <Sparkles size={14} className="text-accent-pink-strong" aria-hidden="true" />
              PUSAT BANTUAN &amp; DOKUMENTASI
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              Pertanyaan yang Sering Diajukan
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-text-secondary">
              Temukan jawaban komprehensif seputar kurikulum Video AI, akun, aktivasi kursus, sistem transaksi, dan sertifikasi resmi Hazl Academy.
            </p>
          </div>

          {/* 4 Popular Topic Cards */}
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {FAQ_CATEGORIES_TOP.map((cat) => {
              const Icon = cat.icon;
              return (
                <a
                  key={cat.title}
                  href={`#${cat.target}`}
                  className="group rounded-xl border border-border-default bg-surface-page p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-cyan-strong hover:bg-white hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-accent-soft text-accent-cyan-strong transition-colors group-hover:bg-accent-cyan-strong group-hover:text-white">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-text-primary group-hover:text-accent-cyan-strong">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {cat.desc}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content: Sidebar TOC + Accordion */}
      <section className="section-sm">
        <div className="container-pad">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 lg:gap-12">
            {/* Sidebar TOC + Support Card */}
            <aside className="hidden md:block md:col-span-4 lg:col-span-3">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-xl border border-border-default bg-white p-5 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                    <List size={16} className="text-accent-cyan-strong" aria-hidden="true" />
                    Kategori Bantuan
                  </h2>
                  <nav className="flex flex-col gap-1">
                    {FAQ_ITEMS.map((group) => (
                      <a
                        key={group.category}
                        href={`#${faqAnchorId(group.category)}`}
                        className="rounded-lg border-l-2 border-transparent px-3 py-2 text-xs font-medium text-text-secondary transition-all hover:border-accent-cyan-strong hover:bg-surface-page hover:text-accent-cyan-strong"
                      >
                        {group.category}
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Flat Clean Support Card (zero purple, zero gradient) */}
                <div className="rounded-xl border border-border-default bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-accent-soft text-accent-cyan-strong">
                    <HelpCircle size={20} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-text-primary">Butuh Bantuan Langsung?</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    Tim customer support dan instruktur kami siap membantu konsultasi kurikulum maupun kendala teknis.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16A34A] px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                      >
                        <MessageCircle size={15} aria-hidden="true" />
                        Chat WhatsApp
                      </a>
                    ) : (
                      <a
                        href={CONTACT_FALLBACK_HREF}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-cyan-strong px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                      >
                        <MessageCircle size={15} aria-hidden="true" />
                        Hubungi Kami
                      </a>
                    )}
                    <Link
                      href="/contact"
                      className="flex w-full items-center justify-center rounded-full border border-border-default bg-surface-page px-4 py-2 text-xs font-semibold text-text-primary hover:bg-white"
                    >
                      Kirim Tiket / Email
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

            {/* Accordion Content */}
            <div className="space-y-10 md:col-span-8 lg:col-span-9">
              <FaqAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
