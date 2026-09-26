import { type MetadataRoute } from "next";
import { API_BASE as API } from "@/lib/api/base";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jagoakademi.com";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: `${BASE_URL}/`,                 lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE_URL}/e-course`,         lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE_URL}/event`,            lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE_URL}/ebook`,            lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE_URL}/kelas-gratis`,     lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE_URL}/blog`,             lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
  { url: `${BASE_URL}/marketplace`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE_URL}/trainer-program`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/clients`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/afiliasi`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/kolaborasi`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  // Linked from the UI but previously absent from the sitemap, so search engines
  // had no path to them: /berlangganan (pricing, 3 tiers), /early-access (linked
  // from 5 surfaces), and the legal pages the footer points at.
  { url: `${BASE_URL}/berlangganan`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/early-access`,     lastModified: new Date(), changeFrequency: "weekly",  priority: 0.6 },
  { url: `${BASE_URL}/about`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/contact`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/faq`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  // /masuk and /daftar are intentionally absent: robots.ts disallows both, and
  // submitting a disallowed URL in the sitemap is a contradictory crawl signal.
  { url: `${BASE_URL}/privacy`,          lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE_URL}/terms`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
];

async function fetchDynamicPages(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [];

  // Hard timeout so `next build` never stalls generating the sitemap when the API
  // is slow or unreachable — each fetch rejects fast and Promise.allSettled lets
  // us fall back to the static-only sitemap (QA/CD build hang).
  const opts = { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) };

  try {
    // No per-course URLs: this app has NO indexable course detail page.
    //   • /e-course/[kategori] is a learning-path TAXONOMY resolved from a static
    //     category list and calls notFound() on anything else, so a course slug
    //     there is a soft-404.
    //   • /checkout/[slug] — what every catalogue card actually links to — is the
    //     transactional page. It is "use client" (no metadata/canonical) and
    //     immediately router.push()es an unauthenticated visitor to /masuk, which
    //     robots.ts disallows. Submitting those URLs would ask Google to crawl a
    //     login redirect we simultaneously tell it to stay away from.
    // The /e-course listing in STATIC_PAGES is the correct entry point for courses.
    const [eventsRes, ebooksRes, blogRes] = await Promise.allSettled([
      fetch(`${API}/api/events?limit=100`, opts),
      fetch(`${API}/api/ebooks?limit=200`, opts),
      fetch(`${API}/api/blog?limit=200`, opts),
    ]);

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicPages = await fetchDynamicPages();
  return [...STATIC_PAGES, ...dynamicPages];
}
