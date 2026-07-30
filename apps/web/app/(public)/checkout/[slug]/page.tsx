"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { getStoredReferral, clearStoredReferral } from "@/lib/affiliate/referral";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemInfo = {
  id: string;
  title: string;
  price: number;
  coverUrl?: string | null;
  /** "course" | "event" | "ebook" */
  itemType: "course" | "event" | "ebook";
  /** Extra label shown below title */
  subtitle?: string;
};

type CouponResult = {
  code: string;
  discountAmount: number;
  finalAmount: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Default export component parameters promise bug fixed in P2
function getApiBase() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

// Format Rp helper
function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug as string;

  /**
   * type=event  → checkout mode event (itemId must be provided via query)
   * type=ebook  → checkout mode ebook (slug is the ebook slug)
   * type=course (or absent) → checkout mode course (slug is the course slug)
   */
  const itemType = (searchParams.get("type") ?? "course") as "course" | "event" | "ebook";
  // For event checkout the UUID is passed explicitly; for course/ebook we resolve it via the API
  const queryItemId = searchParams.get("itemId");

  const [item, setItem] = useState<ItemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch item data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchItem() {
      // Finding #4: resolve a valid (refresh-aware) token so we never send
      // `Bearer null`; redirect to /masuk when there is no usable session.
      const token = await getValidToken();
      if (!token) {
        const returnPath = `/checkout/${slug}${window.location.search}`;
        router.push(`/masuk?redirect=${encodeURIComponent(returnPath)}`);
        return;
      }

      try {
        if (itemType === "event") {
          // Fetch event by slug — we use slug in URL for readability; UUID comes via queryItemId
          const res = await fetch(`${getApiBase()}/api/events/${slug}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.data) {
            const ev = data.data;
            const price = ev.salePrice ? Number(ev.salePrice) : Number(ev.price);
            setItem({
              id: ev.id,
              title: ev.title,
              price,
              coverUrl: ev.coverUrl,
              itemType: "event",
              subtitle: "Tiket event — akses sesuai tanggal pelaksanaan",
            });
          } else {
            setError("Event tidak ditemukan.");
          }
        } else if (itemType === "ebook") {
          const res = await fetch(`${getApiBase()}/api/ebooks/${slug}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.data) {
            const ebook = data.data;
            setItem({
              id: ebook.id,
              title: ebook.title,
              price: Number(ebook.salePrice ?? ebook.price),
              coverUrl: ebook.coverUrl,
              itemType: "ebook",
              subtitle: "Akses seumur hidup setelah pembelian",
            });
          } else {
            setError("E-Book tidak ditemukan.");
          }
        } else {
          // Default: course
          const res = await fetch(`${getApiBase()}/api/courses/${slug}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.data) {
            const course = data.data;
            setItem({
              id: course.id,
              title: course.title,
              price: Number(course.price),
              // Courses store their image in `thumbnailUrl` — there is no
              // `coverUrl` column on Course (that name belongs to Event/Ebook),
              // so reading it always fell through to the emoji placeholder.
              coverUrl: course.thumbnailUrl,
              itemType: "course",
              subtitle: "Akses seumur hidup",
            });
          } else {
            setError("Kursus tidak ditemukan.");
          }
        }
      } catch {
        setError("Gagal memuat data. Coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [slug, itemType, queryItemId, router]);

  // ── Coupon ───────────────────────────────────────────────────────────────────
  async function applyCoupon() {
    if (!couponCode.trim() || !item) return;
    // Finding #4: use a refresh-aware token; bounce to /masuk if the session is gone.
    const token = await getValidToken();
    if (!token) { router.push(`/masuk?redirect=${encodeURIComponent(`/checkout/${slug}${window.location.search}`)}`); return; }
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch(`${getApiBase()}/api/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: couponCode, subtotal: item.price }),
      });
      const data = await res.json();
      if (data.success) {
        setCoupon(data.data);
      } else {
        setCouponError(data.error?.message ?? "Kupon tidak valid.");
        setCoupon(null);
      }
    } catch {
      setCouponError("Gagal memvalidasi kupon.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  // ── Checkout ─────────────────────────────────────────────────────────────────
  async function handleCheckout() {
    if (!item) return;
    // Finding #4: use a refresh-aware token; bounce to /masuk if the session is gone.
    const token = await getValidToken();
    if (!token) { router.push(`/masuk?redirect=${encodeURIComponent(`/checkout/${slug}${window.location.search}`)}`); return; }
    setCheckingOut(true);
    setError("");
    try {
      const res = await fetch(`${getApiBase()}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemType: item.itemType,
          itemId: item.id,
          couponCode: coupon?.code,
          referralCode: getStoredReferral() ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        clearStoredReferral();
        if (data.data.free) {
          const redirectUrl =
            itemType === "ebook"
              ? `/ebook/${slug}`
              : itemType === "event"
                ? `/event/${slug}`
                : `/belajar/${slug}`;
          window.location.href = redirectUrl;
        } else {
          // paymentUrl is the DOKU hosted payment page
          window.location.href = data.data.paymentUrl;
        }
      } else {
        setError(data.error?.message ?? "Gagal memproses checkout.");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setCheckingOut(false);
    }
  }

  // ── Design tokens per item type ───────────────────────────────────────────────
  const accentColor  = itemType === "event" ? "#7C3AED" : itemType === "ebook" ? "#2563EB" : "var(--brand-cyan-strong)";
  const accentBg     = itemType === "event" ? "rgba(124,58,237,0.08)" : itemType === "ebook" ? "rgba(37,99,235,0.08)" : "var(--surface-accent-soft)";
  const accentBorder = itemType === "event" ? "rgba(124,58,237,0.2)" : itemType === "ebook" ? "rgba(37,99,235,0.2)" : "rgba(0,119,168,0.15)";
  const coverEmoji   = itemType === "event" ? "🎤" : itemType === "ebook" ? "📖" : "📚";

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--surface-page)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--brand-cyan-strong)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // ── Error state (item not found) ──────────────────────────────────────────────
  if (error && !item) {
    const backHref = itemType === "event" ? "/event" : itemType === "ebook" ? "/ebook" : "/e-course";
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
        style={{ background: "var(--surface-page)" }}
      >
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <p className="mb-3 flex items-center justify-center gap-2 font-semibold" style={{ color: "#B91C1C" }}>
            <AlertCircle size={18} aria-hidden="true" /> {error}
          </p>
          <Link href={backHref} className="btn btn-outline btn-sm">
            {itemType === "event" ? "← Kembali ke Event" : itemType === "ebook" ? "← Kembali ke E-Book" : "← Kembali ke E-Course"}
          </Link>
        </div>
      </div>
    );
  }

  const finalAmount = coupon ? coupon.finalAmount : (item?.price ?? 0);
  const priceLabel  = itemType === "event" ? "Harga tiket" : itemType === "ebook" ? "Harga e-book" : "Harga kursus";

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-4xl px-4 py-12">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Link
            href={itemType === "event" ? "/event" : itemType === "ebook" ? "/ebook" : "/e-course"}
            className="transition-colors hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            {itemType === "event" ? "Event" : itemType === "ebook" ? "E-Book" : "E-Course"}
          </Link>
          <span aria-hidden="true" style={{ color: "var(--border-strong)" }}>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Checkout</span>
        </nav>

        <h1
          className="mb-8 text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          {itemType === "event" ? "Pembelian Tiket" : "Checkout"}
        </h1>

        <div className="grid gap-8 md:grid-cols-5">

          {/* ── Left column: summary + coupon ─────────────────────────────────── */}
          <div className="space-y-5 md:col-span-3">

            {/* Item summary card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-e1)",
              }}
            >
              <h2 className="mb-5 font-semibold" style={{ color: "var(--text-primary)" }}>
                Ringkasan Pesanan
              </h2>

              <div className="flex gap-4">
                {/* Thumbnail */}
                <div
                  className="flex h-14 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                >
                  {item?.coverUrl ? (
                    <Image src={item.coverUrl} alt={item.title} width={80} height={56} className="h-full w-full object-cover" />
                  ) : (
                    coverEmoji
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" style={{ color: "var(--text-primary)" }}>
                    {item?.title}
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {item?.subtitle}
                  </p>
                  {/* Type badge */}
                  <span
                    className="badge mt-2"
                    style={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
                  >
                    {itemType === "event" ? "Event" : itemType === "ebook" ? "E-Book" : "E-Course"}
                  </span>
                </div>
              </div>

              {/* Price breakdown */}
              <div
                className="mt-5 space-y-2.5 border-t pt-5"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>{priceLabel}</span>
                  <span>{item ? formatRp(item.price) : "—"}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-sm" style={{ color: "#16A34A" }}>
                    <span>Diskon ({coupon.code})</span>
                    <span>-{formatRp(coupon.discountAmount)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between border-t pt-3 font-semibold"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  <span>Total Pembayaran</span>
                  <span style={{ color: accentColor }}>{formatRp(finalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Coupon card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-e1)",
              }}
            >
              <h2 className="mb-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                Kode Kupon
              </h2>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    id="coupon-input"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode kupon"
                    className="input-dark w-full pl-11"
                  />
                </div>
                <button
                  id="coupon-apply-btn"
                  onClick={applyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {validatingCoupon ? (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                      style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }}
                    />
                  ) : (
                    "Terapkan"
                  )}
                </button>
              </div>
              {couponError && (
                <p className="mt-2 text-sm" style={{ color: "#DC2626" }}>
                  {couponError}
                </p>
              )}
              {coupon && (
                <p className="mt-2 text-sm font-medium" style={{ color: "#16A34A" }}>
                  ✓ Kupon berhasil! Hemat {formatRp(coupon.discountAmount)}
                </p>
              )}
            </div>
          </div>

          {/* ── Right column: pay action ───────────────────────────────────────── */}
          <div className="md:col-span-2">
            <div
              className="sticky top-6 rounded-2xl p-6"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-e2)",
              }}
            >
              {/* Total display */}
              <div className="mb-6">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Total yang harus dibayar
                </p>
                <p
                  className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                >
                  {formatRp(finalAmount)}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mb-4 rounded-xl p-3 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.05)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#B91C1C",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Pay button */}
              <button
                id="checkout-pay-btn"
                onClick={handleCheckout}
                disabled={checkingOut}
                className="btn bg-brand-gradient btn-lg group w-full justify-center text-white shadow-e1 hover:opacity-90 hover:shadow-e2"
                style={{ opacity: checkingOut ? 0.7 : 1 }}
              >
                {checkingOut ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                      style={{ borderColor: "#fff", borderTopColor: "transparent" }}
                    />
                    Memproses...
                  </>
                ) : (
                  <>
                    Bayar Sekarang
                    <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {/* Security badge */}
              <p
                className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <Lock size={14} aria-hidden="true" /> Pembayaran aman melalui DOKU
              </p>

              {/* Terms */}
              <div
                className="mt-4 border-t pt-4"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  Dengan melanjutkan, Anda menyetujui{" "}
                  <Link
                    href="/terms"
                    className="font-semibold hover:underline"
                    style={{ color: "var(--brand-cyan-strong)" }}
                  >
                    Syarat &amp; Ketentuan
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper (Suspense required for useSearchParams) ─────────────────────

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--surface-page)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--brand-cyan-strong)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
