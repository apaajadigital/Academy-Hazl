"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ExternalLink, Users, AlertTriangle } from "lucide-react";
import { getApiBase } from "@/lib/api/base";
import { EmptyState } from "@/components/ui/EmptyState";

type Creator = {
  id: string;
  name: string;
  avatarUrl: string | null;
  profile: { headline: string | null } | null;
};

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "list"; creators: Creator[]; total: number };

export default function CreatorsDirectoryPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function fetchCreators(q: string) {
    const id = ++requestIdRef.current;
    setState({ kind: "loading" });
    const params = new URLSearchParams({ limit: "24" });
    if (q) params.set("q", q);

    fetch(`${getApiBase()}/api/creators?${params.toString()}`)
      .then((r) => r.json())
      .then((body) => {
        if (id !== requestIdRef.current) return;
        if (!body.success) {
          setState({ kind: "error" });
          return;
        }
        const creators: Creator[] = body.data ?? [];
        setState(
          creators.length === 0
            ? { kind: "empty" }
            : { kind: "list", creators, total: body.meta?.total ?? creators.length },
        );
      })
      .catch(() => {
        if (id === requestIdRef.current) setState({ kind: "error" });
      });
  }

  useEffect(() => {
    fetchCreators("");
  }, []);

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCreators(q), 350);
  }

  return (
    <div className="w-full bg-white py-10 sm:py-14">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <span className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-[#9CA3AF] mb-2">
          Kreator Hazl
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#16181D]">
          Temukan kreatormu.
        </h1>
        <p className="mt-2 text-base text-[#5B616E]">
          Kenali karya dan keahlian mereka sebelum memilih kelas atau produk.
        </p>

        <div className="relative mt-6 max-w-xl">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707880]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari nama atau bidang kreator"
            className="w-full rounded-full border border-[#E7E9EC] bg-[#F9F9FB] pl-10 pr-4 py-3 text-sm text-[#16181D] placeholder-[#9CA3AF] focus:border-[#0077A8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0077A8]/10 transition-all"
            aria-label="Cari kreator"
          />
        </div>

        <div className="mt-10">
          {state.kind === "loading" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-[#E7E9EC] bg-white p-6 animate-pulse">
                  <div className="h-14 w-14 rounded-full bg-[#EDEDF4]" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-[#EDEDF4]" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-[#EDEDF4]" />
                </div>
              ))}
            </div>
          )}

          {state.kind === "error" && (
            <EmptyState
              icon={AlertTriangle}
              title="Gagal memuat daftar kreator"
              description="Terjadi gangguan saat mengambil data. Silakan coba muat ulang halaman."
              action={
                <button
                  onClick={() => fetchCreators(query)}
                  className="h-10 px-6 rounded-full bg-[#0077A8] text-white font-bold text-sm hover:bg-[#0D5B8A] transition-colors shadow-sm"
                >
                  Muat Ulang
                </button>
              }
            />
          )}

          {state.kind === "empty" && (
            <EmptyState
              icon={Users}
              title={query ? `Tidak ada kreator untuk "${query}"` : "Belum ada kreator terdaftar"}
              description={
                query
                  ? "Coba kata kunci lain."
                  : "Kreator akan muncul di sini setelah mereka menerbitkan kelas pertama."
              }
            />
          )}

          {state.kind === "list" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {state.creators.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#E7E9EC] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-[#E8F6FF]">
                    {c.avatarUrl ? (
                      <Image src={c.avatarUrl} alt={c.name} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#0077A8]">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[#16181D]">{c.name}</h3>
                  {c.profile?.headline && (
                    <p className="mt-1 text-sm text-[#5B616E] line-clamp-2">{c.profile.headline}</p>
                  )}
                  <Link
                    href={`/kreator/${c.id}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0077A8] hover:underline"
                  >
                    Lihat portofolio
                    <ExternalLink size={13} aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
