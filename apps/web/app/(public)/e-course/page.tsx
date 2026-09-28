import type { Metadata } from "next";
import { OG_IMAGE_FALLBACK } from "@/lib/seo";
import { ECourseHero } from "@/components/e-course/ECourseHero";
import { ECourseCatalog } from "@/components/e-course/ECourseCatalog";
import { ECourseFeatures } from "@/components/e-course/ECourseFeatures";
import { ECourseTestimonials } from "@/components/e-course/ECourseTestimonials";

export const metadata: Metadata = {
  title: "Kelas Video AI | Hazl Academy",
  description:
    "Katalog kelas video AI di Hazl Academy: prompt, image-to-video, editing, iklan, UGC, dan motion. Belajar dari kreator Indonesia, lalu jual karyamu sendiri.",
  openGraph: {
    ...OG_IMAGE_FALLBACK,
    title: "Kelas Video AI | Hazl Academy",
    description:
      "Pilih kelas video AI dari kreator Indonesia. Praktik langsung, dapat sertifikat ber-QR.",
    type: "website",
  },
};

export default function ECoursePage() {
  return (
    <>
      <ECourseHero />
      <ECourseCatalog />
      <ECourseFeatures />
      <ECourseTestimonials />
    </>
  );
}
