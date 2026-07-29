"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { createAdminEvent } from "@/lib/api/events";
import {
  EMPTY_EVENT_VALUES,
  EventForm,
  validateEventValues,
  valuesToCreateInput,
  type EventFormValues,
} from "../EventForm";

/**
 * Create an event (BL-61) — `POST /api/events/admin`.
 *
 * The backend has had full Event CRUD since BL-59 but no screen ever called it,
 * so events could only be created straight in the database. Every control here
 * is bound to that one endpoint; nothing is rendered that it cannot store.
 */

const LOGIN_REDIRECT = "/masuk?redirect=/admin/event/baru";

export default function AdminEventCreatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: EventFormValues) {
    const invalid = validateEventValues(values);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createAdminEvent(valuesToCreateInput(values));

    if (result.success) {
      // Keep the spinner on: the list page replaces this screen immediately.
      router.replace("/admin/event");
      router.refresh();
      return;
    }

    setSubmitting(false);
    // BL-60d: an expired session goes to /masuk instead of looking like a
    // validation failure. Every other error (incl. the 400 VALIDATION_ERROR
    // field list and the "Slug sudah digunakan." conflict) is shown verbatim.
    if (result.status === 401) {
      router.replace(LOGIN_REDIRECT);
      return;
    }
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
        title="Buat Event"
        subtitle="Isi detail event. Event baru berstatus draft sampai Anda mempublikasikannya."
      />

      <EventForm
        initialValues={EMPTY_EVENT_VALUES}
        submitLabel="Simpan Event"
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/event")}
      />
    </div>
  );
}
