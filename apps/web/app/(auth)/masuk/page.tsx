import type { Metadata } from "next";
import { Suspense } from "react";
import { MasukForm } from "./MasukForm";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <Suspense>
      <MasukForm />
    </Suspense>
  );
}
