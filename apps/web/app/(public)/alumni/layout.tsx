import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Cerita Alumni — Kisah Nyata Peserta Hazl Academy",
  description:
    "Cerita nyata dari alumni Hazl Academy: perjalanan belajar, capaian karier, dan pengalaman mereka mengikuti program kami.",
  alternates: { canonical: "/alumni" },
  openGraph: {
    title: "Cerita Alumni — Hazl Academy",
    description:
      "Kisah nyata alumni Hazl Academy: perjalanan belajar dan capaian karier mereka.",
    type: "website",
    url: "/alumni",
  },
};

export default function AlumniLayout({ children }: { children: ReactNode }) {
  // Gated behind the Alumni feature flag — while OFF the route 404s,
  // matching how other unshipped feature pages behave (see kelas-privat gating).
  if (!features.alumni) notFound();
  return <>{children}</>;
}
