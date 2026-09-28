import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function AfiliasiLayout({ children }: { children: ReactNode }) {
  if (!features.affiliate) notFound();
  return <>{children}</>;
}
