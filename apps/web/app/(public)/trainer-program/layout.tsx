import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";

export default function TrainerProgramLayout({ children }: { children: ReactNode }) {
  if (!features.trainerProgram) notFound();
  return <>{children}</>;
}
