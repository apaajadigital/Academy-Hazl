import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Portofolio Member — Karya Nyata Member Hazl Academy",
  description:
    "Jelajahi portofolio member Hazl Academy: karya, proyek, dan pencapaian nyata dari para member komunitas kami.",
  alternates: { canonical: "/portofolio-member" },
  openGraph: {
    title: "Portofolio Member — Hazl Academy",
    description:
      "Karya dan proyek nyata dari member komunitas Hazl Academy.",
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
