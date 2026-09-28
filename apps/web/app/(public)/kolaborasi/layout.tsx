import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function KolaborasiLayout({ children }: { children: ReactNode }) {
  if (!features.trainerHub) notFound();
  return <>{children}</>;
}
