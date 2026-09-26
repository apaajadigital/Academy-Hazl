"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getValidToken } from "@/lib/auth/token";
import { getEventTypeLabel } from "@/lib/event-labels";
import {
  checkoutEvent,
  getEvent,
  getMyRegistration,
  type EventRecord,
  type EventRegistrationRecord,
} from "@/lib/api/events";
import { CalendarDays, MapPin, Users, Clock, CheckCircle2, Mic2 } from "lucide-react";

// E12: the Event/Registration shapes and every endpoint call now come from
// `lib/api/events`; the local copies here had drifted into a fourth definition.
// Type/status labels come from `lib/event-labels` (BL-60c) — the local
// TYPE_LABEL map was a fifth place the same three strings were spelled out.

// ─── Helpers ──────────────────────────────────────────────────────────────────


function formatPrice(price: string, salePrice: string | null) {
  const num = salePrice ? Number(salePrice) : Number(price);
  if (num === 0) return "Gratis";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function formatLongDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Countdown hook ────────────────────────────────────────────────────────────

function useEventCountdown(targetDate: string | null) {
  const calc = useCallback(() => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { days: d, hours: h, minutes: m, seconds: s, started: false };
  }, [targetDate]);

  const [countdown, setCountdown] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setCountdown(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  return countdown;
}

// ─── Countdown display ─────────────────────────────────────────────────────────

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="min-w-[3rem] rounded-xl px-3 py-2 text-center text-2xl font-extrabold tabular-nums"
        style={{
          background: "var(--surface-accent-soft)",
          color: "var(--brand-cyan-strong)",
          fontFamily: "var(--font-display)",
          border: "1px solid rgba(0,119,168,0.15)",
        }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Capacity progress bar ─────────────────────────────────────────────────────

function CapacityBar({ quota, sold }: { quota: number; sold: number }) {
  const pct = Math.min(100, Math.round((sold / quota) * 100));
  const spotsLeft = quota - sold;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{sold.toLocaleString()} pendaftar</span>
        <span>{spotsLeft > 0 ? `${spotsLeft} tersisa` : "Penuh"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border-subtle)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct >= 90 ? "#DC2626" : "var(--brand-cyan)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailClient() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [registration, setRegistration] = useState<EventRegistrationRecord | null>(null);
  // Set after a successful free registration, when the server-side record exists
  // but has not been re-fetched — avoids fabricating a fake EventRegistration row.
  const [justRegistered, setJustRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const countdown = useEventCountdown(event?.startDate ?? null);

  // Fetch event
  useEffect(() => {
    let ignore = false;
    void (async () => {
      const result = await getEvent(slug);
      if (ignore) return;
      if (result.success) setEvent(result.data);
      // status 0 == the request never completed (offline/timeout), which is a
      // different message from a genuine 404.
      else setError(result.status === 0 ? "Gagal memuat event." : "Event tidak ditemukan.");
      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [slug]);

  // Fetch registration status (if logged in)
  useEffect(() => {
    if (!event) return;
    // Finding #4: refresh-aware token; the client skips the call entirely (no
    // `Bearer null`) and reports 401 when the visitor is not logged in, which is
    // an expected outcome here rather than an error worth surfacing.
    let ignore = false;
    void (async () => {
      const result = await getMyRegistration(slug);
      if (ignore || !result.success) return;
      setRegistration(result.data);
    })();
    return () => { ignore = true; };
  }, [slug, event]);

  async function handleRegister() {
    // Finding #4: refresh-aware token; redirect to login if no valid session.
    const token = await getValidToken();
    if (!token) { router.push(`/masuk?redirect=/event/${slug}`); return; }
    if (!event) return;

    const price = event.salePrice ? Number(event.salePrice) : Number(event.price);

    if (price === 0) {
      setRegisterLoading(true);
      const result = await checkoutEvent(event.id);
      if (result.success && result.data.free) {
        setMessage("Berhasil mendaftar! Tiket Anda ada di dashboard.");
        setJustRegistered(true);
      } else if (!result.success && result.status === 401) {
        router.push(`/masuk?redirect=/event/${slug}`);
      } else {
        setError(result.success ? "Gagal mendaftar." : result.error.message);
      }
      setRegisterLoading(false);
    } else {
      router.push(`/checkout/${event.slug}?type=event&itemId=${event.id}`);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--surface-page)" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--brand-cyan-strong)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────────
  if (error && !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ background: "var(--surface-page)" }}>
        <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="mb-3 font-semibold" style={{ color: "#B91C1C" }}>⚠️ {error}</p>
          <Link href="/event" className="btn btn-outline btn-sm">← Kembali ke Event</Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const displayPrice = event.salePrice ? Number(event.salePrice) : Number(event.price);
  const spotsLeft = event.quota ? event.quota - event.totalSold : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isRegistered = registration !== null || justRegistered;
  const eventStarted = countdown?.started === true;

  // Mirrors the server contract in eventService.isEventEnded EXACTLY:
  //
  //     active / upcoming  ⇔  eventEnd  >  now
  //     ended              ⇔  eventEnd <=  now
  //
  // `<=` and not `<`: if this page were one instant more permissive than the
  // API, the button would still be enabled for an event the server has already
  // closed, and the visitor would meet a 422 only after clicking. Keep the two
  // comparisons identical — if one changes, change both.
  //
  // Both sides compare absolute instants (Date.getTime() is UTC-based), so a
  // visitor in WIB and an API in UTC reach the same verdict.
  //
  // The detail page deliberately stays reachable (200) for history and SEO —
  // only the purchase path closes.
  const isEnded =
    event !== null &&
    new Date((event.endDate ?? event.startDate) as string).getTime() <= Date.now();

  return (
    <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>

      {/* ── Hero cover ─────────────────────────────────────────────────────────── */}
      <div className="relative aspect-video max-h-80 w-full overflow-hidden">
        {event.coverUrl ? (
          <Image src={event.coverUrl} alt={event.title} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-6xl"
            style={{ background: "linear-gradient(135deg, var(--brand-cyan-strong) 0%, #7C3AED 100%)" }}
          >
            🎤
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-col gap-10 lg:flex-row">

          {/* ── Left: main content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Badges */}
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="badge badge-cyan">{getEventTypeLabel(event.type)}</span>
              {event.isFeatured && <span className="badge badge-pink">⭐ Unggulan</span>}
              {eventStarted && (
                <span className="badge" style={{ background: "rgba(22,163,74,0.1)", color: "#15803D", border: "1px solid rgba(22,163,74,0.2)" }}>
                  🔴 Sedang Berlangsung
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              className="mb-4 text-3xl font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {event.title}
            </h1>

            {/* Countdown — only if not started */}
            {countdown && !eventStarted && (
              <div
                className="mb-6 rounded-2xl p-5"
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-e1)" }}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-cyan-strong)" }}>
                  Event dimulai dalam
                </p>
                <div className="flex gap-3">
                  <CountdownUnit value={countdown.days} label="Hari" />
                  <span className="mt-2 text-2xl font-bold" style={{ color: "var(--text-muted)" }}>:</span>
                  <CountdownUnit value={countdown.hours} label="Jam" />
                  <span className="mt-2 text-2xl font-bold" style={{ color: "var(--text-muted)" }}>:</span>
                  <CountdownUnit value={countdown.minutes} label="Menit" />
                  <span className="mt-2 text-2xl font-bold" style={{ color: "var(--text-muted)" }}>:</span>
                  <CountdownUnit value={countdown.seconds} label="Detik" />
                </div>
              </div>
            )}

            {/* Date & location info */}
            <div
              className="mb-6 rounded-2xl p-5"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-e1)" }}
            >
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div className="flex items-start gap-2.5">
                  <CalendarDays size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--brand-cyan-strong)" }} aria-hidden="true" />
                  <div>
                    <p className="font-medium">Mulai: {formatLongDate(event.startDate)}</p>
                    {event.endDate && <p className="mt-0.5">Selesai: {formatLongDate(event.endDate)}</p>}
                  </div>
                </div>
                {event.type !== "online" && event.venue && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--brand-cyan-strong)" }} aria-hidden="true" />
                    <p><span className="font-medium">{event.venue}</span>{event.location && ` — ${event.location}`}</p>
                  </div>
                )}
                {event.type === "online" && (
                  <div className="flex items-center gap-2.5">
                    <Clock size={15} className="flex-shrink-0" style={{ color: "var(--brand-cyan-strong)" }} aria-hidden="true" />
                    <p className="font-medium">Acara Online — Link akan dikirim via email setelah pendaftaran</p>
                  </div>
                )}
                {event.quota && (
                  <div className="flex items-center gap-2.5">
                    <Users size={15} className="flex-shrink-0" style={{ color: "var(--brand-cyan-strong)" }} aria-hidden="true" />
                    <p>Kuota: {event.quota.toLocaleString()} peserta</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Tentang Event
                </h2>
                <div className="prose prose-sm max-w-none" style={{ color: "var(--text-secondary)" }}>
                  <p className="whitespace-pre-wrap leading-relaxed">{event.description}</p>
                </div>
              </div>
            )}

            {/* Speaker card */}
            {event.speakerName && (
              <div
                className="mb-6 rounded-2xl p-6"
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-e1)" }}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-cyan-strong)" }}>
                  Pembicara
                </p>
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl"
                    style={{ background: "var(--surface-accent-soft)", border: "1px solid rgba(0,119,168,0.15)" }}
                  >
                    <Mic2 size={20} style={{ color: "var(--brand-cyan-strong)" }} />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {event.speakerName}
                    </p>
                    {event.speakerBio && (
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                        {event.speakerBio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: booking card ─────────────────────────────────────────────── */}
          <div className="lg:w-72 lg:flex-shrink-0">
            <div
              className="sticky top-6 rounded-2xl p-6"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-e2)" }}
            >
              {/* Price */}
              <div className="mb-4">
                {event.salePrice && (
                  <p className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
                    Rp {Number(event.price).toLocaleString("id-ID")}
                  </p>
                )}
                <p
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: "var(--brand-cyan-strong)", fontFamily: "var(--font-display)" }}
                >
                  {formatPrice(event.price, event.salePrice)}
                </p>
              </div>

              {/* Capacity bar */}
              {event.quota && (
                <div className="mb-5">
                  <CapacityBar quota={event.quota} sold={event.totalSold} />
                </div>
              )}

              {/* Success / error messages */}
              {message && (
                <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", color: "#15803D" }}>
                  {message}
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "#B91C1C" }}>
                  {error}
                </div>
              )}

              {/* Finished-event notice. Shown above the CTA so the state is
                  read before the disabled button is reached, rather than the
                  visitor discovering it by clicking. */}
              {isEnded && (
                <div
                  role="status"
                  className="mb-4 rounded-xl p-3 text-sm"
                  style={{ background: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.25)", color: "var(--text-secondary)" }}
                >
                  <strong>Event telah selesai.</strong> Pendaftaran sudah ditutup. Lihat{" "}
                  <Link href="/event" style={{ textDecoration: "underline" }}>
                    event mendatang
                  </Link>
                  .
                </div>
              )}

              {/* CTA */}
              {isRegistered ? (
                <div className="text-center">
                  <div
                    className="mb-3 inline-flex items-center gap-2 font-semibold"
                    style={{ color: "#15803D" }}
                  >
                    <CheckCircle2 size={18} aria-hidden="true" />
                    Sudah Terdaftar
                  </div>
                  <Link
                    href="/dashboard/tiket"
                    className="btn btn-outline w-full justify-center"
                  >
                    Lihat Tiket Saya
                  </Link>
                </div>
              ) : (
                <button
                  id="event-register-btn"
                  onClick={handleRegister}
                  disabled={isEnded || isFull || registerLoading}
                  aria-disabled={isEnded || isFull || registerLoading}
                  className="btn btn-primary btn-lg w-full justify-center"
                  style={{ opacity: isEnded || isFull || registerLoading ? 0.6 : 1 }}
                >
                  {registerLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                        style={{ borderColor: "var(--text-on-accent)", borderTopColor: "transparent" }} />
                      Memproses...
                    </>
                  ) : isEnded ? "Event Telah Selesai"
                    : isFull ? "Kapasitas Penuh"
                    : displayPrice === 0 ? "Daftar Gratis"
                    : "Beli Tiket"}
                </button>
              )}

              {/* Security note */}
              {!isRegistered && !isFull && (
                <p className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  🔒 Pembayaran aman melalui DOKU
                </p>
              )}

              {/* Back link */}
              <Link
                href="/event"
                className="mt-4 block text-center text-sm hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                ← Lihat event lainnya
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
