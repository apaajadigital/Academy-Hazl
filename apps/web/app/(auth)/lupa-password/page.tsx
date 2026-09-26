import type { Metadata } from "next";
import { LupaPasswordForm } from "./LupaPasswordForm";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default function LupaPasswordPage() {
  return <LupaPasswordForm />;
}
