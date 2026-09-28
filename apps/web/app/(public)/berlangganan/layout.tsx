import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function BerlanggananLayout({ children }: { children: ReactNode }) {
  if (!features.subscription) notFound();
  return <>{children}</>;
}
