import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Komunitas Kreator Video AI — Hazl Academy",
  description:
    "Gabung Komunitas Kreator Hazl Academy: ruang diskusi prompt, bedah node ComfyUI, review portofolio UGC, dan peluang proyek komersial bersama 14.200+ kreator.",
  alternates: { canonical: "/komunitas" },
  openGraph: {
    title: "Komunitas Kreator Video AI — Hazl Academy",
    description:
      "Ruang diskusi prompt, bedah workflow node, review portofolio komersial, dan networking bersama 14.200+ kreator Video AI.",
    type: "website",
    url: "/komunitas",
  },
};

export default function KomunitasLayout({ children }: { children: ReactNode }) {
  if (!features.community) notFound();
  return <>{children}</>;
}
