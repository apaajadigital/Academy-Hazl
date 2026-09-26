"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Info, BookMarked, BookOpen, Calendar, Download, Loader2 } from "lucide-react";
import { EmptyState, DashboardLoading } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type EBook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  purchasedAt: string;
};

export default function EbookPage() {
  const router = useRouter();
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);

  async function handleDownload(slug: string) {
    const token = await getValidToken();
    if (!token) return;
    setDownloadingSlug(slug);
    try {
      const res = await fetch(`/api/ebooks/${slug}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (body.success && body.data?.fileUrl) {
        window.open(body.data.fileUrl, "_blank");
      } else {
        alert(body.error?.message ?? "Gagal mendapatkan tautan unduhan.");
      }
    } catch {
      alert("Gagal mengunduh e-book.");
    } finally {
      setDownloadingSlug(null);
    }
  }

  useEffect(() => {
    async function load() {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      fetch(`/api/ebooks/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((body) => {
          if (body.success && Array.isArray(body.data)) {
            setEbooks(body.data);
          } else {
            setError(body.error?.message ?? "Gagal memuat e-book.");
          }
        })
        .catch(() => {
          setError("Gagal memuat e-book.");
        })
        .finally(() => setLoading(false));
    }
    load();
  }, [router]);

  if (loading) {
    return <DashboardLoading label="Memuat e-book…" />;
  }

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">E-Book Saya</h1>
          <p className="mt-1 text-sm text-text-secondary">{ebooks.length} e-book tersedia untuk diunduh</p>
        </div>
        <Link
          href="/ebook"
          className="inline-flex items-center gap-2 rounded-full bg-accent-purple px-5 py-2 text-sm font-semibold text-white shadow-e1 transition-opacity hover:opacity-90"
        >
          <ShoppingBag size={16} aria-hidden="true" /> Beli E-Book
        </Link>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[rgba(0,119,168,0.15)] bg-surface-accent-soft px-4 py-4">
        <Info size={17} className="mt-0.5 flex-shrink-0 text-accent-cyan-strong" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-text-primary">
          E-Book Anda tersimpan di Google Drive. Klik tombol <strong>Unduh PDF</strong> untuk mengakses file.
          Akses berlaku selamanya setelah pembelian.
        </p>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {ebooks.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Belum Ada E-Book"
          description="Beli e-book premium untuk mendapatkan materi pembelajaran berkualitas tinggi dalam format PDF."
          action={
            <Link
              href="/ebook"
              className="inline-flex items-center rounded-full bg-accent-purple px-6 py-3 text-sm font-semibold text-white shadow-e1 transition-opacity hover:opacity-90"
            >
              Jelajahi E-Book
            </Link>
          }
        />
      ) : (
        <div className="dash-grid">
          {ebooks.map((book) => (
            <div
              key={book.id}
              className="group col-span-12 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e3 md:col-span-6 xl:col-span-4"
            >
              {/* Cover */}
              <div className="relative h-40 flex-shrink-0 overflow-hidden bg-accent-purple/10">
                {book.coverUrl ? (
                  <Image src={book.coverUrl} alt={book.title} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <BookOpen size={40} className="text-accent-purple" aria-hidden="true" />
                    <span className="rounded-full bg-accent-purple/10 px-2 py-0.5 text-[11px] font-extrabold tracking-widest text-accent-purple">PDF</span>
                  </div>
                )}
                <span className="absolute right-2.5 top-2.5 rounded-full bg-accent-purple px-2 py-1 text-[10px] font-bold text-white">E-Book</span>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-display text-sm font-bold leading-snug text-text-primary line-clamp-2">{book.title}</h3>
                {book.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">{book.description}</p>
                )}
                <p className="mt-auto inline-flex items-center gap-2 text-[11px] text-text-muted">
                  <Calendar size={13} aria-hidden="true" />
                  Dibeli: {new Date(book.purchasedAt).toLocaleDateString("id-ID", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleDownload(book.slug)}
                    disabled={downloadingSlug === book.slug}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent-purple px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {downloadingSlug === book.slug
                      ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Memuat...</>
                      : <><Download size={14} aria-hidden="true" /> Unduh PDF</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
