"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

const PAGE_SIZE = 12;

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiPortfolio = {
  id: string;
  name: string;
  role: string;
  headline?: string | null;
  photoUrl?: string | null;
  featured?: boolean;
};

type ApiMeta = {
  total?: number;
  page?: number;
  limit?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "M"
  );
}

function safePhotoUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

// ─── Card Component (Matches E2E Selector Contract) ───────────────────────────

function MemberCard({ member }: { member: ApiPortfolio }) {
  const photo = safePhotoUrl(member.photoUrl);

  return (
    <Link
      href={`/portofolio-member/${encodeURIComponent(member.id)}`}
      className={`pm-card group flex flex-col justify-between rounded-2xl border border-border-default bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-cyan-strong hover:shadow-md ${
        member.featured ? "pm-card-featured border-accent-cyan-strong/40 bg-surface-page/50" : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {photo ? (
              <img src={photo} alt="" className="pm-avatar-img h-11 w-11 rounded-full border border-border-default object-cover" loading="lazy" />
            ) : (
              <div className="pm-avatar-initials flex h-11 w-11 items-center justify-center rounded-full bg-surface-accent-soft font-bold text-accent-cyan-strong" aria-hidden="true">
                {initialsOf(member.name)}
              </div>
            )}
            <div>
              <h2 className="pm-name text-sm font-bold text-text-primary group-hover:text-accent-cyan-strong">
                {member.name}
              </h2>
              <p className="pm-role text-xs text-text-muted">{member.role}</p>
            </div>
          </div>
          {member.featured && (
            <span className="pm-badge inline-flex items-center gap-1 rounded-full bg-surface-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent-cyan-strong">
              <Sparkles size={11} aria-hidden="true" />
              Unggulan
            </span>
          )}
        </div>

        {member.headline && (
          <p className="pm-headline mt-4 text-xs md:text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {member.headline}
          </p>
        )}
      </div>

      <div className="mt-5 border-t border-border-default pt-3">
        <span className="pm-view-link inline-flex items-center gap-1 text-xs font-bold text-accent-cyan-strong group-hover:underline">
          Lihat portofolio →
        </span>
      </div>
    </Link>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function PortofolioMemberPage() {
  const [members, setMembers] = useState<ApiPortfolio[] | null>(null);

  const fetchPage = useCallback(async (pageNum: number): Promise<{
    items: ApiPortfolio[];
    total: number | null;
  }> => {
    try {
      const res = await fetch(`${API}/api/portfolios?page=${pageNum}&limit=${PAGE_SIZE}`);
      const body = (await res.json()) as {
        success?: boolean;
        data?: unknown;
        meta?: ApiMeta;
      };
      if (!body?.success) return { items: [], total: null };
      const raw = Array.isArray(body.data) ? body.data : [];
      const items = (raw as ApiPortfolio[]).filter((m) => Boolean(m && m.id && m.name && m.role));
      const totalCount =
        typeof body.meta?.total === "number" && Number.isFinite(body.meta.total)
          ? body.meta.total
          : null;
      return { items, total: totalCount };
    } catch {
      return { items: [], total: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPage(1).then(({ items }) => {
      if (cancelled) return;
      setMembers(items);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  return (
    <main id="main-content" className="pm-root min-h-screen bg-surface-page">
      {/* ── Hero Header ────────────────────────────────────────────── */}
      <section className="border-b border-border-default bg-white py-16 md:py-20 text-center">
        <div className="container-pad">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-page px-3.5 py-1 text-xs font-semibold text-accent-cyan-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-pink-strong animate-pulse" />
              MEMBER &amp; ALUMNI
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              Portofolio <span className="text-accent-cyan-strong">Member Hazl Academy</span>
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-text-secondary">
              Jelajahi profil member komunitas Video AI Hazl Academy.
            </p>
          </div>
        </div>
      </section>

      {/* ── Member Directory (Matches E2E Test Contract) ─────────────── */}
      <section className="section-sm border-b border-border-default bg-surface-page">
        <div className="container-pad">
          <div className="mx-auto max-w-5xl">
            {members === null ? (
              <p className="py-12 text-center text-sm text-text-muted">Memuat direktori member…</p>
            ) : members.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted">
                Belum ada member yang ditampilkan di halaman ini.
              </p>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-text-primary">Direktori Member</h2>
                  <p className="text-xs text-text-secondary">Profil member komunitas Video AI Hazl Academy.</p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => (
                    <MemberCard key={m.id} member={m} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
