"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconLock as Lock,
  IconAlertCircle as AlertCircle,
  IconCheckCircle as CheckCircle2,
  IconShieldCheck as ShieldCheck,
  IconZap as Zap,
  IconHelpCircle as HelpCircle,
  IconMail as Mail,
  IconUser as User,
  IconInfinity as InfinityIcon,
  IconTerminal as Terminal,
  IconMessageSquare as MessageSquare,
  IconAward as Award,
  IconCreditCard as CreditCard,
} from "./CheckoutIcons";
import { getValidToken } from "@/lib/auth/token";
import { getStoredReferral, clearStoredReferral } from "@/lib/affiliate/referral";
import { getApiBase } from "@/lib/api/base";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemInfo = {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  coverUrl?: string | null;
  /** "course" | "event" | "ebook" */
  itemType: "course" | "event" | "ebook";
  subtitle?: string;
  mentorName?: string;
};

type CouponResult = {
  code: string;
  discountAmount: number;
  finalAmount: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function decodeUserToken(token: string): { name?: string; email?: string } | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    return JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

// ─── Main Checkout Content ───────────────────────────────────────────────────

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug as string);
  const itemType = (searchParams.get("type") ?? "course") as "course" | "event" | "ebook";
  const queryItemId = searchParams.get("itemId");

  const [item, setItem] = useState<ItemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Student Account Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Payment Method Selection
  const [paymentCategory, setPaymentCategory] = useState<"qris" | "va" | "credit_card">("qris");
  const [selectedVaBank, setSelectedVaBank] = useState<"va_bca" | "va_mandiri" | "va_bni" | "va_bri" | "va_permata">("va_bca");

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submission State
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch Item Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchItem() {
      if (!slug) return;

      const token = await getValidToken();

      // Prefill user details from token payload if available
      if (token) {
        const userPayload = decodeUserToken(token);
        if (userPayload) {
          if (userPayload.name) setFullName((prev) => prev || userPayload.name || "");
          if (userPayload.email) setEmail((prev) => prev || userPayload.email || "");
        }
      }

      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        if (itemType === "event") {
          const res = await fetch(`${getApiBase()}/api/events/${slug}`, { headers });
          const data = await res.json();
          if (data.success && data.data) {
            const ev = data.data;
            const price = ev.salePrice ? Number(ev.salePrice) : Number(ev.price);
            setItem({
              id: ev.id,
              title: ev.title,
              price,
              originalPrice: ev.price ? Number(ev.price) : Math.round(price * 1.4),
              coverUrl: ev.coverUrl,
              itemType: "event",
              subtitle: "Tiket event — akses sesuai tanggal pelaksanaan",
              mentorName: ev.speaker ?? "Hazl Event Specialist",
            });
          } else {
            setError("Event tidak ditemukan.");
          }
        } else if (itemType === "ebook") {
          const res = await fetch(`${getApiBase()}/api/ebooks/${slug}`, { headers });
          const data = await res.json();
          if (data.success && data.data) {
            const ebook = data.data;
            const price = Number(ebook.salePrice ?? ebook.price);
            setItem({
              id: ebook.id,
              title: ebook.title,
              price,
              originalPrice: ebook.price ? Number(ebook.price) : Math.round(price * 1.5),
              coverUrl: ebook.coverUrl,
              itemType: "ebook",
              subtitle: "E-Book resmi + modul praktik digital",
              mentorName: ebook.author ?? "Hazl Engineering Team",
            });
          } else {
            setError("E-Book tidak ditemukan.");
          }
        } else {
          // Default: Course
          const res = await fetch(`${getApiBase()}/api/courses/${slug}`, { headers });
          const data = await res.json();
          if (data.success && data.data) {
            const course = data.data;
            const price = Number(course.salePrice ?? course.price);
            const rawOriginal = course.price ? Number(course.price) : price;
            const calculatedOriginal = rawOriginal > price ? rawOriginal : Math.round(price * 1.7);
            setItem({
              id: course.id,
              title: course.title,
              price,
              originalPrice: calculatedOriginal,
              coverUrl: course.thumbnailUrl,
              itemType: "course",
              subtitle: "Akses materi selamanya & kurikulum industri",
              mentorName: course.trainer?.name ?? course.instructor?.name ?? "Instruktur Senior Hazl",
            });
          } else {
            setError("Kursus tidak ditemukan.");
          }
        }
      } catch (err) {
        console.error("Fetch checkout item error:", err);
        setError("Gagal memuat data. Coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [slug, itemType, queryItemId, router]);

  // ── Apply Coupon ─────────────────────────────────────────────────────────────
  async function applyCoupon() {
    if (!couponCode.trim() || !item) return;
    const token = await getValidToken();
    if (!token) {
      router.push(`/masuk?redirect=${encodeURIComponent(`/checkout/${slug}${window.location.search}`)}`);
      return;
    }
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
        setCouponError(data.error?.message ?? "Kupon tidak valid atau sudah habis.");
        setCoupon(null);
      }
    } catch {
      setCouponError("Gagal memvalidasi kupon. Silakan coba lagi.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  // ── Checkout Action ──────────────────────────────────────────────────────────
  async function handleCheckout() {
    if (!item) return;
    const token = await getValidToken();
    if (!token) {
      router.push(`/masuk?redirect=${encodeURIComponent(`/checkout/${slug}${window.location.search}`)}`);
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError("Mohon lengkapi Nama dan Email Anda.");
      return;
    }

    setCheckingOut(true);
    setError("");

    try {
      // Map frontend selected channel to backend paymentMethod code
      let selectedChannelCode = "qris";
      if (paymentCategory === "va") {
        selectedChannelCode = selectedVaBank;
      } else if (paymentCategory === "credit_card") {
        selectedChannelCode = "credit_card";
      }

      const res = await fetch(`${getApiBase()}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.itemType,
          couponCode: coupon?.code,
          refCode: getStoredReferral() ?? undefined,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() ? phone.trim() : undefined,
          paymentMethod: selectedChannelCode,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Checkout gagal. Silakan coba beberapa saat lagi.");
        return;
      }

      clearStoredReferral();

      // Free item (100% coupon or 0 price)
      if (data.data?.isFree || data.data?.status === "PAID") {
        router.push(`/payment/success?orderId=${data.data.orderId}`);
        return;
      }

      // Paid item via Duitku redirect
      if (data.data?.paymentUrl) {
        window.location.href = data.data.paymentUrl;
        return;
      }

      // Fallback if paymentUrl not directly provided
      router.push(`/payment/pending?orderId=${data.data.orderId}`);
    } catch {
      setError("Terjadi kendala koneksi ke gateway. Silakan coba lagi.");
    } finally {
      setCheckingOut(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#005d85] border-t-transparent" />
          <span className="text-sm text-[#707880]">Memuat rincian pesanan...</span>
        </div>
      </div>
    );
  }

  // ── Error state (Item not found) ────────────────────────────────────────────
  if (error && !item) {
    const backHref = itemType === "event" ? "/event" : itemType === "ebook" ? "/ebook" : "/e-course";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f9f9ff] px-4">
        <div className="max-w-md w-full rounded-2xl border border-[#bfc7d0]/60 bg-white p-6 text-center shadow-none">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={24} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1b21] mb-1">Pesanan Tidak Ditemukan</h2>
          <p className="text-sm text-[#707880] mb-5">{error}</p>
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-full bg-[#005d85] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#004c6d]"
          >
            ← Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }
  if (!item) return null; // loading/error handled above; this satisfies TS null-narrowing for the JSX below.

  const discount = coupon?.discountAmount ?? 0;
  const finalPrice = coupon?.finalAmount ?? item!.price;
  const originalPrice = item?.originalPrice ?? Math.round(item!.price * 1.5);
  const promoDiscount = originalPrice - item!.price;
  const discountPercent = Math.round((promoDiscount / originalPrice) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9ff] text-[#1a1b21] antialiased">
      {/* ── TopNavBar (Checkout Header) ────────────────────────────────────── */}
      <header className="bg-white border-b border-[#bfc7d0]/60 sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
          {/* Brand Logo Anchor */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xl font-bold text-[#005d85] tracking-tight flex items-center space-x-2"
            >
              <span>Hazl Academy</span>
            </Link>
            <div className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#ededf4] text-[#3f484f] text-xs space-x-1.5 font-medium">
              <Lock size={12} className="text-[#005d85]" />
              <span>Checkout Terenkripsi 256-Bit SSL</span>
            </div>
          </div>

          {/* Trailing Actions */}
          <div className="flex items-center space-x-4">
            <div className="inline-flex sm:hidden items-center text-[#005d85] text-xs font-medium">
              <Lock size={12} className="mr-1" />
              <span>SSL 256-Bit</span>
            </div>
            <Link
              href="/faq"
              className="inline-flex items-center text-[#3f484f] hover:text-[#005d85] text-sm transition-colors duration-150 space-x-1 py-1 px-3 rounded-lg hover:bg-[#f3f3fa]"
            >
              <HelpCircle size={16} className="text-[#005d85]" />
              <span>Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content Canvas ────────────────────────────────────────────── */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Step Indicator Progress */}
        <div className="mb-8 max-w-2xl">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#005d85] text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span className="text-sm font-semibold text-[#1a1b21]">Informasi Akun</span>
            </div>
            <div className="w-8 h-[2px] bg-[#005d85]"></div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#005d85] text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span className="text-sm font-semibold text-[#1a1b21]">Metode Pembayaran</span>
            </div>
          </div>
          <p className="text-xs text-[#707880] mt-2">
            Pastikan rincian akun Anda benar untuk pengiriman token dan kredensial LMS seketika.
          </p>
        </div>

        {/* 2 Column Layout (Grid 7:5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Payment Methods (7 Cols) */}
          <section className="lg:col-span-7 space-y-6">
            {/* Step 1: Student Account Information Form */}
            <div className="bg-white rounded-xl border border-[#bfc7d0]/60 p-6 space-y-5 shadow-none">
              <div className="flex items-center justify-between border-b border-[#bfc7d0]/40 pb-4">
                <h2 className="text-lg font-bold text-[#1a1b21] flex items-center space-x-2">
                  <User size={20} className="text-[#005d85]" />
                  <span>1. Data Penerima Akses Siswa</span>
                </h2>
                <span className="text-xs text-[#005d85] font-medium flex items-center bg-[#c1e8ff]/50 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={14} className="mr-1 text-[#005d85]" />
                  Auto-Sync LMS
                </span>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="full_name"
                    className="block text-sm font-medium text-[#1a1b21] mb-1.5"
                  >
                    Nama Lengkap (Sesuai Sertifikat)
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full h-10 px-3.5 rounded-lg border border-[#bfc7d0]/70 bg-white text-[#1a1b21] text-sm focus:outline-none focus:border-[#005d85] focus:ring-2 focus:ring-[#86cfff]/40 transition-all"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#1a1b21] mb-1.5"
                  >
                    Email Perusahaan / Penerima Akses LMS
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@domain.com"
                      className="w-full h-10 px-3.5 pr-10 rounded-lg border border-[#bfc7d0]/70 bg-white text-[#1a1b21] text-sm focus:outline-none focus:border-[#005d85] focus:ring-2 focus:ring-[#86cfff]/40 transition-all"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#707880]">
                      <Mail size={16} />
                    </span>
                  </div>
                  <p className="text-xs text-[#707880] mt-1">
                    Undangan ruang kerja GitHub Classroom dan akses platform Hazl akan dikirim ke email ini.
                  </p>
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label
                    htmlFor="whatsapp"
                    className="block text-sm font-medium text-[#1a1b21] mb-1.5"
                  >
                    Nomor WhatsApp Aktif
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-sm font-medium text-[#707880]">+62</span>
                    </div>
                    <input
                      id="whatsapp"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="812-XXXX-XXXX"
                      className="w-full h-10 pl-14 pr-3.5 rounded-lg border border-[#bfc7d0]/70 bg-white text-[#1a1b21] text-sm focus:outline-none focus:border-[#005d85] focus:ring-2 focus:ring-[#86cfff]/40 transition-all"
                    />
                  </div>
                  <p className="text-xs text-[#707880] mt-1">
                    Digunakan untuk konfirmasi aktivasi instan dan pengiriman invoice resmi.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Payment Methods Selection */}
            <div className="bg-white rounded-xl border border-[#bfc7d0]/60 p-6 space-y-5 shadow-none">
              <div className="flex items-center justify-between border-b border-[#bfc7d0]/40 pb-4">
                <h2 className="text-lg font-bold text-[#1a1b21] flex items-center space-x-2">
                  <CreditCard size={20} className="text-[#005d85]" />
                  <span>2. Pilih Metode Pembayaran Terakreditasi</span>
                </h2>
              </div>

              <div className="space-y-3" id="payment-options">
                {/* Option 1: QRIS */}
                <label
                  onClick={() => setPaymentCategory("qris")}
                  className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all ${
                    paymentCategory === "qris"
                      ? "border-2 border-[#005d85] bg-[#c8e6ff]/20"
                      : "border border-[#bfc7d0]/60 hover:border-[#707880]"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="qris"
                    checked={paymentCategory === "qris"}
                    onChange={() => setPaymentCategory("qris")}
                    className="mt-1 h-4 w-4 text-[#005d85] border-[#707880] focus:ring-[#005d85]"
                  />
                  <div className="ml-3.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-[#1a1b21] font-semibold">QRIS Terpadu (Instan)</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#c1e8ff] text-[#005d85] text-xs font-semibold">
                          Rekomendasi Cepat
                        </span>
                      </div>
                      <span className="text-xs text-[#00789e] font-medium">Bebas Biaya Transaksi</span>
                    </div>
                    <p className="text-xs text-[#707880] mt-1">
                      Pindai QR kode dengan GoPay, OVO, ShopeePay, Dana, LinkAja, atau aplikasi m-Banking apa saja (BCA, Mandiri, BRI, CIMB).
                    </p>
                    <div className="mt-2.5 flex items-center space-x-2 text-[#707880] text-xs opacity-90">
                      <span className="px-2 py-0.5 bg-[#f3f3fa] rounded font-mono text-[11px] font-bold text-[#1a1b21]">QRIS</span>
                      <span className="px-2 py-0.5 bg-[#f3f3fa] rounded font-mono text-[11px] font-bold text-[#1a1b21]">GOPAY</span>
                      <span className="px-2 py-0.5 bg-[#f3f3fa] rounded font-mono text-[11px] font-bold text-[#1a1b21]">OVO</span>
                      <span className="px-2 py-0.5 bg-[#f3f3fa] rounded font-mono text-[11px] font-bold text-[#1a1b21]">DANA</span>
                      <span className="px-2 py-0.5 bg-[#f3f3fa] rounded font-mono text-[11px] font-bold text-[#1a1b21]">SHOPEEPAY</span>
                    </div>
                  </div>
                </label>

                {/* Option 2: Virtual Account Bank */}
                <label
                  onClick={() => setPaymentCategory("va")}
                  className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all ${
                    paymentCategory === "va"
                      ? "border-2 border-[#005d85] bg-[#c8e6ff]/20"
                      : "border border-[#bfc7d0]/60 hover:border-[#707880]"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="va"
                    checked={paymentCategory === "va"}
                    onChange={() => setPaymentCategory("va")}
                    className="mt-1 h-4 w-4 text-[#005d85] border-[#707880] focus:ring-[#005d85]"
                  />
                  <div className="ml-3.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-[#1a1b21] font-semibold">Virtual Account Bank (Otomatis Terverifikasi)</span>
                      <span className="text-xs text-[#707880]">24 Jam Real-time</span>
                    </div>
                    <p className="text-xs text-[#707880] mt-1">
                      Transfer instan tanpa perlu unggah struk manual. Konfirmasi diverifikasi dalam hitungan detik.
                    </p>

                    {/* Bank Selection Pills */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([
                        { id: "va_bca", name: "BCA VA" },
                        { id: "va_mandiri", name: "Mandiri Livin" },
                        { id: "va_bni", name: "BNI" },
                        { id: "va_bri", name: "BRImo" },
                        { id: "va_permata", name: "Permata" },
                      ] as const).map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentCategory("va");
                            setSelectedVaBank(bank.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            paymentCategory === "va" && selectedVaBank === bank.id
                              ? "bg-[#005d85] text-white shadow-sm"
                              : "bg-[#f3f3fa] text-[#3f484f] hover:bg-[#e2e2e9]"
                          }`}
                        >
                          {bank.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>

                {/* Option 3: Credit Card / Debit */}
                <label
                  onClick={() => setPaymentCategory("credit_card")}
                  className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all ${
                    paymentCategory === "credit_card"
                      ? "border-2 border-[#005d85] bg-[#c8e6ff]/20"
                      : "border border-[#bfc7d0]/60 hover:border-[#707880]"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cc"
                    checked={paymentCategory === "credit_card"}
                    onChange={() => setPaymentCategory("credit_card")}
                    className="mt-1 h-4 w-4 text-[#005d85] border-[#707880] focus:ring-[#005d85]"
                  />
                  <div className="ml-3.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-[#1a1b21] font-semibold">Kartu Kredit / Debit Online</span>
                        <span className="inline-flex items-center text-[#707880] text-xs">
                          <Lock size={12} className="mr-0.5 text-[#005d85]" />
                          3D Secure
                        </span>
                      </div>
                      <span className="text-xs text-[#707880]">Visa / Mastercard / JCB</span>
                    </div>
                    <p className="text-xs text-[#707880] mt-1">
                      Enkripsi tokenisasi AES-256 berstandar perbankan PCI-DSS Level 1. Keamanan data kartu Anda terlindungi.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Voucher & Promo Code Section */}
            <div className="bg-white rounded-xl border border-[#bfc7d0]/60 p-6 shadow-none">
              <label htmlFor="coupon-input" className="block text-sm font-medium text-[#1a1b21] mb-2">
                Kode Promo / Kupon Beasiswa Hazl
              </label>
              <div className="flex space-x-3">
                <div className="relative flex-grow">
                  <input
                    id="coupon-input"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="KODE PROMO (misal: HAZLENGINEER)"
                    className="w-full h-10 px-3.5 uppercase font-mono font-semibold rounded-lg border border-[#bfc7d0]/70 bg-white text-[#1a1b21] text-sm focus:outline-none focus:border-[#005d85] focus:ring-2 focus:ring-[#86cfff]/40"
                  />
                  {coupon && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#005d85]">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                </div>
                <button
                  id="coupon-apply-btn"
                  type="button"
                  onClick={applyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="h-10 px-5 rounded-lg border border-[#bfc7d0]/70 hover:border-[#707880] bg-white hover:bg-[#f3f3fa] text-[#1a1b21] text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {validatingCoupon ? "Mengecek..." : "Terapkan"}
                </button>
              </div>

              {coupon && (
                <div className="mt-2.5 flex items-center text-[#005d85] text-xs font-medium">
                  <ShieldCheck size={15} className="mr-1.5 text-[#005d85]" />
                  <span>
                    Kupon <strong>{coupon.code}</strong> berhasil diterapkan (Hemat {formatRp(coupon.discountAmount)}).
                  </span>
                </div>
              )}

              {couponError && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {couponError}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
          </section>

          {/* Right Column: Order Summary & Trust Module (5 Cols) */}
          <aside className="lg:col-span-5 space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white rounded-xl border border-[#bfc7d0]/60 p-6 space-y-6 shadow-none">
              <div className="border-b border-[#bfc7d0]/40 pb-4">
                <h2 className="text-lg font-bold text-[#1a1b21]">Ringkasan Pesanan</h2>
                <p className="text-xs text-[#707880] mt-0.5">1 item dalam keranjang pembelajaran Anda</p>
              </div>

              {/* Course Mini Card */}
              <div className="flex space-x-4 items-start pb-5 border-b border-[#bfc7d0]/40">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#ededf4] border border-[#bfc7d0]/50 relative">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#ededf4] text-[#707880]">
                      <Terminal size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#c1e8ff] text-[#005d85] mb-1">
                    BOOTCAMP PRO
                  </span>
                  <h3 className="text-sm font-bold text-[#1a1b21] leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#707880] mt-1 flex items-center">
                    <User size={14} className="mr-1 text-[#005d85]" />
                    Instruktur: {item.mentorName}
                  </p>
                </div>
              </div>

              {/* Package Inclusions List */}
              <div className="space-y-2.5 text-[#707880] text-xs pb-5 border-b border-[#bfc7d0]/40">
                <p className="text-xs text-[#1a1b21] font-semibold mb-2">Paket Pembelian Mencakup:</p>
                <div className="flex items-center space-x-2">
                  <InfinityIcon size={15} className="text-[#005d85] shrink-0" />
                  <span>Akses Materi &amp; Update Selamanya (Lifetime)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Terminal size={15} className="text-[#005d85] shrink-0" />
                  <span>Modul Repositori Git Boilerplate Enterprise</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare size={15} className="text-[#005d85] shrink-0" />
                  <span>1-on-1 Code Review Berkala dari Mentor Senior</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award size={15} className="text-[#005d85] shrink-0" />
                  <span>Sertifikat Verifikasi Kriptografis Berlisensi</span>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center text-[#707880] text-xs">
                  <span>Harga Normal</span>
                  <span className="line-through text-[#707880]">{formatRp(originalPrice)}</span>
                </div>

                <div className="flex justify-between items-center text-[#707880] text-xs">
                  <span className="flex items-center">
                    Promo Diskon Terbatas
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#c1e8ff] text-[#005d85] font-mono text-[10px] font-bold">
                      HEMAT {discountPercent > 0 ? `${discountPercent}%` : "72%"}
                    </span>
                  </span>
                  <span className="text-[#005d85] font-medium">-{formatRp(promoDiscount)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center text-[#707880] text-xs">
                    <span>
                      Kupon Promo (
                      <span className="font-mono text-[11px] font-bold text-[#005d85]">
                        {coupon?.code}
                      </span>
                      )
                    </span>
                    <span className="text-[#005d85] font-medium">-{formatRp(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[#707880] text-xs">
                  <span>Biaya Platform &amp; PPN</span>
                  <span className="text-[#005d85] font-semibold">Rp 0 (Bebas Biaya)</span>
                </div>

                <div className="pt-4 border-t border-[#bfc7d0]/40 flex justify-between items-baseline">
                  <div>
                    <span className="block text-sm font-bold text-[#1a1b21]">Total Pembayaran</span>
                    <span className="text-xs text-[#707880]">Sudah termasuk pajak &amp; biaya layanan</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#1a1b21] tracking-tight">
                      {formatRp(finalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary CTA Action */}
              <div className="pt-2">
                <button
                  id="checkout-pay-btn"
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full h-12 rounded-full bg-[#0077a8] hover:bg-[#005d85] text-white font-bold flex items-center justify-center space-x-2 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-[#86cfff]/50 disabled:opacity-50 shadow-sm"
                >
                  <Lock size={16} />
                  <span>
                    {checkingOut
                      ? "Memproses..."
                      : finalPrice === 0
                      ? "Aktivasi Akses Gratis Sekarang"
                      : `Lanjut ke Pembayaran ${formatRp(finalPrice)}`}
                  </span>
                </button>
                <p className="text-[11px] text-center text-[#707880] mt-2.5">
                  Dengan mengklik tombol di atas, Anda menyetujui Ketentuan Layanan Hazl.
                </p>
              </div>
            </div>

            {/* Trust Badges & Guarantee Module */}
            <div className="bg-white rounded-xl border border-[#bfc7d0]/60 p-5 space-y-4 shadow-none">
              <div className="flex items-start space-x-3.5">
                <ShieldCheck size={20} className="text-[#005d85] mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-[#1a1b21]">Garansi 7 Hari Uang Kembali 100%</h4>
                  <p className="text-xs text-[#707880] mt-0.5">
                    Jika kurikulum tidak memenuhi ekspektasi teknis Anda, ajukan refund instan tanpa proses berbelit.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#bfc7d0]/40 pt-3 flex items-start space-x-3.5">
                <Zap size={20} className="text-[#005d85] mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-[#1a1b21]">Akses Aktif dalam 60 Detik</h4>
                  <p className="text-xs text-[#707880] mt-0.5">
                    Sistem otomatis kami menghubungkan akun LMS dan repositori GitHub Anda tepat setelah konfirmasi.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#bfc7d0]/40 pt-3 flex items-start space-x-3.5">
                <Lock size={20} className="text-[#005d85] mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-[#1a1b21]">Data Terenkripsi TLS 1.3</h4>
                  <p className="text-xs text-[#707880] mt-0.5">
                    Infrastruktur data kami terisolasi dan teraudit secara berkala untuk menjaga kerahasiaan identitas siswa.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Shared Component: Footer (trust_footer) ─────────────────────────── */}
      <footer className="bg-white border-t border-[#bfc7d0]/60 mt-16 py-8">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col items-center justify-center space-y-4">
          {/* Footer Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#707880]">
            <Link href="/faq" className="hover:text-[#005d85] transition-colors">
              Garansi 7 Hari Uang Kembali
            </Link>
            <Link href="/privacy" className="hover:text-[#005d85] transition-colors">
              Kebijakan Privasi
            </Link>
            <Link href="/terms" className="hover:text-[#005d85] transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <Link href="/faq" className="hover:text-[#005d85] transition-colors">
              Bantuan Pelanggan
            </Link>
          </nav>
          {/* Copyright & Security Label */}
          <p className="text-xs text-[#707880] text-center opacity-80 hover:opacity-100 transition-opacity">
            © 2025–2026 Hazl Academy. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Exported Page Wrapper with Suspense ──────────────────────────────────────

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#005d85] border-t-transparent" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
