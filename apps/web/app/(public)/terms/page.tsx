import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Scale, FileText } from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Layanan — Hazl Academy",
  description:
    "Syarat dan ketentuan resmi penggunaan layanan platform edukasi Video AI, materi digital, dan sertifikasi Hazl Academy (PT Hazl Teknologi Solusi Edukasi).",
};

const sections = [
  {
    h: "1. Penerimaan Ketentuan",
    p: "Dengan mengakses, mendaftar, atau menggunakan platform Hazl Academy (termasuk situs web, materi e-course, video tutorial, workflow node, dan komunitas resmi), Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini serta Kebijakan Privasi kami. Jika Anda tidak menyetujui ketentuan ini, Anda tidak diperkenankan menggunakan layanan kami.",
  },
  {
    h: "2. Akun & Keamanan Akses",
    p: "Anda bertanggung jawab penuh untuk menjaga kerahasiaan kredensial akun, kata sandi, dan autentikasi multi-faktor Anda. Satu akun hanya diperuntukkan bagi 1 (satu) pengguna individu. Aktivitas sharing akun atau pembagian link akses workspace secara publik merupakan pelanggaran hak lisensi dan dapat mengakibatkan pemblokiran akun secara permanen tanpa kompensasi.",
  },
  {
    h: "3. Hak Kekayaan Intelektual & Lisensi Materi",
    p: "Seluruh video pembelajaran, silabus modul, template workflow ComfyUI, panduan prompt proprietary, dan dokumentasi teknis yang disediakan di Hazl Academy adalah hak kekayaan intelektual milik PT Hazl Teknologi Solusi Edukasi. Pengguna diberikan lisensi non-eksklusif dan non-transferabel untuk pembelajaran pribadi. Namun, aset visual atau video akhir yang dihasilkan sendiri oleh siswa melalui tools generatif (UGC / User Generated Content) sepenuhnya menjadi hak cipta siswa dan dapat digunakan untuk portofolio maupun tujuan komersial klien.",
  },
  {
    h: "4. Pembayaran, Transaksi & Verifikasi Duitku",
    p: "Semua transaksi diproses secara aman melalui payment gateway resmi berlisensi Bank Indonesia (Duitku). Biaya kursus dibayarkan secara penuh di muka (one-time payment) dan sudah termasuk biaya administrasi serta faktur elektronik resmi bertanda tangan digital. Bukti bayar elektronik diterbitkan otomatis setelah status callback gateway terkonfirmasi sukses.",
  },
  {
    h: "5. Kebijakan Jaminan & Pengembalian Dana (Refund)",
    p: "Hazl Academy menyediakan Garansi Kepuasan 7 Hari. Pengembalian dana penuh dapat diajukan dalam kurun waktu 7 (tujuh) hari kalender sejak tanggal transaksi, dengan syarat progres penyelesaian materi belum melebihi 20% dan belum mengunduh aset aset master/workflow pack khusus. Pengajuan dilakukan melalui portal dashboard pesanan atau email resmi ke halo@hazl.academy.",
  },
  {
    h: "6. Kredensial, Ujian Portofolio & Sertifikat",
    p: "Sertifikat resmi kelulusan Hazl Academy hanya diterbitkan kepada siswa yang telah menyelesaikan seluruh modul dan lulus verifikasi tugas portofolio akhir oleh mentor. Setiap sertifikat memiliki kode verifikasi kriptografis dan QR Code resmi yang tercatat di basis data verify.hazl.academy. Pemalsuan sertifikat merupakan tindakan melawan hukum.",
  },
  {
    h: "7. Batasan Tanggung Jawab & Layanan Pihak Ketiga",
    p: "Materi kami mengajarkan penggunaan berbagai engine generative AI pihak ketiga (seperti Kling AI, Runway, Midjourney, ElevenLabs). Hazl Academy tidak bertanggung jawab atas perubahan kebijakan, kuota harga API, atau downtime teknis dari server pihak ketiga tersebut. Kami berkomitmen untuk terus memperbarui panduan kurikulum mengikuti evolusi software.",
  },
  {
    h: "8. Yurisdiksi Hukum & Kontak Resmi",
    p: "Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Negara Kesatuan Republik Indonesia. Setiap perselisihan yang timbul akan diselesaikan secara musyawarah mufakat di Jakarta Pusat. Untuk pertanyaan hukum, hubungi legal@hazl.academy.",
  },
];

function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-screen bg-surface-page">
      {/* Breadcrumb Header */}
      <div className="border-b border-border-default bg-white">
        <div className="container-pad py-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-secondary">
            <Link href="/" className="transition-colors hover:text-accent-cyan-strong">
              Beranda
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="text-text-primary font-medium">Syarat &amp; Ketentuan</span>
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <div className="container-pad py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 lg:gap-12">
          {/* TOC sidebar */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-xl border border-border-default bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <FileText size={16} className="text-accent-cyan-strong" aria-hidden="true" />
                  Daftar Isi Ketentuan
                </h2>
                <nav className="flex flex-col gap-1">
                  {sections.map((s) => (
                    <a
                      key={s.h}
                      href={`#${sectionId(s.h)}`}
                      className="border-l-2 border-transparent px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-cyan-strong hover:bg-surface-page hover:text-accent-cyan-strong"
                    >
                      {s.h}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="rounded-xl border border-border-default bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <Scale size={16} className="text-accent-cyan-strong" aria-hidden="true" />
                  Informasi Badan Usaha
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong>PT Hazl Teknologi Solusi Edukasi</strong><br />
                  SK Menkumham No. AHU-0048291.AH.01.01<br />
                  Jakarta Pusat, Indonesia
                </p>
                <div className="border-t border-border-default pt-2 text-[11px] text-text-muted">
                  Versi Regulasi 2.4 — 2026
                </div>
              </div>
            </div>
          </aside>

          {/* Legal article */}
          <article className="md:col-span-8 lg:col-span-9">
            <div className="rounded-2xl border border-border-default bg-white p-6 md:p-10 shadow-sm">
              <header className="mb-8 border-b border-border-default pb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3 py-0.5 text-xs font-semibold text-accent-cyan-strong mb-3">
                  DOKUMEN HUKUM RESMI
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">
                  Syarat &amp; Ketentuan Layanan
                </h1>
                <p className="mt-2 text-xs md:text-sm text-text-secondary">
                  Berlaku efektif sejak 1 Januari 2026. Mengikat seluruh pengguna ekosistem pembelajaran Hazl Academy.
                </p>
              </header>

              <div className="space-y-8">
                {sections.map((s) => (
                  <section key={s.h} id={sectionId(s.h)} className="scroll-mt-28">
                    <h2 className="mb-2.5 text-base md:text-lg font-bold text-text-primary">
                      {s.h}
                    </h2>
                    <p className="text-xs md:text-sm leading-relaxed text-[#3C3C43]">
                      {s.p}
                    </p>
                  </section>
                ))}
              </div>

              <blockquote className="mt-10 flex gap-3.5 rounded-xl border border-border-default bg-surface-page p-5 text-xs md:text-sm text-text-secondary">
                <ShieldCheck size={22} className="shrink-0 text-accent-cyan-strong mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">
                  Dokumen ini telah diselaraskan dengan Undang-Undang Informasi dan Transaksi Elektronik (UU ITE) serta regulasi perlindungan konsumen Republik Indonesia. Apabila terdapat pertanyaan mengenai ketentuan ini, hubungi tim legal kami di legal@hazl.academy.
                </span>
              </blockquote>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
