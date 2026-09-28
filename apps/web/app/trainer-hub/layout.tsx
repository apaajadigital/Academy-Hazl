import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import TrainerHubShell from "./TrainerHubShell";

export default function TrainerHubLayout({ children }: { children: ReactNode }) {
  if (!features.trainerHub) notFound();
  return <TrainerHubShell>{children}</TrainerHubShell>;
}
