import type { Metadata } from "next";
import { OG_IMAGE_FALLBACK } from "@/lib/seo";
import BlogListClient from "./BlogListClient";

export const metadata: Metadata = {
  title: "Wawasan & Riset Video AI — Hazl Academy",
  description:
    "Riset komparasi tools generative video, tutorial workflow ComfyUI, teknik prompt engineering, dan panduan komersialisasi UGC dari praktisi industri.",
  openGraph: {
    ...OG_IMAGE_FALLBACK,
    title: "Wawasan & Riset Video AI — Hazl Academy",
    description:
      "Riset komparasi tools generative video, tutorial workflow ComfyUI, teknik prompt engineering, dan panduan komersialisasi UGC.",
    type: "website",
  },
};

export default function BlogPage() {
  return <BlogListClient />;
}
