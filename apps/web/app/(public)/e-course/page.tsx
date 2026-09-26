import type { Metadata } from "next";
import { ECourseHero } from "@/components/e-course/ECourseHero";
import { ECourseTestimonials } from "@/components/e-course/ECourseTestimonials";
import { ECourseFeatures } from "@/components/e-course/ECourseFeatures";
import { ECourseCatalog } from "@/components/e-course/ECourseCatalog";

export const metadata: Metadata = {
  title: "E-Course — Skill Profesional & Bersertifikat",
  description:
    "Kuasai skill profesional dengan akses materi sekali bayar. Belajar fleksibel, dapatkan sertifikat resmi, dan buka peluang karier bersama Jago Akademi.",
  openGraph: {
    title: "E-Course Jago Akademi — Materi Profesional & Bersertifikat",
    description:
      "Platform e-learning untuk Digital Marketing, Data Science, UI/UX, Product Management, Web Development, dan banyak lagi.",
    type: "website",
  },
};

export default function ECoursePage() {
  return (
    <>
      <ECourseHero />
      <ECourseFeatures />
      <ECourseCatalog />
      <ECourseTestimonials />
    </>
  );
}
