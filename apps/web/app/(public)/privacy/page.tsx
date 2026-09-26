import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi Jago Akademi — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda sesuai UU PDP.",
};

const sections = [
  {
    h: "1. Data yang Kami Kumpulkan",
    p: "Kami mengumpulkan data yang Anda berikan saat mendaftar dan menggunakan layanan: nama, email, kata sandi (terenkripsi), nomor telepon (opsional), serta data profil yang Anda isi. Kami juga mencatat data teknis (alamat IP, perangkat) untuk keamanan.",
  },
  {
    h: "2. Dasar & Tujuan Penggunaan",
    p: "Data digunakan untuk menyediakan layanan (akun, kursus, pembayaran, sertifikat), mengirim notifikasi transaksional, serta menjaga keamanan. Pemrosesan dilakukan atas dasar persetujuan Anda dan pelaksanaan kontrak layanan.",
  },
  {
    h: "3. Persetujuan",
    p: "Dengan mendaftar, Anda menyetujui kebijakan ini. Anda dapat menarik persetujuan kapan saja dengan menghapus akun; sebagian data transaksi tetap disimpan untuk memenuhi kewajiban hukum/keuangan.",
  },
  {
    h: "4. Hak Anda (UU PDP)",
    p: "Anda berhak mengakses, memperbaiki, dan menghapus data pribadi Anda. Perbaikan profil tersedia di dashboard; penghapusan akun akan menganonimkan data pribadi Anda (data keuangan disimpan sesuai kewajiban hukum).",
  },
  {
    h: "5. Keamanan & Penyimpanan",
    p: "Kami menerapkan enkripsi kata sandi, koneksi HTTPS, kontrol akses berbasis peran, dan pembatasan laju. Data disimpan selama diperlukan untuk layanan dan kewajiban hukum.",
  },
  {
    h: "6. Pihak Ketiga & Transfer Data",
    p: "Kami menggunakan penyedia tepercaya untuk pembayaran (DOKU), email, penyimpanan media, dan analitik. Beberapa penyedia dapat memproses data di luar Indonesia; kami memastikan perlindungan yang memadai.",
  },
  {
    h: "7. Kontak",
    p: "Untuk pertanyaan privasi atau permintaan terkait data Anda, hubungi kami melalui halaman Hubungi Kami.",
  },
];

/** Slugify a numbered section heading into a stable in-page anchor id. */
function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PrivacyPage() {
  return (
    <main id="main-content" className="bg-surface-page">
      {/* Breadcrumb */}
      <div className="container-pad pt-10 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-secondary">
          <Link href="/" className="transition-colors hover:text-accent-cyan-strong">
            Beranda
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="text-text-primary">Kebijakan Privasi</span>
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
                <h1 className="mb-2 text-3xl font-bold text-text-primary md:text-4xl">Kebijakan Privasi</h1>
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
                  Dokumen ini merupakan ringkasan kebijakan dan dapat diperbarui. Versi final ditinjau oleh
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
