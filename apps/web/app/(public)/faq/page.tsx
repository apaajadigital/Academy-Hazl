import type { Metadata } from "next";
import { List, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { waLink } from "@/lib/config";
import FaqAccordion from "./FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ — Pertanyaan Umum",
  description:
    "Temukan jawaban atas pertanyaan umum seputar Jago Akademi — cara beli kursus, sertifikat, pembayaran, refund, dan lainnya.",
};

export const FAQ_ITEMS = [
  {
    category: "Umum",
    items: [
      {
        q: "Apa itu Jago Akademi?",
        a: "Jago Akademi adalah platform edukasi digital yang menyediakan e-course video, e-book, event pelatihan, dan program trainer bersertifikat dalam satu ekosistem terintegrasi.",
      },
      {
        q: "Apakah saya perlu mendaftar untuk mengakses konten?",
        a: "Beberapa konten preview tersedia tanpa login. Namun untuk mengakses kursus penuh, Anda perlu membuat akun dan melakukan pembelian.",
      },
    ],
  },
  {
    category: "Pembelian & Pembayaran",
    items: [
      {
        q: "Metode pembayaran apa yang diterima?",
        a: "Kami menerima Transfer Bank (Virtual Account), QRIS, dan Kartu Kredit/Debit melalui gateway pembayaran DOKU yang aman.",
      },
      {
        q: "Apakah ada biaya berlangganan?",
        a: "Model kami adalah pay-per-course — Anda membeli kursus yang ingin dipelajari tanpa biaya berlangganan bulanan. E-Book tersedia sebagai benefit premium.",
      },
      {
        q: "Bagaimana cara menggunakan voucher diskon?",
        a: "Masukkan kode voucher pada halaman checkout sebelum melakukan pembayaran. Voucher berlaku sekali pakai per akun untuk pembelian yang ditentukan.",
      },
    ],
  },
  {
    category: "Kursus & Pembelajaran",
    items: [
      {
        q: "Berapa lama saya bisa mengakses kursus setelah membeli?",
        a: "Akses kursus bersifat seumur hidup (lifetime access). Setelah membeli, Anda bisa belajar kapan saja tanpa batas waktu.",
      },
      {
        q: "Apakah kursus bisa diakses di perangkat mobile?",
        a: "Ya, platform kami responsif dan dapat diakses melalui browser di smartphone, tablet, maupun desktop.",
      },
      {
        q: "Bagaimana sistem progres belajar bekerja?",
        a: "Sistem otomatis melacak video yang sudah Anda tonton dan quiz yang sudah dikerjakan. Progres tersimpan secara real-time dan bisa dilanjutkan dari mana saja.",
      },
    ],
  },
  {
    category: "Sertifikat",
    items: [
      {
        q: "Bagaimana cara mendapatkan sertifikat?",
        a: "Sertifikat diberikan otomatis setelah Anda menyelesaikan minimal 80% dari seluruh materi kursus. Sertifikat dalam format PDF dan dapat diunduh kapan saja.",
      },
      {
        q: "Apakah sertifikat bisa diverifikasi?",
        a: "Ya, setiap sertifikat memiliki kode unik dan QR code yang bisa dipindai untuk verifikasi keaslian di halaman verify.jagoakademi.com.",
      },
      {
        q: "Bisakah saya membagikan sertifikat ke LinkedIn?",
        a: "Tentu! Tersedia tombol berbagi langsung ke LinkedIn dari halaman sertifikat Anda.",
      },
    ],
  },
  {
    category: "Refund",
    items: [
      {
        q: "Apakah pembelian kursus bisa di-refund?",
        a: "Refund dapat diajukan dengan mengirimkan bukti pembelian dan alasan yang reasonable kepada tim kami. Setiap permintaan diproses manual dalam 3–5 hari kerja.",
      },
      {
        q: "Bagaimana cara mengajukan refund?",
        a: "Hubungi tim support kami melalui halaman Kontak dengan menyertakan nomor order dan alasan refund. Tim kami akan merespons dalam 1 hari kerja.",
      },
    ],
  },
  {
    category: "Korporat & LMS",
    items: [
      {
        q: "Apakah ada paket untuk perusahaan?",
        a: "Ya! Kami memiliki paket LMS untuk korporat dengan fitur manajemen karyawan, laporan progres, dan konten yang dapat dikustomisasi. Hubungi tim sales kami.",
      },
      {
        q: "Berapa minimal pengguna untuk paket korporat?",
        a: "Paket korporat tersedia mulai dari 10 pengguna hingga unlimited. Harga disesuaikan dengan jumlah pengguna dan kebutuhan spesifik organisasi Anda.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section className="bg-surface-page pt-20 pb-16">
        <div className="container-pad text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-pink-strong">FAQ</p>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary">Pertanyaan yang Sering Ditanyakan</h1>
            <p className="text-text-secondary">
              Tidak menemukan jawaban yang Anda cari?{" "}
              <a href="/contact" className="text-accent-cyan-strong hover:underline">
                Hubungi kami
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Article: in-page TOC + accordion */}
      <section className="bg-surface-card section-sm">
        <div className="container-pad">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            {/* Sidebar TOC + support card */}
            <aside className="hidden md:block md:col-span-4 lg:col-span-3">
              <div className="sticky top-24 space-y-6">
                <Card className="p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <List size={18} className="text-accent-cyan-strong" aria-hidden="true" />
                    Navigasi
                  </h2>
                  <nav className="flex flex-col gap-1">
                    {FAQ_ITEMS.map((group) => (
                      <a
                        key={group.category}
                        href={`#${faqAnchorId(group.category)}`}
                        className="rounded-lg border-l-2 border-transparent px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent-cyan-strong hover:bg-surface-sunken hover:text-accent-cyan-strong"
                      >
                        {group.category}
                      </a>
                    ))}
                  </nav>
                </Card>
                <div className="bg-brand-gradient rounded-2xl p-6 text-white shadow-e2">
                  <p className="mb-1 text-sm opacity-90">Butuh bantuan lebih lanjut?</p>
                  <h3 className="font-display text-lg font-bold">Hubungi Tim Support</h3>
                  <a
                    href={waLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-accent-cyan-strong transition-opacity hover:opacity-90"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    WhatsApp Kami
                  </a>
                </div>
              </div>
            </aside>

            {/* Accordion content */}
            <div className="md:col-span-8 lg:col-span-9 space-y-10">
              <FaqAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Stable DOM id for a FAQ category — shared shape with the TOC anchors and the
 * accordion section targets. Kept identical in FaqAccordion (no cross-module
 * runtime import between the server page and the client accordion). */
export function faqAnchorId(category: string): string {
  return `faq-${category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}
