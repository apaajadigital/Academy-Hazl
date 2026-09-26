import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Komunitas Jago Akademi",
  description:
    "Gabung Komunitas Jago Akademi: belajar bareng sesama learner, ikut sharing session dan kelas gratis bulanan, networking, serta info program lebih dulu.",
  alternates: { canonical: "/komunitas" },
  openGraph: {
    title: "Komunitas Jago Akademi",
    description:
      "Belajar bareng, sharing session, dan networking bersama sesama learner Jago Akademi.",
    type: "website",
    url: "/komunitas",
  },
};

export default function KomunitasLayout({ children }: { children: ReactNode }) {
  // Gated behind the Community feature flag — while OFF the route 404s,
  // matching how other unshipped feature pages behave (see kelas-privat gating).
  if (!features.community) notFound();
  return <>{children}</>;
}
