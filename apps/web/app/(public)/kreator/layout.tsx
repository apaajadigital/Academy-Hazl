import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function KreatorLayout({ children }: { children: ReactNode }) {
  if (!features.creators) notFound();
  return <>{children}</>;
}
