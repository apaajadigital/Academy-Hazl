import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Portofolio Member — Karya Video AI Terverifikasi Hazl Academy",
  description:
    "Jelajahi etalase karya Video AI member Hazl Academy: TVC komersial, visual kampanye brand, dan implementasi node ComfyUI berstandar industri.",
  alternates: { canonical: "/portofolio-member" },
  openGraph: {
    title: "Portofolio Member Video AI — Hazl Academy",
    description:
      "Karya dan proyek komersial nyata dari member komunitas Video AI Hazl Academy.",
    type: "website",
    url: "/portofolio-member",
  },
};

export default function PortofolioMemberLayout({ children }: { children: ReactNode }) {
  if (!features.portfolio) notFound();
  return <>{children}</>;
}
