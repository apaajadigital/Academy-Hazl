import { redirect } from "next/navigation";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PillarsSection } from "@/components/home/PillarsSection";
import { ECourseSpotlight } from "@/components/home/ECourseSpotlight";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { B2BSection } from "@/components/home/B2BSection";
import { EarlyAccessBand } from "@/components/home/EarlyAccessBand";
import { features } from "@/lib/features";

/**
 * Homepage (design refresh, Jul 2026) — varied editorial rhythm:
 * asymmetric hero → unit grid (sunken) → 3 pillars → flagship split
 * (sunken) → dark closing band. No fabricated data anywhere; social
 * proof is intentionally OMITTED until real testimonials/partners exist.
 *
 * HIDDEN, not deleted (Sep 2026, owner decision): the reference site
 * (hazl-skill.vercel.app) has no separate marketing homepage — its root
 * redirects straight to the catalog. `features.homepage` mirrors that:
 * OFF (default) sends '/' to /e-course; flip it "true" and rebuild to
 * restore this exact page at the root, nothing below was removed.
 */
export default function HomePage() {
  if (!features.homepage) redirect("/e-course");

  return (
    <>
      <HeroSection />
      <CategoryGrid />
      <PillarsSection />
      <ECourseSpotlight />
      <TestimonialsSection />
      {features.clients && <B2BSection />}
      <EarlyAccessBand />
    </>
  );
}
