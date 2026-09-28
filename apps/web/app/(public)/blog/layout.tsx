import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function BlogLayout({ children }: { children: ReactNode }) {
  if (!features.blog) notFound();
  return <>{children}</>;
}
