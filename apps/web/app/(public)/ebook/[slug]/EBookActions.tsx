"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, BookOpen, Download } from "lucide-react";
import { getToken } from "@/lib/auth/token";
import { API_BASE } from "@/lib/api/base";

type Props = {
  ebookSlug: string;
  price: number;
};

// Intentionally NOT the shared getApiBase() helper: that one returns "" in the
// browser so calls go through the Next.js /api proxy, while this component talks
// to the API host directly. API_BASE (always absolute) preserves that transport
// behaviour; switching to the proxy stays a deliberate future migration.
function getApiBase() {
  return API_BASE;
}


export default function EBookActions({ ebookSlug, price }: Props) {
  const router = useRouter();
  const [hasPurchased, setHasPurchased] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    // Check if the user already owns it. The backend resolves this endpoint by
    // SLUG (not id), so we must pass ebookSlug here (H2) — passing the id 404'd
    // and the owned-file buttons never appeared for paying customers.
    fetch(`${getApiBase()}/api/ebooks/${ebookSlug}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHasPurchased(true);
          setFileUrl(data.data.fileUrl);
        }
        // A non-success body is the normal "not purchased yet" answer, so it
        // must NOT surface as an error — only a failed request does, below.
      })
      .catch(() => {
        setError("Gagal memeriksa status pembelian. Muat ulang halaman untuk mencoba lagi.");
      });
  }, [ebookSlug]);

  function handleBuy() {
    // Keep the button in its loading state until the checkout route takes over;
    // this component unmounts on navigation, so there is nothing to reset.
    setBuying(true);
    router.push(`/checkout/${ebookSlug}?type=ebook`);
  }

  if (hasPurchased && fileUrl) {
    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `${getApiBase()}${fileUrl}`;
    return (
      <div className="space-y-3">
        <div
          className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
          style={{ background: "rgba(22,163,74,0.08)", borderColor: "rgba(22,163,74,0.2)", color: "#15803D" }}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Anda sudah memiliki e-book ini
        </div>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full justify-center"
        >
          <BookOpen size={17} aria-hidden="true" />
          Baca E-Book
        </a>
        <a
          href={fullUrl}
          download
          className="btn btn-outline w-full justify-center"
        >
          <Download size={17} aria-hidden="true" />
          Unduh PDF
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)", color: "#B91C1C" }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handleBuy}
        disabled={buying}
        className="btn btn-lg w-full justify-center bg-brand-gradient text-white shadow-e1 hover:opacity-90 disabled:opacity-60"
      >
        {buying ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Memproses...
          </>
        ) : (
          `Beli – Rp ${Number(price).toLocaleString("id-ID")}`
        )}
      </button>
      <p className="text-center text-xs text-[var(--text-muted)]">Akses seumur hidup setelah pembelian</p>
    </div>
  );
}
