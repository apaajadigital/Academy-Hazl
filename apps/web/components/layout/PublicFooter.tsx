"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function PublicFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/checkout") || pathname?.startsWith("/payment")) {
    return null;
  }
  return <Footer />;
}
