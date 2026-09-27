import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Mic2, Users, Radio, Building2, Layers3 } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { getEventTypeLabel } from "@/lib/event-labels";
import { listEvents, type EventSummary } from "@/lib/api/events";
import { resolveEventListState } from "@/lib/events/listState";

export const metadata: Metadata = {
  title: "Event & Workshop — Hazl Academy",
  description:
    "Webinar, workshop intensif, dan bootcamp langsung dari praktisi berpengalaman. Tingkatkan skill dan jaringanmu bersama komunitas Hazl Academy.",
  openGraph: {
    title: "Event & Workshop Hazl Academy",
    description:
      "Bergabung dalam webinar, workshop, dan bootcamp yang dipandu oleh praktisi terbaik di industri.",
    type: "website",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(price: string, salePrice: string | null) {
  const num = salePrice ? Number(salePrice) : Number(price);
  if (num === 0) return "Gratis";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

// ─── Filter tab types ──────────────────────────────────────────────────────────
const TYPES = [
  { value: "", label: "Semua", icon: Layers3 },
  { value: "online", label: "Online", icon: Radio },
  { value: "offline", label: "Offline", icon: Building2 },
  { value: "hybrid", label: "Hybrid", icon: Layers3 },
] as const;

// ─── Featured hero banner ──────────────────────────────────────────────────────
function FeaturedHero({ event }: { event: EventSummary }) {
  const price = event.salePrice ? Number(event.salePrice) : Number(event.price);

  return (
    <Reveal>
      <Link
        href={`/event/${event.slug}`}
        className="group relative mb-10 flex min-h-[320px] items-end overflow-hidden rounded-2xl"
        style={{ boxShadow: "var(--shadow-e3)" }}
        aria-label={`Event unggulan: ${event.title}`}
      >
        {/* Background */}
        <div className="absolute inset-0">
          {event.coverUrl ? (
            <Image
              src={event.coverUrl}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: "linear-gradient(135deg, var(--brand-cyan-strong) 0%, #7C3AED 100%)",
              }}
            />
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)" }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full p-6 md:p-8">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="badge" style={{ background: "var(--brand-cyan)", color: "var(--text-on-accent)", border: "none" }}>
              ⭐ Unggulan
            </span>
            <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
              {getEventTypeLabel(event.type)}
            </span>
          </div>
          <h2
            className="mb-2 max-w-2xl text-2xl font-extrabold tracking-tight text-white md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {event.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            {event.speakerName && (
              <span className="flex items-center gap-1.5">
                <Mic2 size={14} aria-hidden="true" />
                {event.speakerName}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(event.startDate)}
            </span>
            <span className="font-bold text-white">
              {price === 0 ? "Gratis" : `Rp ${price.toLocaleString("id-ID")}`}
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

// ─── Filter pill (server-rendered link) ───────────────────────────────────────
function FilterPill({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: "true" }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all"
      style={
        active
          ? {
              background: "var(--brand-cyan)",
              color: "var(--text-on-accent)",
              boxShadow: "var(--shadow-e1)",
            }
          : {
              background: "var(--surface-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }
      }
      aria-current={active ? "page" : undefined}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}

// ─── Event card ────────────────────────────────────────────────────────────────
function EventCard({ ev, delay }: { ev: EventSummary; delay: number }) {
  const spotsLeft = ev.quota ? ev.quota - ev.totalSold : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Reveal delay={delay}>
      <Link
        href={`/event/${ev.slug}`}
        className="card group flex h-full flex-col overflow-hidden !p-0"
      >
        {/* Cover */}
        <div className="relative aspect-video w-full overflow-hidden border-b border-[var(--border-subtle)]">
          {ev.coverUrl ? (
            <Image
              src={ev.coverUrl}
              alt={ev.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} className="!rounded-none !border-0" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-cyan">{getEventTypeLabel(ev.type)}</span>
            {ev.isFeatured && <span className="badge badge-pink">Unggulan</span>}
            {isFull && (
              <span
                className="badge"
                style={{ background: "rgba(239,68,68,0.08)", color: "#B91C1C", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                Penuh
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="font-display text-base font-bold leading-snug text-[var(--text-primary)] transition-colors line-clamp-2 group-hover:text-[var(--brand-cyan-strong)]"
          >
            {ev.title}
          </h2>

          {/* Meta */}
          <div className="flex flex-col gap-1.5 text-[13px] text-[var(--text-secondary)]">
            {ev.speakerName && (
              <span className="inline-flex items-center gap-1.5">
                <Mic2 size={13} aria-hidden="true" className="text-[var(--text-muted)]" />
                {ev.speakerName}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden="true" className="text-[var(--text-muted)]" />
              {formatDate(ev.startDate)}
            </span>
            {ev.type !== "online" && ev.venue && (
              <span className="inline-flex items-center gap-1.5 line-clamp-1">
                <MapPin size={13} aria-hidden="true" className="text-[var(--text-muted)]" />
                {ev.venue}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
            <span className="text-sm font-bold text-[var(--brand-cyan-strong)]">
              {formatPrice(ev.price, ev.salePrice)}
            </span>
            {spotsLeft !== null && !isFull && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Users size={12} aria-hidden="true" />
                {spotsLeft} tersisa
              </span>
            )}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function EventListPage({ searchParams }: PageProps) {
  const { type } = await searchParams;
  const activeType = TYPES.find((t) => t.value === (type ?? "")) ? (type ?? "") : "";
  // E12: one shared client for every event call (lib/api/events). A failed or
  // unreachable API degrades to an empty catalog rather than breaking the render.
  const result = await listEvents({ type: activeType || undefined, limit: 24 });
  // A failed API and an empty catalogue are DIFFERENT things and must render
  // differently — see lib/events/listState.ts for why this used to be wrong.
  const state = resolveEventListState(result);
  const events = state.kind === "list" ? state.events : [];
  const total = state.kind === "list" ? state.total : 0;

  // BL-62a: the hero only renders on the unfiltered list, but the grid used to
  // drop the featured event unconditionally — so on /event?type=online it
  // disappeared from both. Only pull it out of the grid when the hero shows it.
  const heroEvent = activeType ? undefined : events.find((e) => e.isFeatured);
  const regularEvents = heroEvent ? events.filter((e) => e.id !== heroEvent.id) : events;

  return (
    <div className="pt-16">
      <Section>
        <SectionHeader
          eyebrow="Event & Workshop"
          title={
            <>
              Belajar langsung dari <span className="text-accent">praktisi</span>
            </>
          }
          lede="Webinar dan workshop intensif untuk mengasah keahlian bersama ahli di bidangnya."
        />

        {/* Filter tabs */}
        <nav
          className="mb-8 flex flex-wrap gap-2"
          aria-label="Filter tipe event"
        >
          {TYPES.map((t) => (
            <FilterPill
              key={t.value}
              href={t.value ? `/event?type=${t.value}` : "/event"}
              label={t.label}
              Icon={t.icon}
              active={activeType === t.value}
            />
          ))}
        </nav>

        {/* Featured hero */}
        {heroEvent && <FeaturedHero event={heroEvent} />}

        {/* Grid */}
        {state.kind === "error" ? (
          // Distinct from "empty": we do not know what the catalogue holds, so
          // we must not claim it is empty. Offering a retry is honest; a
          // schedule announcement would not be.
          <EmptyState
            icon={CalendarDays}
            title="Gagal memuat daftar event"
            description="Terjadi gangguan saat mengambil jadwal event. Silakan muat ulang halaman beberapa saat lagi."
            action={
              <Link href="/event" className="btn btn-primary">
                Muat Ulang
              </Link>
            }
          />
        ) : state.kind === "empty" ? (
          <EmptyState
            icon={CalendarDays}
            title={
              activeType
                ? `Belum ada event ${getEventTypeLabel(activeType)} mendatang`
                : "Belum ada event mendatang"
            }
            description="Jadwal event dan workshop berikutnya akan diumumkan di halaman ini. Sementara itu, materi kami tetap bisa dipelajari kapan saja."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/e-course" className="btn btn-primary">
                  Lihat Katalog Kursus
                </Link>
                <Link href="/contact" className="btn btn-outline">
                  Hubungi Kami
                </Link>
              </div>
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              {total} event tersedia
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {regularEvents.map((ev, i) => (
                <EventCard key={ev.id} ev={ev} delay={(i % 3) * 0.05} />
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
