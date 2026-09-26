import type { Metadata } from "next";
import BlogListClient from "./BlogListClient";

export const metadata: Metadata = {
  title: "Blog — Jago Akademi",
  description:
    "Insight, tips, dan panduan pengembangan skill dan karier dari para praktisi. Baca artikel terbaru dari Jago Akademi.",
  openGraph: {
    title: "Blog Jago Akademi",
    description:
      "Insight, tips, dan panduan pengembangan skill dan karier dari para praktisi.",
    type: "website",
  },
};

export default function BlogPage() {
  return <BlogListClient />;
}
