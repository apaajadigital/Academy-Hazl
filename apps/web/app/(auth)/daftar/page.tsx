import type { Metadata } from "next";
import { DaftarForm } from "./DaftarForm";

export const metadata: Metadata = { title: "Daftar" };

export default function DaftarPage() {
  return <DaftarForm />;
}
