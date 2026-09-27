import type { Metadata } from "next";
import type { ReactNode } from "react";

// Metadata must promise exactly what the catalog contains (EPIC 8). The page body
// was corrected to drop "modul"/recordings; the title, description, and OG tags are
// what search results and share previews actually show, so they carry the same rule.
export const metadata: Metadata = {
  title: "Marketplace Materi Digital — Hazl Academy",
  description:
    "Koleksi e-book dan materi digital dari praktisi Hazl Academy. Beli sekali, unduh langsung, akses selamanya.",
  openGraph: {
    title: "Marketplace Materi Digital — Hazl Academy",
    description:
      "E-book dan materi digital dari praktisi berpengalaman. Unduh PDF, akses kapan saja.",
    type: "website",
  },
};

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
