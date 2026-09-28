import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function ClientsLayout({ children }: { children: ReactNode }) {
  if (!features.clients) notFound();
  return <>{children}</>;
}
