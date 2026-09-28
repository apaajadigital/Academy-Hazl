import type { Metadata } from "next";
import { OG_IMAGE_FALLBACK } from "@/lib/seo";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

// Metadata must promise exactly what the catalog contains (EPIC 8). The page body
// was corrected to drop "modul"/recordings; the title, description, and OG tags are
// what search results and share previews actually show, so they carry the same rule.
export const metadata: Metadata = {
  title: "Marketplace Aset & Workflow Video AI — Hazl Academy",
  description:
    "Koleksi workflow ComfyUI, prompt bundle masterclass, checkpoint LoRA, dan modul aset generative video dari creator Hazl Academy. Beli sekali, akses selamanya.",
  openGraph: {
    ...OG_IMAGE_FALLBACK,
    title: "Marketplace Aset & Workflow Video AI — Hazl Academy",
    description:
      "Workflow ComfyUI, prompt bundle masterclass, dan aset generative video dari praktisi AI terpercaya.",
    type: "website",
  },
};

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  if (!features.marketplace) notFound();
  return <>{children}</>;
}
