import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function MentorLayout({ children }: { children: ReactNode }) {
  // Owner decision 4 Aug 2026: mentor listing stays visible with placeholder
  // data. The flag is now default ON but can be turned OFF with
  // NEXT_PUBLIC_FEATURE_MENTOR=false if needed.
  if (!features.mentor) notFound();
  return <>{children}</>;
}
