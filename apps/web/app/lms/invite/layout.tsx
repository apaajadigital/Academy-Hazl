import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function LmsInviteLayout({ children }: { children: ReactNode }) {
  if (!features.lmsB2b) notFound();
  return <>{children}</>;
}
