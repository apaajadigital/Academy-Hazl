import type { Metadata } from "next";
import { OG_IMAGE_FALLBACK } from "@/lib/seo";
import { notFound } from "next/navigation";
import EventDetailClient from "./EventDetailClient";
import { API_BASE as API } from "@/lib/api/base";

type Props = {
  params: Promise<{ slug: string }>;
};

// Server-side fetch so crawlers get real metadata even though the interactive
// booking/countdown UI is rendered by a client island.
type EventMeta = {
  title: string;
  description: string | null;
  coverUrl: string | null;
};

// `null` = event definitively missing (real 404); `undefined` = API unreachable
// (network error/timeout) so we must NOT 404 content that may actually exist.
async function getEvent(slug: string): Promise<EventMeta | null | undefined> {
  try {
    const res = await fetch(`${API}/api/events/${slug}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json();
    return body.success ? (body.data as EventMeta) : null;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return { title: "Event tidak ditemukan | Hazl Academy" };
  }

  const description =
    event.description?.slice(0, 160).replace(/\s+/g, " ").trim() ??
    `Ikuti ${event.title} bersama Hazl Academy.`;

  return {
    title: `${event.title} | Hazl Academy`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      images: event.coverUrl ? [{ url: event.coverUrl }] : OG_IMAGE_FALLBACK.images,
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  // BL-46: return a real 404 instead of an empty 200 page when the slug does
  // not exist. Next.js deduplicates this fetch with the generateMetadata one.
  const { slug } = await params;
  const event = await getEvent(slug);
  if (event === null) notFound();

  // The client island reads the slug via useParams and fetches its own data,
  // preserving all existing interactive behavior unchanged.
  return <EventDetailClient />;
}
