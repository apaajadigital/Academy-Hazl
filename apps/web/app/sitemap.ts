import { type MetadataRoute } from "next";
import { mentors } from "@/lib/e-course/utils";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jagoakademi.com";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: `${BASE_URL}/`,                 lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE_URL}/e-course`,         lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE_URL}/mentor`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE_URL}/event`,            lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE_URL}/ebook`,            lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE_URL}/kelas-gratis`,     lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE_URL}/blog`,             lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
  { url: `${BASE_URL}/marketplace`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE_URL}/trainer-program`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/clients`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/afiliasi`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/kolaborasi`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/about`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/contact`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/faq`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/masuk`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
  { url: `${BASE_URL}/daftar`,           lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
];

async function fetchDynamicPages(): Promise<MetadataRoute.Sitemap> {
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const pages: MetadataRoute.Sitemap = [];

  // Hard timeout so `next build` never stalls generating the sitemap when the API
  // is slow or unreachable — each fetch rejects fast and Promise.allSettled lets
  // us fall back to the static-only sitemap (QA/CD build hang).
  const opts = { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) };

  try {
    const [coursesRes, eventsRes, ebooksRes, blogRes] = await Promise.allSettled([
      fetch(`${API}/api/courses?limit=200&status=published`, opts),
      fetch(`${API}/api/events?limit=100`, opts),
      fetch(`${API}/api/ebooks?limit=200`, opts),
      fetch(`${API}/api/blog?limit=200`, opts),
    ]);

    if (coursesRes.status === "fulfilled" && coursesRes.value.ok) {
      const data = await coursesRes.value.json();
      const courses = (data.data ?? []) as Array<{ slug: string; updatedAt?: string }>;
      courses.forEach((c) =>
        pages.push({
          url: `${BASE_URL}/e-course/${c.slug}`,
          lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        })
      );
    }

    if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
      const data = await eventsRes.value.json();
      const events = (data.data ?? []) as Array<{ slug: string; updatedAt?: string }>;
      events.forEach((e) =>
        pages.push({
          url: `${BASE_URL}/event/${e.slug}`,
          lastModified: e.updatedAt ? new Date(e.updatedAt) : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        })
      );
    }

    if (ebooksRes.status === "fulfilled" && ebooksRes.value.ok) {
      const data = await ebooksRes.value.json();
      const ebooks = (data.data ?? []) as Array<{ slug: string; updatedAt?: string }>;
      ebooks.forEach((e) =>
        pages.push({
          url: `${BASE_URL}/ebook/${e.slug}`,
          lastModified: e.updatedAt ? new Date(e.updatedAt) : new Date(),
          changeFrequency: "weekly",
          priority: 0.6,
        })
      );
    }

    if (blogRes.status === "fulfilled" && blogRes.value.ok) {
      const data = await blogRes.value.json();
      const posts = (data.data ?? []) as Array<{ slug: string; publishedAt?: string }>;
      posts.forEach((p) =>
        pages.push({
          url: `${BASE_URL}/blog/${p.slug}`,
          lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        })
      );
    }
  } catch {
    // Silently return static-only sitemap if API is unreachable at build time
  }

  return pages;
}

// Mentor profile pages are backed by the static mentor list (no API), so their
// URLs are known at build time — emit `/mentor/[slug]` for each.
const MENTOR_PAGES: MetadataRoute.Sitemap = mentors.map((m) => ({
  url: `${BASE_URL}/mentor/${m.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.6,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicPages = await fetchDynamicPages();
  return [...STATIC_PAGES, ...MENTOR_PAGES, ...dynamicPages];
}
