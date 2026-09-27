import type { Metadata } from "next";
import BlogListClient from "./BlogListClient";

export const metadata: Metadata = {
  title: "Wawasan & Riset Video AI — Hazl Academy",
  description:
    "Riset komparasi tools generative video, tutorial workflow ComfyUI, teknik prompt engineering, dan panduan komersialisasi UGC dari praktisi industri.",
  openGraph: {
    title: "Wawasan & Riset Video AI — Hazl Academy",
    description:
      "Riset komparasi tools generative video, tutorial workflow ComfyUI, teknik prompt engineering, dan panduan komersialisasi UGC.",
    type: "website",
  },
};

export default function BlogPage() {
  return <BlogListClient />;
}
