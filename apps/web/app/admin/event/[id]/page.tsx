"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { DashboardError, DashboardLoading, PageHeader, TableActionButton } from "@/components/ui";
import { getAdminEventById, updateAdminEvent } from "@/lib/api/events";
import {
  EventForm,
  eventRecordToValues,
  validateEventValues,
  valuesToPatch,
  type EventFormValues,
} from "../EventForm";

/**
 * Edit an event (BL-61) — `PATCH /api/events/admin/:id`.
 *
 * The row is loaded through `getAdminEventById`, which scans the paginated admin
 * list because the API exposes no by-id endpoint (documented at the helper). The
 * form submits a DIFF, so an untouched field — including a legacy `status` the
 * enum would reject — is never rewritten.
 */

export default function AdminEventEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [initialValues, setInitialValues] = useState<EventFormValues | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginRedirect = `/masuk?redirect=/admin/event/${eventId}`;

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await getAdminEventById(eventId);

    if (!result.success) {
      // BL-60d: distinguish a dead session from a missing event.
      if (result.status === 401) {
        router.replace(loginRedirect);
        return;
      }
      setLoadError(result.error.message);
      setLoading(false);
      return;
    }

    setInitialValues(eventRecordToValues(result.data));
    setTitle(result.data.title);
    setLoading(false);
  }, [eventId, loginRedirect, router]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  async function handleSubmit(values: EventFormValues) {
    if (!initialValues) return;

    const invalid = validateEventValues(values);
    if (invalid) {
      setError(invalid);
      return;
    }

    const patch = valuesToPatch(values, initialValues);
    if (Object.keys(patch).length === 0) {
      setError("Belum ada perubahan untuk disimpan.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await updateAdminEvent(eventId, patch);

    if (result.success) {
      router.replace("/admin/event");
      router.refresh();
      return;
    }

    setSubmitting(false);
    if (result.status === 401) {
      router.replace(loginRedirect);
      return;
    }
    // 400 VALIDATION_ERROR arrives as "field: message; field: message".
    setError(result.error.message);
  }

  return (
    <div className="dash-container flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/admin/event"
            className="inline-flex items-center gap-1 text-text-secondary transition-colors hover:text-accent-cyan-strong"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Manajemen Event
          </Link>
        }
        title="Ubah Event"
        subtitle={title || undefined}
        actions={
          <TableActionButton
            href={`/admin/event/${eventId}/peserta`}
            leftIcon={<Users size={14} aria-hidden="true" />}
          >
            Lihat Peserta
          </TableActionButton>
        }
      />

      {loading ? (
        <DashboardLoading />
      ) : loadError || !initialValues ? (
        <DashboardError message={loadError ?? "Event tidak ditemukan."} onRetry={() => void loadEvent()} />
      ) : (
        <EventForm
          initialValues={initialValues}
          submitLabel="Simpan Perubahan"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/event")}
          note={
            <p className="rounded-[var(--radius-md)] border border-solid border-border-default bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-text-secondary">
              Hanya kolom yang Anda ubah yang dikirim ke server. Mengosongkan
              Waktu Selesai, Harga Promo, Kuota, atau URL Sampul tidak menghapus
              nilai yang tersimpan — API hanya menerima nilai pengganti.
            </p>
          }
        />
      )}
    </div>
  );
}
