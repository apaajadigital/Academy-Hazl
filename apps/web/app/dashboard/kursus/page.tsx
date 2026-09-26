"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  Plus,
  ArrowRight,
  User,
  CheckCircle2,
  BookOpen,
  PlayCircle,
  CircleDashed,
} from "lucide-react";
import { getMyEnrollments, type Enrollment } from "../../../lib/api/enrollment";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import {
  StatCard,
  ProgressBar,
  EmptyState,
  FilterBar,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  DashboardLoading,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type SortOption = "terbaru" | "terlama" | "progres-tinggi" | "progres-rendah" | "a-z";
type FilterStatus = "semua" | "belajar" | "selesai" | "belum-mulai";

export default function KursusSayaPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("terbaru");
  const [filter, setFilter] = useState<FilterStatus>("semua");

  useEffect(() => {
    // Finding #1: read token via getValidToken so a session persisted only in
    // localStorage (new tab / restore) is honored instead of bouncing to /masuk.
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      getMyEnrollments(token)
        .then(setEnrollments)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    })();
  }, [router]);

  const filtered = useMemo(() => {
    let list = [...enrollments];

    // Filter by status
    if (filter === "selesai") list = list.filter((e) => e.isCompleted);
    else if (filter === "belajar") list = list.filter((e) => !e.isCompleted && Number(e.progressPct) > 0);
    else if (filter === "belum-mulai") list = list.filter((e) => Number(e.progressPct) === 0);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.course.title.toLowerCase().includes(q) ||
          (e.course.trainer?.name ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sort) {
      case "terbaru":
        list.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
        break;
      case "terlama":
        list.sort((a, b) => new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime());
        break;
      case "progres-tinggi":
        list.sort((a, b) => Number(b.progressPct) - Number(a.progressPct));
        break;
      case "progres-rendah":
        list.sort((a, b) => Number(a.progressPct) - Number(b.progressPct));
        break;
      case "a-z":
        list.sort((a, b) => a.course.title.localeCompare(b.course.title, "id"));
        break;
    }

    return list;
  }, [enrollments, filter, search, sort]);

  const stats = useMemo(() => ({
    total: enrollments.length,
    selesai: enrollments.filter((e) => e.isCompleted).length,
    belajar: enrollments.filter((e) => !e.isCompleted && Number(e.progressPct) > 0).length,
    belumMulai: enrollments.filter((e) => Number(e.progressPct) === 0).length,
  }), [enrollments]);

  if (loading) {
    return <DashboardLoading />;
  }

  const kpis = [
    { label: "Total", value: stats.total, icon: BookOpen, accent: "#0077A8", tint: "rgba(0,119,168,0.10)" },
    { label: "Selesai", value: stats.selesai, icon: CheckCircle2, accent: "#22C55E", tint: "rgba(34,197,94,0.10)" },
    { label: "Berlangsung", value: stats.belajar, icon: PlayCircle, accent: "#F59E0B", tint: "rgba(245,158,11,0.10)" },
    { label: "Belum Mulai", value: stats.belumMulai, icon: CircleDashed, accent: "#9CA3AF", tint: "rgba(156,163,175,0.12)" },
  ];

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Kursus Saya</h1>
          <p className="mt-1 text-sm text-text-secondary">{enrollments.length} kursus terdaftar</p>
        </div>
        <Link href="/e-course" className="btn btn-primary btn-sm">
          <Plus size={16} aria-hidden="true" /> Tambah Kursus
        </Link>
      </div>

      {/* Mini stats */}
      <section className="dash-grid">
        {kpis.map(({ label, value, icon: Icon, accent, tint }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={Icon}
            iconColor={accent}
            iconBg={tint}
          />
        ))}
      </section>

      {/* Filter & Search bar */}
      <FilterBar
        search={
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Cari kursus atau mentor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              aria-label="Cari kursus atau mentor"
              className={search ? "pr-10" : undefined}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label="Bersihkan pencarian"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        }
        filters={
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            aria-label="Urutkan"
            className="w-full sm:w-56"
          >
            <option value="terbaru">Terbaru Didaftar</option>
            <option value="terlama">Terlama Didaftar</option>
            <option value="progres-tinggi">Progres Tertinggi</option>
            <option value="progres-rendah">Progres Terendah</option>
            <option value="a-z">A → Z</option>
          </Select>
        }
      />

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
        <TabsList>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="belajar">Berlangsung</TabsTrigger>
          <TabsTrigger value="selesai">Selesai</TabsTrigger>
          <TabsTrigger value="belum-mulai">Belum Mulai</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error */}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={enrollments.length === 0 ? BookOpen : Search}
          title={enrollments.length === 0 ? "Belum ada kursus" : "Tidak ada hasil"}
          description={
            enrollments.length === 0
              ? "Mulai belajar dengan mendaftar kursus pertama Anda."
              : "Coba ubah kata kunci pencarian atau filter."
          }
          action={
            enrollments.length === 0 ? (
              <Link href="/e-course" className="btn btn-primary btn-sm">Jelajahi Kursus</Link>
            ) : undefined
          }
        />
      )}

      {/* Course grid */}
      {filtered.length > 0 && (
        <div className="dash-grid">
          {filtered.map((e) => {
            const pct = Number(e.progressPct);
            const levelColor = {
              pemula: "#22C55E",
              menengah: "#F59E0B",
              mahir: "#EF4444",
            }[e.course.level?.toLowerCase() ?? ""] ?? "#9CA3AF";

            return (
              <Link
                key={e.id}
                href={`/belajar/${e.course.slug}`}
                className="group col-span-12 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-surface-card shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e3 md:col-span-6 xl:col-span-4"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-surface-sunken">
                  {e.course.thumbnailUrl ? (
                    <Image src={e.course.thumbnailUrl} alt={e.course.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                  ) : (
                    <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} className="!absolute !inset-0 !h-full !rounded-none !border-0" />
                  )}
                  {/* Level badge */}
                  {e.course.level && (
                    <span className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize text-white" style={{ background: levelColor }}>
                      {e.course.level}
                    </span>
                  )}
                  {/* Status overlay */}
                  {e.isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/15">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-2 text-[13px] font-bold text-white">
                        <CheckCircle2 size={14} aria-hidden="true" /> Selesai
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-text-primary transition-colors group-hover:text-accent-cyan-strong">
                    {e.course.title}
                  </h3>
                  {e.course.trainer && (
                    <p className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                      <User size={12} aria-hidden="true" /> {e.course.trainer.name}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mt-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">Progres Belajar</span>
                      <span className={`text-[11px] font-bold ${pct === 100 ? "text-green-600" : "text-accent-cyan-strong"}`}>
                        {pct}%
                      </span>
                    </div>
                    <ProgressBar
                      value={pct}
                      label={`Progres belajar ${e.course.title}`}
                      barClassName={pct === 100 ? "bg-green-500" : undefined}
                    />
                  </div>

                  {/* Enrolled date */}
                  <p className="mt-auto text-[10px] text-text-muted">
                    Terdaftar {new Date(e.enrolledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  <div className="mt-2 inline-flex items-center gap-1 border-t border-border-subtle pt-2 text-xs font-semibold text-accent-cyan-strong">
                    {e.isCompleted ? "Lihat Kembali" : pct > 0 ? "Lanjut Belajar" : "Mulai Belajar"}
                    <ArrowRight size={14} aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
