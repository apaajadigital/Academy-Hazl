import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PillarsSection } from "@/components/home/PillarsSection";
import { ECourseSpotlight } from "@/components/home/ECourseSpotlight";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { B2BSection } from "@/components/home/B2BSection";
import { EarlyAccessBand } from "@/components/home/EarlyAccessBand";

/**
 * Homepage (design refresh, Jul 2026) — varied editorial rhythm:
 * asymmetric hero → unit grid (sunken) → 3 pillars → flagship split
 * (sunken) → dark closing band. No fabricated data anywhere; social
 * proof is intentionally OMITTED until real testimonials/partners exist.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoryGrid />
      <PillarsSection />
      <ECourseSpotlight />
      <TestimonialsSection />
      <B2BSection />
      <EarlyAccessBand />
    </>
  );
}
