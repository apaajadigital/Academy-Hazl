import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Lock, FileCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi & PDP — Hazl Academy",
  description:
    "Kebijakan privasi resmi Hazl Academy (PT Hazl Teknologi Solusi Edukasi) — tata cara pengumpulan, pemrosesan, dan pelindungan data pribadi pengguna sesuai UU PDP No. 27/2022.",
};

const sections = [
  {
    h: "1. Komitmen Pelindungan Data Pribadi",
    p: "PT Hazl Teknologi Solusi Edukasi berkomitmen untuk melindungi privasi setiap peserta, instruktur, dan mitra korporat di platform Hazl Academy. Kebijakan ini disusun berdasarkan Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).",
  },
  {
    h: "2. Data Pribadi yang Kami Kumpulkan",
    p: "Kami mengumpulkan data yang Anda berikan secara langsung saat registrasi akun dan interaksi belajar: Nama Lengkap (untuk penerbitan sertifikat), Alamat Email, Nomor WhatsApp, Kata Sandi (yang di-hash secara aman menggunakan algoritma bcrypt/Argon2), serta detail profil opsional. Kami juga mencatat data teknis seperti alamat IP, user-agent peramban, dan log autentikasi guna mencegah aktivitas fraud atau brute-force.",
  },
  {
    h: "3. Tujuan Pemrosesan Data",
    p: "Data pribadi Anda diproses untuk: (a) Pengelolaan akun dan akses materi kursus Video AI, (b) Pemrosesan pembayaran dan penerbitan faktur pajak resmi melalui payment gateway Duitku, (c) Penerbitan kredensial dan sertifikat digital ber-QR code, (d) Notifikasi transaksional dan pembaruan kurikulum materi, serta (e) Kebutuhan pelaporan analitik progres karyawan pada paket B2B LMS.",
  },
  {
    h: "4. Hak-Hak Subjek Data Sesuai UU PDP",
    p: "Sebagai pemilik data pribadi, Anda memiliki hak penuh untuk: (1) Mengakses dan meminta salinan data profil yang tersimpan, (2) Memperbarui data yang tidak akurat melalui dashboard pengaturan profil, (3) Menarik persetujuan pemrosesan data, dan (4) Meminta penghapusan akun (right to erasure). Data transaksi keuangan tetap diarsipkan sesuai kewajiban pembukuan hukum perpajakan Republik Indonesia.",
  },
  {
    h: "5. Keamanan & Enkripsi Data",
    p: "Seluruh pertukaran data antara browser Anda dan server kami dienkripsi menggunakan protokol TLS 1.3 standar industri. Token sesi pengguna disimpan dalam cookie HttpOnly bertanda SameSite=Lax untuk mencegah serangan XSS/CSRF. Database kami diproteksi firewall terisolasi dan audit log berkala.",
  },
  {
    h: "6. Pembagian Data kepada Pihak Ketiga Tepercaya",
    p: "Kami tidak pernah menjual data pribadi Anda kepada pihak mana pun. Data hanya dibagikan kepada penyedia infrastruktur esensial: Payment Gateway Duitku (untuk settlement perbankan), penyedia komputasi cloud, serta penyedia layanan email transaksional resmi.",
  },
  {
    h: "7. Kontak Data Protection Officer (DPO)",
    p: "Apabila Anda memiliki pertanyaan, permohonan eksekusi hak data, atau kendala terkait privasi, hubungi Data Protection Officer (DPO) Hazl Academy melalui dpo@hazl.academy atau surat tertulis ke kantor operasional kami di Jakarta Pusat.",
  },
];

function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PrivacyPage() {
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
            <span className="text-text-primary font-medium">Kebijakan Privasi</span>
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
                  <FileCheck size={16} className="text-accent-cyan-strong" aria-hidden="true" />
                  Daftar Klausul Privasi
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
                  <Lock size={16} className="text-accent-cyan-strong" aria-hidden="true" />
                  Kepatuhan Regulasi
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Sesuai <strong>UU PDP No. 27/2022</strong> &amp; Enkripsi TLS 1.3 End-to-End.
                </p>
                <div className="border-t border-border-default pt-2 text-[11px] text-text-muted">
                  DPO: dpo@hazl.academy
                </div>
              </div>
            </div>
          </aside>

          {/* Legal article */}
          <article className="md:col-span-8 lg:col-span-9">
            <div className="rounded-2xl border border-border-default bg-white p-6 md:p-10 shadow-sm">
              <header className="mb-8 border-b border-border-default pb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3 py-0.5 text-xs font-semibold text-accent-cyan-strong mb-3">
                  PELINDUNGAN DATA PRIBADI (UU PDP)
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">
                  Kebijakan Privasi
                </h1>
                <p className="mt-2 text-xs md:text-sm text-text-secondary">
                  Berlaku sejak 1 Januari 2026. Menjamin hak privasi seluruh pengguna ekosistem Hazl Academy.
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
                  Hazl Academy menerapkan prinsip integritas dan akuntabilitas data. Setiap permintaan akses, pembetulan, atau penghapusan data akan ditanggapi oleh tim DPO kami dalam waktu maksimal 3×24 jam kerja.
                </span>
              </blockquote>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
