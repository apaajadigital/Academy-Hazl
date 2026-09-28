"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ImageOff, Star, Clock, Users } from "lucide-react";
import { getApiBase } from "@/lib/api/base";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Types (mirrors GET /api/creators/:id) ─────────────────────────────────────

type CreatorCourse = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  price: number | string;
  salePrice?: number | string | null;
  level?: string | null;
  thumbnailUrl?: string | null;
  totalDuration: number;
  totalEnrolled: number;
  avgRating?: number | string;
};

type PortfolioItem = { title: string; url?: string; imageUrl?: string; description?: string };

type Portfolio = {
  id: string;
  name: string;
  headline?: string | null;
  photoUrl?: string | null;
  portfolioItems: PortfolioItem[];
};

type CreatorProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  profile: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    expertise: string[];
    linkedin: string | null;
  } | null;
  courses: CreatorCourse[];
  portfolio: Portfolio[];
};

function formatRp(amount: number) {
  return amount === 0 ? "Gratis" : `Rp${amount.toLocaleString("id-ID")}`;
}

type Tab = "portfolio" | "shop";

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("portfolio");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    fetch(`${getApiBase()}/api/creators/${id}`)
      .then((r) => r.json())
      .then((body) => {
        if (ignore) return;
        if (!body.success || !body.data) {
          setError("Kreator tidak ditemukan.");
          return;
        }
        setCreator(body.data);
      })
      .catch(() => {
        if (!ignore) setError("Gagal memuat profil kreator. Coba lagi.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span
          className="h-8 w-8 rounded-full border-2 border-[#0077A8] border-t-transparent animate-spin"
          aria-label="Memuat profil…"
        />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-semibold text-[#16181D]">{error ?? "Kreator tidak ditemukan."}</p>
        <Link href="/kreator" className="text-sm font-bold text-[#0077A8] hover:underline">
          ← Kembali ke direktori kreator
        </Link>
      </div>
    );
  }

  const allPortfolioItems = creator.portfolio.flatMap((p) => p.portfolioItems);

  return (
    <div className="w-full bg-white py-8 sm:py-12">
      <div className="max-w-[1000px] mx-auto px-6 lg:px-8">
        <Link
          href="/kreator"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B616E] hover:text-[#16181D] transition-colors mb-6"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Kembali ke direktori kreator
        </Link>

        {/* Header */}
        <div className="flex items-start gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#E8F6FF]">
            {creator.avatarUrl ? (
              <Image src={creator.avatarUrl} alt={creator.name} fill sizes="80px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#0077A8]">
                {creator.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D]">
              {creator.name}
            </h1>
            {creator.profile?.headline && (
              <p className="mt-1 text-sm text-[#5B616E]">{creator.profile.headline}</p>
            )}
            {creator.profile?.location && (
              <p className="mt-0.5 text-xs text-[#9CA3AF]">{creator.profile.location}</p>
            )}
          </div>
        </div>

        {creator.profile?.expertise && creator.profile.expertise.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {creator.profile.expertise.map((e) => (
              <span
                key={e}
                className="rounded-full bg-[#F3F3FA] px-3 py-1 text-xs font-semibold text-[#5B616E]"
              >
                {e}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-6 border-b border-[#E7E9EC]">
          <button
            type="button"
            onClick={() => setTab("portfolio")}
            className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              tab === "portfolio" ? "border-[#CC0052] text-[#16181D]" : "border-transparent text-[#9CA3AF] hover:text-[#5B616E]"
            }`}
          >
            Portofolio
          </button>
          <button
            type="button"
            onClick={() => setTab("shop")}
            className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              tab === "shop" ? "border-[#CC0052] text-[#16181D]" : "border-transparent text-[#9CA3AF] hover:text-[#5B616E]"
            }`}
          >
            Etalase
          </button>
        </div>

        {/* Portfolio tab */}
        {tab === "portfolio" && (
          <div className="pt-8">
            {allPortfolioItems.length === 0 ? (
              <EmptyState
                icon={ImageOff}
                title="Belum ada karya diunggah"
                description={`${creator.name} belum menambahkan karya ke portofolionya.`}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {allPortfolioItems.map((item, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-[#E7E9EC] bg-white shadow-sm"
                  >
                    <div className="relative aspect-video w-full bg-[#E8F6FF]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="(min-width: 640px) 480px, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-[#16181D]">{item.title}</h3>
                      {item.description && (
                        <p className="mt-1 text-xs text-[#5B616E] line-clamp-2">{item.description}</p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs font-bold text-[#0077A8] hover:underline"
                        >
                          Lihat karya ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shop / Etalase tab */}
        {tab === "shop" && (
          <div className="pt-8">
            {creator.courses.length === 0 ? (
              <EmptyState
                icon={ImageOff}
                title="Belum ada produk"
                description={`${creator.name} belum menerbitkan kelas atau produk.`}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {creator.courses.map((course) => {
                  const price = Number(course.salePrice ?? course.price);
                  const rating = Number(course.avgRating ?? 0);
                  const hours =
                    course.totalDuration > 0 ? Math.round(course.totalDuration / 60) : 0;
                  return (
                    <Link
                      key={course.id}
                      href={`/e-course/kelas/${course.slug}`}
                      className="group overflow-hidden rounded-2xl border border-[#E7E9EC] bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="relative aspect-video w-full bg-[#E8F6FF]">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-bold text-[#16181D] group-hover:text-[#0077A8] transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5B616E]">
                          {hours > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} aria-hidden="true" />
                              {hours} jam
                            </span>
                          )}
                          {course.totalEnrolled > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Users size={12} aria-hidden="true" />
                              {course.totalEnrolled}
                            </span>
                          )}
                          {rating > 0 && (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                              <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                              {rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-base font-black text-[#16181D]">{formatRp(price)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
