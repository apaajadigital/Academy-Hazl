import { ArrowRight, BookOpen, Building2, CalendarDays, GraduationCap, Library, Store } from "lucide-react";
import Link from "next/link";
import { CategoryCard } from "@/components/ui/CategoryCard";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const UNITS = [
  {
    href: "/e-course",
    icon: BookOpen,
    name: "E-Course",
    description: "Kursus video praktis dengan sertifikat resmi — akses sekali bayar.",
  },
  {
    href: "/event",
    icon: CalendarDays,
    name: "Event & Workshop",
    description: "Webinar dan workshop intensif bersama praktisi industri.",
  },
  {
    href: "/ebook",
    icon: Library,
    name: "E-Book",
    description: "Panduan praktis dan template siap pakai untuk kebutuhan kerja.",
  },
  {
    href: "/clients",
    icon: Building2,
    name: "LMS Perusahaan",
    description: "Kelola pelatihan tim dengan batch, tugas, dan laporan progres.",
  },
  {
    href: "/trainer-program",
    icon: GraduationCap,
    name: "Trainer Program",
    description: "Jalur menjadi trainer bersertifikat di Jago Akademi.",
    note: "Segera hadir",
  },
  {
    href: "/marketplace",
    icon: Store,
    name: "Marketplace Materi",
    description: "Modul dan materi training langsung dari pembuatnya.",
    note: "Segera hadir",
  },
] as const;

/** "Jelajahi berdasarkan kebutuhan" — business-unit tiles (mirrors Udacity Schools). */
export function CategoryGrid() {
  return (
    <Section tone="sunken">
      <SectionHeader
        eyebrow="Jelajahi"
        title={
          <>
            Satu platform, <span className="bg-brand-gradient bg-clip-text text-transparent">enam</span> cara belajar
          </>
        }
        lede="Pilih jalur yang sesuai kebutuhanmu — belajar mandiri, hadir di event, atau melatih tim perusahaan."
        action={
          <Link href="/e-course" className="link-arrow">
            Lihat E-Course
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UNITS.map((unit, i) => (
          <Reveal key={unit.href} delay={i * 0.05}>
            <CategoryCard
              href={unit.href}
              icon={unit.icon}
              name={unit.name}
              description={unit.description}
              note={"note" in unit ? unit.note : undefined}
              accent={i % 3 === 1 ? "pink" : "cyan"}
              className="h-full"
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
