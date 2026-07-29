import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArticleClient from "./BlogArticleClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Props = {
  params: Promise<{ slug: string }>;
};

// Server-side fetch so crawlers get real metadata even though the article body
// is rendered by a client island (interactive reviews/rating form).
type BlogPostMeta = {
  title: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
};

// `null` = post definitively missing (real 404); `undefined` = API unreachable
// (network error/timeout) so we must NOT 404 content that may actually exist.
async function getPost(slug: string): Promise<BlogPostMeta | null | undefined> {
  try {
    const res = await fetch(`${API}/api/blog/${slug}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json();
    return body.success ? (body.data as BlogPostMeta) : null;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: "Artikel tidak ditemukan — Jago Akademi" };
  }

  const description =
    post.excerpt ?? post.content.slice(0, 160).replace(/\s+/g, " ").trim();

  return {
    title: `${post.title} — Blog Jago Akademi`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      ...(post.coverUrl ? { images: [{ url: post.coverUrl }] } : {}),
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  // BL-46: return a real 404 instead of an empty 200 page when the slug does
  // not exist. Next.js deduplicates this fetch with the generateMetadata one.
  const { slug } = await params;
  const post = await getPost(slug);
  if (post === null) notFound();

  // The client island reads the slug via useParams and fetches its own data,
  // preserving all existing interactive behavior unchanged.
  return <BlogArticleClient />;
}
