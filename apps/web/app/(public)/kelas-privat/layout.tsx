import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export const metadata: Metadata = {
  title: "Private Class — Mentoring Intensif Bersama Mentor",
  description:
    "Program belajar intensif Jago Akademi dengan pendampingan mentor: grup mentoring privat, sesi live terjadwal, dan kurikulum yang disesuaikan dengan tujuanmu.",
  alternates: { canonical: "/kelas-privat" },
  openGraph: {
    title: "Private Class — Jago Akademi",
    description:
      "Belajar intensif didampingi mentor: grup mentoring privat, sesi live, dan kurikulum terarah.",
    type: "website",
    url: "/kelas-privat",
  },
};

export default function KelasPrivatLayout({ children }: { children: ReactNode }) {
  // Gated behind the Private Class feature flag — while OFF the route 404s,
  // matching how other unshipped feature pages behave (see e-course gating).
  if (!features.privateClass) notFound();
  return <>{children}</>;
}
