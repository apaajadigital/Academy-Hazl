import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Portofolio Member — Hazl Academy",
  description:
    "Jelajahi profil member komunitas Video AI Hazl Academy.",
  alternates: { canonical: "/portofolio-member" },
  openGraph: {
    title: "Portofolio Member — Hazl Academy",
    description: "Profil member komunitas Video AI Hazl Academy.",
    type: "website",
    url: "/portofolio-member",
  },
};

export default function PortofolioMemberLayout({ children }: { children: ReactNode }) {
  if (!features.portfolio) notFound();
  return <>{children}</>;
}
