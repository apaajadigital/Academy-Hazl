import type { Metadata } from "next";
import { OG_IMAGE_FALLBACK } from "@/lib/seo";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Cerita Alumni — Kisah Nyata Lulusan Hazl Academy",
  description:
    "Cerita otentik dari alumni Hazl Academy: transformasi keahlian Video AI, capaian karier agensi, dan pengalaman produksi komersial mereka.",
  alternates: { canonical: "/alumni" },
  openGraph: {
    ...OG_IMAGE_FALLBACK,
    title: "Cerita Alumni — Hazl Academy",
    description:
      "Kisah nyata alumni Hazl Academy: transformasi keahlian Video AI dan capaian karier industri kreatif.",
    type: "website",
    url: "/alumni",
  },
};

export default function AlumniLayout({ children }: { children: ReactNode }) {
  if (!features.alumni) notFound();
  return <>{children}</>;
}
