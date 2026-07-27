"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  Badge,
  Table,
  TableContainer,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
  PageHeader,
  DashboardLoading,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Course = {
  id: string;
  title: string;
  status: string;
  price: number;
  enrollments: number;
};

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  published: { label: "Aktif", variant: "success" },
  pending: { label: "Review", variant: "warning" },
  rejected: { label: "Ditolak", variant: "danger" },
  archived: { label: "Arsip", variant: "neutral" },
};

export default function TrainerCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      try {
        const r = await fetch("/api/trainer/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) setCourses(d.data.courses);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        title="Kursus Saya"
        breadcrumb={
          <span className="flex items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span className="text-text-secondary">/</span>
            <span className="font-medium text-text-primary">Kursus Saya</span>
          </span>
        }
      />

      {loading ? (
        <DashboardLoading />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada kursus"
          description="Hubungi admin untuk menambahkan kursus Anda."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR>
                <TH>Judul Kursus</TH>
                <TH className="text-center">Peserta</TH>
                <TH className="text-right">Harga</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-center">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {courses.map((c) => {
                const meta = STATUS_META[c.status] ?? { label: "Draft", variant: "neutral" as const };
                return (
                  <TR key={c.id}>
                    <TD className="font-medium text-text-primary">{c.title}</TD>
                    <TD className="text-center text-text-secondary">{c.enrollments.toLocaleString("id-ID")}</TD>
                    <TD className="text-right text-text-primary">
                      Rp {Number.isFinite(c.price) ? c.price.toLocaleString("id-ID") : "0"}
                    </TD>
                    <TD className="text-center">
                      <Badge variant={meta.variant} dot>{meta.label}</Badge>
                    </TD>
                    <TD className="text-center">
                      <Link href={`/trainer-hub/kursus/${c.id}`} className="text-xs font-medium text-accent-cyan-strong hover:underline">
                        Lihat Analitik →
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
