import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function MentorLayout({ children }: { children: ReactNode }) {
  // BL-114: the mentor roster in lib/e-course/data.ts is 7 fictional people
  // paired with real companies (Tokopedia, Gojek, BCA, ...) and placeholder
  // LinkedIn links — it was live and sitemap-indexed. Gated OFF until the owner
  // supplies real, consented mentors; flipping NEXT_PUBLIC_FEATURE_MENTOR=true
  // (plus a rebuild) restores the whole subtree unchanged. Same mechanism as
  // the other unshipped feature pages (see alumni/komunitas layouts).
  if (!features.mentor) notFound();
  return <>{children}</>;
}
