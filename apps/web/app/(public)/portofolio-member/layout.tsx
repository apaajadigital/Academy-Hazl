import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Portofolio Member — Karya Nyata Member Jago Akademi",
  description:
    "Jelajahi portofolio member Jago Akademi: karya, proyek, dan pencapaian nyata dari para member komunitas kami.",
  alternates: { canonical: "/portofolio-member" },
  openGraph: {
    title: "Portofolio Member — Jago Akademi",
    description:
      "Karya dan proyek nyata dari member komunitas Jago Akademi.",
    type: "website",
    url: "/portofolio-member",
  },
};

export default function PortofolioMemberLayout({ children }: { children: ReactNode }) {
  // Gated behind the Portfolio feature flag — while OFF the route 404s,
  // matching how other unshipped feature pages behave (see kelas-privat gating).
  if (!features.portfolio) notFound();
  return <>{children}</>;
}
