import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Mic2, Users, Radio, Building2, Layers3, Sparkles, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { getEventTypeLabel } from "@/lib/event-labels";
import { listEvents, type EventSummary } from "@/lib/api/events";
import { resolveEventListState } from "@/lib/events/listState";

export const metadata: Metadata = {
  title: "Webinar & Workshop Video AI | Hazl Academy",
  description:
    "Ikuti webinar live interaktif, bedah prompt sinematik, dan workshop praktik video AI bersama kreator industri Indonesia.",
  openGraph: {
    title: "Webinar & Workshop Video AI | Hazl Academy",
    description:
      "Belajar video AI langsung dari kreator yang sudah menghasilkan karya komersial. Sesi live, tanya jawab langsung, dan bedah prompt nyata.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

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
    <Link
      href={`/event/${event.slug}`}
      className="group relative mb-12 flex min-h-[340px] items-end overflow-hidden rounded-[32px] border border-[#E7E9EC] shadow-sm hover:shadow-md transition-all"
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
                background: "linear-gradient(135deg, #0077A8 0%, #0D5B8A 60%, #CC0052 100%)",
              }}
            />
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(22,24,29,0.92) 0%, rgba(22,24,29,0.4) 60%, transparent 100%)" }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full p-6 sm:p-10">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#36BDF2] px-3 py-1 text-xs font-bold text-[#16181D]">
              <Sparkles size={12} />
              Unggulan
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {getEventTypeLabel(event.type)}
            </span>
          </div>
          <h2 className="mb-3 max-w-3xl text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {event.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
            {event.speakerName && (
              <span className="flex items-center gap-1.5 font-medium">
                <Mic2 size={15} aria-hidden="true" className="text-[#36BDF2]" />
                {event.speakerName}
              </span>
            )}
            <span className="flex items-center gap-1.5 font-medium">
              <CalendarDays size={15} aria-hidden="true" className="text-[#36BDF2]" />
              {formatDate(event.startDate)}
            </span>
            <span className="font-extrabold text-[#36BDF2] text-base">
              {price === 0 ? "Gratis" : `Rp ${price.toLocaleString("id-ID")}`}
            </span>
          </div>
        </div>
      </Link>
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
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
        active
          ? "bg-[#0077A8] text-white shadow-sm"
          : "bg-white border border-[#E7E9EC] text-[#5B616E] hover:border-[#0077A8] hover:text-[#16181D]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}

// ─── Event card ────────────────────────────────────────────────────────────────
function EventCard({ ev }: { ev: EventSummary }) {
  const spotsLeft = ev.quota ? ev.quota - ev.totalSold : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Link
      href={`/event/${ev.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[#E7E9EC] bg-white shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Cover */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#E8F6FF]">
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
        <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-[#16181D] shadow-sm flex items-center gap-1">
          <Radio size={11} className="text-[#0077A8]" />
          {getEventTypeLabel(ev.type)}
        </span>
        {ev.isFeatured && (
          <span className="absolute top-3 right-3 rounded-full bg-[#FF2F86] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
            Unggulan
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Title */}
        <h3 className="font-display text-base sm:text-lg font-extrabold leading-snug text-[#16181D] transition-colors line-clamp-2 group-hover:text-[#0077A8]">
          {ev.title}
        </h3>

        {/* Meta */}
        <div className="mt-3 flex flex-col gap-1.5 text-xs sm:text-[13px] text-[#5B616E]">
          {ev.speakerName && (
            <span className="inline-flex items-center gap-1.5">
              <Mic2 size={13} aria-hidden="true" className="text-[#707880]" />
              {ev.speakerName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} aria-hidden="true" className="text-[#707880]" />
            {formatDate(ev.startDate)}
          </span>
          {ev.type !== "online" && ev.venue && (
            <span className="inline-flex items-center gap-1.5 line-clamp-1">
              <MapPin size={13} aria-hidden="true" className="text-[#707880]" />
              {ev.venue}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-[#F0F2F5] pt-4 mt-4">
          <span className="text-base font-black text-[#16181D]">
            {formatPrice(ev.price, ev.salePrice)}
          </span>
          {isFull ? (
            <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-600">
              Penuh
            </span>
          ) : spotsLeft !== null ? (
            <span className="inline-flex items-center gap-1 text-xs text-[#707880]">
              <Users size={12} aria-hidden="true" />
              {spotsLeft} kursi tersisa
            </span>
          ) : (
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-[#16181D] px-3 text-xs font-bold text-white group-hover:bg-[#0077A8] transition-colors">
              <span>Daftar</span>
              <ArrowRight size={12} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function EventListPage({ searchParams }: PageProps) {
  const { type } = await searchParams;
  const activeType = TYPES.find((t) => t.value === (type ?? "")) ? (type ?? "") : "";
  const result = await listEvents({ type: activeType || undefined, limit: 24 }, 0);
  const state = resolveEventListState(result);
  const events = state.kind === "list" ? state.events : [];
  const total = state.kind === "list" ? state.total : 0;

  const heroEvent = activeType ? undefined : events.find((e) => e.isFeatured);
  const regularEvents = heroEvent ? events.filter((e) => e.id !== heroEvent.id) : events;

  return (
    <div className="w-full bg-[#FAFAFC] pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8E6FF] bg-[#E8F6FF] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0077A8]">
            <Sparkles size={13} className="text-[#0077A8]" />
            Event &amp; Webinar
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#16181D]">
            Belajar langsung dari <span className="text-[#0077A8]">kreator video AI</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#5B616E]">
            Sesi live interaktif, bedah prompt nyata, dan workshop praktik intensif untuk mengasah keahlian video AI-mu.
          </p>
        </div>

        {/* Filter tabs */}
        <nav
          className="mb-8 flex flex-wrap justify-center gap-2"
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
          <EmptyState
            icon={CalendarDays}
            title="Gagal memuat daftar event"
            description="Terjadi gangguan saat mengambil jadwal webinar. Silakan muat ulang halaman beberapa saat lagi."
            action={
              <Link href="/event" className="h-10 px-6 rounded-full bg-[#0077A8] text-white font-bold text-sm inline-flex items-center justify-center hover:bg-[#0D5B8A] transition-colors shadow-sm">
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
            description="Jadwal webinar dan workshop video AI berikutnya akan diumumkan di sini. Kamu tetap bisa belajar lewat katalog kelas kami."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/e-course" className="h-10 px-6 rounded-full bg-[#0077A8] text-white font-bold text-sm inline-flex items-center justify-center hover:bg-[#0D5B8A] transition-colors shadow-sm">
                  Lihat Katalog Kelas
                </Link>
                <Link href="/contact" className="h-10 px-6 rounded-full border border-[#E7E9EC] bg-white text-[#16181D] font-bold text-sm inline-flex items-center justify-center hover:bg-[#F6F7F9] transition-colors">
                  Hubungi Kami
                </Link>
              </div>
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-[#707880]">
              Menampilkan <span className="font-bold text-[#16181D]">{total} event</span> tersedia
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {regularEvents.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
