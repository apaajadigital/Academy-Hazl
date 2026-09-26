import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan layanan Jago Akademi.",
};

const sections = [
  {
    h: "1. Penerimaan Ketentuan",
    p: "Dengan mengakses dan menggunakan Jago Akademi, Anda menyetujui syarat dan ketentuan ini serta Kebijakan Privasi kami.",
  },
  {
    h: "2. Akun",
    p: "Anda bertanggung jawab menjaga kerahasiaan kredensial akun dan atas seluruh aktivitas pada akun Anda. Data yang Anda berikan harus akurat.",
  },
  {
    h: "3. Pembelian & Akses Materi",
    p: "Pembelian kursus/materi memberi Anda lisensi pribadi non-transferable untuk mengakses konten. Konten tidak boleh didistribusikan ulang tanpa izin.",
  },
  {
    h: "4. Pembayaran & Refund",
    p: "Pembayaran diproses melalui penyedia pihak ketiga (Duitku). Kebijakan pengembalian dana mengikuti ketentuan yang berlaku pada masing-masing produk dan akan diinformasikan saat pembelian.",
  },
  {
    h: "5. Konten & Hak Kekayaan Intelektual",
    p: "Seluruh materi di platform dilindungi hak cipta milik Jago Akademi atau pemberi lisensinya. Dilarang menyalin, memodifikasi, atau mendistribusikan tanpa izin tertulis.",
  },
  {
    h: "6. Batasan Tanggung Jawab",
    p: "Layanan disediakan 'sebagaimana adanya'. Kami berupaya menjaga ketersediaan dan kualitas, namun tidak menjamin bebas gangguan sepenuhnya.",
  },
  {
    h: "7. Perubahan Ketentuan",
    p: "Kami dapat memperbarui ketentuan ini. Perubahan material akan diinformasikan melalui platform.",
  },
];

/** Slugify a numbered section heading into a stable in-page anchor id. */
function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TermsPage() {
  return (
    <main id="main-content" className="bg-surface-page">
      {/* Breadcrumb */}
      <div className="container-pad pt-10 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-secondary">
          <Link href="/" className="transition-colors hover:text-accent-cyan-strong">
            Beranda
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="text-text-primary">Syarat &amp; Ketentuan</span>
        </nav>
      </div>

      {/* TOC sidebar + article */}
      <div className="container-pad pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Sticky table of contents */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Daftar Isi
                </h2>
                <nav className="flex flex-col gap-1">
                  {sections.map((s) => (
                    <a
                      key={s.h}
                      href={`#${sectionId(s.h)}`}
                      className="border-l-2 border-transparent py-1 pl-4 text-sm text-text-secondary transition-colors hover:border-accent-cyan-strong hover:text-accent-cyan-strong"
                    >
                      {s.h}
                    </a>
                  ))}
                </nav>
              </div>
              <Card className="p-5">
                <p className="mb-1 text-xs text-text-secondary">Berlaku sejak</p>
                <p className="text-sm font-semibold text-text-primary">Peluncuran layanan Jago Akademi</p>
              </Card>
            </div>
          </aside>

          {/* Legal article */}
          <article className="md:col-span-8 lg:col-span-9">
            <Card className="p-6 md:p-10">
              <header className="mb-8 border-b border-border-default pb-6">
                <h1 className="mb-2 text-3xl font-bold text-text-primary md:text-4xl">Syarat &amp; Ketentuan</h1>
                <p className="text-sm text-text-secondary">Berlaku sejak peluncuran layanan Jago Akademi.</p>
              </header>

              <div className="space-y-10">
                {sections.map((s) => (
                  <section key={s.h} id={sectionId(s.h)} className="scroll-mt-24">
                    <h2 className="mb-2 text-lg font-semibold text-text-primary">{s.h}</h2>
                    <p className="leading-relaxed text-[#3C3C43]">{s.p}</p>
                  </section>
                ))}
              </div>

              <blockquote className="mt-10 flex gap-3 rounded-r-xl border-l-4 border-accent-cyan-strong bg-surface-accent-soft p-5 text-sm italic text-text-secondary">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-accent-cyan-strong" aria-hidden="true" />
                <span>
                  Dokumen ini merupakan ringkasan ketentuan dan dapat diperbarui. Versi final ditinjau oleh
                  penasihat hukum.
                </span>
              </blockquote>
            </Card>
          </article>
        </div>
      </div>
    </main>
  );
}
