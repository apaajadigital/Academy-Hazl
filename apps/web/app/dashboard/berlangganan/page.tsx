"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Lock, AlertTriangle, Check, ShieldCheck, ScrollText, Loader2,
  Infinity as InfinityIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type Plan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  pricePerMonth?: number;
  savings?: number;
  features: string[];
  badge: string | null;
};

type Subscription = {
  planType: string;
  status: string;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
} | null;

export default function BerlanggananDashboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  useEffect(() => {
    // Finding #4: resolve a refresh-aware token; only attach the Authorization
    // header when a token exists so we never send `Bearer null` to /me.
    (async () => {
      const token = await getValidToken();
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/subscription/plans")
          .then((r) => r.json())
          .catch(() => ({ success: false, data: [] })),
        token
          ? fetch("/api/subscription/me", {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.json())
              .catch(() => ({ success: true, data: null }))
          : Promise.resolve({ success: true, data: null }),
      ]);
      if (plansRes.success && Array.isArray(plansRes.data) && plansRes.data.length > 0) {
        setPlans(plansRes.data);
      } else {
        setMsg("Gagal memuat daftar paket. Silakan muat ulang halaman.");
        setMsgType("error");
      }
      if (subRes.success) {
        setCurrentSub(subRes.data);
      }
      setLoading(false);
    })();
  }, []);

  async function subscribe(planType: string) {
    // Finding #4: refresh-aware token; redirect to login if the session is gone.
    const token = await getValidToken();
    if (!token) { router.push("/masuk?redirect=/dashboard/berlangganan"); return; }
    setSubscribing(planType);
    setMsg("");
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planType }),
    });
    const data = await res.json();
    if (data.success) {
      setCurrentSub({ ...data.data, isActive: true, isExpired: false });
      setMsg(`Berlangganan paket ${planType} berhasil diaktifkan!`);
      setMsgType("success");
    } else {
      setMsg(data.error?.message ?? "Gagal berlangganan. Silakan coba lagi.");
      setMsgType("error");
    }
    setSubscribing(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
      </div>
    );
  }

  const guarantees = [
    { Icon: ShieldCheck, title: "Garansi Refund 7 Hari", desc: "Tidak puas? Kami kembalikan uang Anda tanpa pertanyaan dalam 7 hari pertama." },
    { Icon: InfinityIcon, title: "Akses Tidak Terbatas", desc: "Pelajari semua kursus premium tanpa batasan selama masa berlangganan." },
    { Icon: ScrollText, title: "Sertifikat Resmi", desc: "Dapatkan sertifikat kelulusan yang dapat diverifikasi untuk setiap kursus." },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">Status Berlangganan</h1>
        <p className="mt-1 text-sm text-text-secondary">Kelola dan tingkatkan akses belajar premium Anda</p>
      </div>

      {/* Current subscription status */}
      {currentSub?.isActive ? (
        <div className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-green-200 bg-green-50 px-5 py-4">
          <CheckCircle2 className="flex-shrink-0 text-green-600" size={28} aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              Paket <span className="font-extrabold capitalize">{currentSub.planType}</span> Aktif
            </p>
            <p className="mt-0.5 text-xs text-green-700">
              Berlaku hingga{" "}
              <strong>
                {new Date(currentSub.expiresAt).toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </strong>
            </p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-green-500 px-3 py-1 text-[11px] font-bold text-white">Aktif</span>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-border-default bg-surface-sunken px-5 py-4">
          <Lock className="flex-shrink-0 text-text-secondary" size={28} aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary">Belum Berlangganan Premium</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Anda saat ini menggunakan akun gratis. Berlangganan untuk membuka semua fitur.
            </p>
          </div>
          <Link href="/berlangganan" className="btn btn-primary btn-sm flex-shrink-0">
            Pelajari Paket
          </Link>
        </div>
      )}

      {currentSub?.isExpired && (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
          <AlertTriangle size={18} className="flex-shrink-0" aria-hidden="true" />
          <p>Langganan Anda telah berakhir. Perpanjang sekarang untuk melanjutkan akses.</p>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div
          className={cn(
            "rounded-[var(--radius-md)] border px-4 py-3.5 text-sm font-medium",
            msgType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          )}
        >
          {msg}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isActive = currentSub?.isActive && currentSub.planType === plan.id;
          const isPopular = !!plan.badge;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-xl)] border p-7 shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e2",
                isPopular ? "border-accent-cyan-strong ring-1 ring-accent-cyan-strong/20" : "border-border-strong"
              )}
            >
              {isPopular && (
                <div className="bg-brand-gradient absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl px-5 py-1 text-[11px] font-bold text-white">
                  {plan.badge}
                </div>
              )}

              <div className="pt-2">
                <h2 className="text-lg font-bold text-text-primary">Paket {plan.name}</h2>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-extrabold text-text-primary">
                    Rp {plan.price.toLocaleString("id-ID")}
                  </span>
                  <span className="text-sm text-text-secondary">
                    /{plan.durationDays >= 365 ? "tahun" : "bulan"}
                  </span>
                </div>
                {plan.pricePerMonth && (
                  <p className="mt-1 text-xs text-text-secondary">
                    ≈ Rp {plan.pricePerMonth.toLocaleString("id-ID")}/bulan
                  </p>
                )}
                {plan.savings && (
                  <p className="mt-1 text-xs font-semibold text-green-600">
                    Hemat Rp {plan.savings.toLocaleString("id-ID")}/tahun
                  </p>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-primary">
                    <Check size={16} className="mt-0.5 flex-shrink-0 text-green-500" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe(plan.id)}
                disabled={!!subscribing || isActive}
                className={cn(
                  "btn w-full px-7 py-3 text-sm font-bold disabled:opacity-65",
                  isActive
                    ? "cursor-default bg-green-500 text-white"
                    : isPopular
                      ? "btn-primary"
                      : "btn-outline"
                )}
              >
                {subscribing === plan.id ? "Memproses..." : isActive ? "✓ Paket Aktif" : `Pilih Paket ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Guarantee */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {guarantees.map(({ Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-default bg-surface-card p-4 shadow-e1">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-accent-soft text-accent-cyan-strong">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-text-primary">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-text-muted">
        Dengan berlangganan Anda menyetujui{" "}
        <Link href="/terms" className="text-accent-cyan-strong hover:underline">Syarat & Ketentuan</Link>
        {" "}dan{" "}
        <Link href="/privacy" className="text-accent-cyan-strong hover:underline">Kebijakan Privasi</Link>
        {" "}Jago Akademi.
      </p>
    </div>
  );
}
