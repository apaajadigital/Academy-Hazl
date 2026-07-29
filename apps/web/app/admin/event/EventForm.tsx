"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { EVENT_STATUSES, EVENT_TYPES, getEventStatusLabel, getEventTypeLabel } from "@/lib/event-labels";
import type { AdminEventInput, AdminEventPatch, EventRecord } from "@/lib/api/events";

/**
 * Shared create/edit form for `model Event` (BL-61).
 *
 * WHY ONE COMPONENT: `POST /api/events/admin` (`eventSchema`) and
 * `PATCH /api/events/admin/:id` (`eventSchema.partial()`) accept exactly the
 * same column set, so a second form would only be a second chance to drift from
 * the contract. Every field below maps 1:1 to a key of that schema — there is
 * deliberately no field the API cannot store.
 *
 * All values are held as strings (the DOM's native form representation) and
 * converted at the boundary by the exported helpers, so "empty" stays
 * distinguishable from "zero".
 */

export type EventFormValues = {
  slug: string;
  title: string;
  description: string;
  type: string;
  status: string;
  /** `datetime-local` value (no timezone) — converted to ISO on submit. */
  startDate: string;
  endDate: string;
  location: string;
  venue: string;
  /** Raw numeric inputs; kept as strings so a cleared field is not `0`. */
  price: string;
  salePrice: string;
  quota: string;
  coverUrl: string;
  speakerName: string;
  speakerBio: string;
  isFeatured: boolean;
};

/** Mirrors the `eventSchema` defaults so a new event starts where the API does. */
export const EMPTY_EVENT_VALUES: EventFormValues = {
  slug: "",
  title: "",
  description: "",
  type: "online",
  status: "draft",
  startDate: "",
  endDate: "",
  location: "",
  venue: "",
  price: "0",
  salePrice: "",
  quota: "",
  coverUrl: "",
  speakerName: "",
  speakerBio: "",
  isFeatured: false,
};

// ─── Conversions ──────────────────────────────────────────────────────────────

/** ISO-8601 → `datetime-local` in the operator's own timezone. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * `datetime-local` → ISO-8601 with timezone. Returns `null` for an unparseable
 * value; `z.string().datetime()` rejects the bare local form outright, so the
 * conversion is mandatory rather than cosmetic.
 */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Prefill the edit form from a persisted row. */
export function eventRecordToValues(record: EventRecord): EventFormValues {
  return {
    slug: record.slug,
    title: record.title,
    description: record.description ?? "",
    type: record.type,
    status: record.status,
    startDate: isoToLocalInput(record.startDate),
    endDate: isoToLocalInput(record.endDate),
    location: record.location ?? "",
    venue: record.venue ?? "",
    // Prisma `Decimal` arrives as a decimal string ("150000" / "150000.00").
    price: String(Number(record.price)),
    salePrice: record.salePrice === null ? "" : String(Number(record.salePrice)),
    quota: record.quota === null ? "" : String(record.quota),
    coverUrl: record.coverUrl ?? "",
    speakerName: record.speakerName ?? "",
    speakerBio: record.speakerBio ?? "",
    isFeatured: record.isFeatured,
  };
}

/**
 * Client-side pre-flight for the three cases the browser cannot express as a
 * native constraint. Everything else is left to the server so the form can
 * never disagree with `eventSchema`; the 400 body is rendered verbatim.
 */
export function validateEventValues(values: EventFormValues): string | null {
  if (localInputToIso(values.startDate) === null) return "Waktu mulai wajib diisi.";
  if (values.endDate && localInputToIso(values.endDate) === null) return "Waktu selesai tidak valid.";
  const price = Number(values.price);
  if (values.price.trim() === "" || Number.isNaN(price) || price < 0) {
    return "Harga wajib diisi dengan angka 0 atau lebih.";
  }
  if (values.salePrice.trim() !== "" && Number.isNaN(Number(values.salePrice))) {
    return "Harga promo harus berupa angka.";
  }
  if (values.quota.trim() !== "" && !Number.isInteger(Number(values.quota))) {
    return "Kuota harus berupa bilangan bulat.";
  }
  return null;
}

/**
 * Build the `POST` body. Optional keys are omitted when blank: `coverUrl` is
 * `z.string().url()` and the numeric/date fields are `z.number()`/`datetime()`,
 * so sending `""` would 400 instead of meaning "not set".
 */
export function valuesToCreateInput(values: EventFormValues): AdminEventInput {
  const input: AdminEventInput = {
    slug: values.slug.trim(),
    title: values.title.trim(),
    type: values.type,
    status: values.status,
    startDate: localInputToIso(values.startDate) ?? "",
    price: Number(values.price),
    isFeatured: values.isFeatured,
  };

  const endDate = localInputToIso(values.endDate);
  if (endDate) input.endDate = endDate;
  if (values.description.trim()) input.description = values.description;
  if (values.location.trim()) input.location = values.location;
  if (values.venue.trim()) input.venue = values.venue;
  if (values.salePrice.trim()) input.salePrice = Number(values.salePrice);
  if (values.quota.trim()) input.quota = Number(values.quota);
  if (values.coverUrl.trim()) input.coverUrl = values.coverUrl.trim();
  if (values.speakerName.trim()) input.speakerName = values.speakerName;
  if (values.speakerBio.trim()) input.speakerBio = values.speakerBio;

  return input;
}

/**
 * Build the `PATCH` body as a diff against the loaded row.
 *
 * WHY A DIFF: `eventSchema.partial()` leaves unsent keys untouched, which is the
 * only way to (a) keep a legacy `status` such as `ongoing` — a value the enum
 * would reject if echoed back — and (b) avoid rewriting `startDate` through a
 * timezone round-trip on an edit that never touched it.
 *
 * Blank-out is intentionally NOT emitted for `endDate`/`salePrice`/`quota`/
 * `coverUrl`: the API accepts no null for them, so the form says so instead of
 * pretending the clear worked.
 */
export function valuesToPatch(values: EventFormValues, initial: EventFormValues): AdminEventPatch {
  const patch: AdminEventPatch = {};
  const changed = (key: keyof EventFormValues) => values[key] !== initial[key];

  if (changed("slug")) patch.slug = values.slug.trim();
  if (changed("title")) patch.title = values.title.trim();
  // Plain optional strings accept "", so clearing these really does clear them.
  if (changed("description")) patch.description = values.description;
  if (changed("location")) patch.location = values.location;
  if (changed("venue")) patch.venue = values.venue;
  if (changed("speakerName")) patch.speakerName = values.speakerName;
  if (changed("speakerBio")) patch.speakerBio = values.speakerBio;
  if (changed("type")) patch.type = values.type;
  if (changed("status")) patch.status = values.status;
  if (changed("isFeatured")) patch.isFeatured = values.isFeatured;
  if (changed("price")) patch.price = Number(values.price);

  if (changed("startDate")) {
    const iso = localInputToIso(values.startDate);
    if (iso) patch.startDate = iso;
  }
  if (changed("endDate")) {
    const iso = localInputToIso(values.endDate);
    if (iso) patch.endDate = iso;
  }
  if (changed("salePrice") && values.salePrice.trim()) patch.salePrice = Number(values.salePrice);
  if (changed("quota") && values.quota.trim()) patch.quota = Number(values.quota);
  if (changed("coverUrl") && values.coverUrl.trim()) patch.coverUrl = values.coverUrl.trim();

  return patch;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  initialValues: EventFormValues;
  submitLabel: string;
  submitting: boolean;
  /** Server or pre-flight message, rendered verbatim (incl. 400 field lists). */
  error: string | null;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
  /** Extra guidance rendered above the field set. */
  note?: ReactNode;
};

export function EventForm({
  initialValues,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
  note,
}: Props) {
  const [values, setValues] = useState<EventFormValues>(initialValues);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  // A row saved before the canonical enum existed (`ongoing`/`ended`) must stay
  // selectable-as-is, otherwise opening the form would silently offer to
  // downgrade it to "draft" (BL-60c: labels always come from event-labels).
  const legacyStatus = EVENT_STATUSES.includes(initialValues.status as (typeof EVENT_STATUSES)[number])
    ? null
    : initialValues.status;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-solid border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {note}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-base font-bold text-text-primary">Informasi Dasar</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Judul Event *"
            required
            minLength={3}
            maxLength={200}
            placeholder="Workshop Data Analytics"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <Input
            label="Slug *"
            required
            minLength={2}
            maxLength={100}
            placeholder="workshop-data-analytics"
            hint="Dipakai sebagai alamat halaman publik event."
            value={values.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </div>
        <Textarea
          label="Deskripsi"
          rows={5}
          placeholder="Ringkasan materi, agenda, dan target peserta."
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Tipe *" value={values.type} onChange={(e) => set("type", e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {getEventTypeLabel(t)}
              </option>
            ))}
          </Select>
          <Select
            label="Status *"
            value={values.status}
            onChange={(e) => set("status", e.target.value)}
            hint={
              legacyStatus
                ? "Status tersimpan bukan bagian dari daftar resmi; biarkan apa adanya bila belum ingin mengubahnya."
                : undefined
            }
          >
            {legacyStatus && (
              <option value={legacyStatus}>{getEventStatusLabel(legacyStatus)}</option>
            )}
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {getEventStatusLabel(s)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-base font-bold text-text-primary">Jadwal &amp; Lokasi</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Waktu Mulai *"
            required
            type="datetime-local"
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
          <Input
            label="Waktu Selesai"
            type="datetime-local"
            value={values.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Lokasi"
            placeholder="Jakarta Selatan / Zoom"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
          />
          <Input
            label="Venue"
            placeholder="Gedung Haluan Lt. 3"
            value={values.venue}
            onChange={(e) => set("venue", e.target.value)}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-base font-bold text-text-primary">Harga &amp; Kuota</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Harga (Rp) *"
            required
            type="number"
            min={0}
            step={1000}
            hint="Isi 0 untuk event gratis."
            value={values.price}
            onChange={(e) => set("price", e.target.value)}
          />
          <Input
            label="Harga Promo (Rp)"
            type="number"
            min={0}
            step={1000}
            placeholder="Tanpa promo"
            value={values.salePrice}
            onChange={(e) => set("salePrice", e.target.value)}
          />
          <Input
            label="Kuota Peserta"
            type="number"
            min={1}
            step={1}
            placeholder="Tanpa batas"
            value={values.quota}
            onChange={(e) => set("quota", e.target.value)}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-base font-bold text-text-primary">Pembicara &amp; Tampilan</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nama Pembicara"
            placeholder="Nama lengkap pembicara"
            value={values.speakerName}
            onChange={(e) => set("speakerName", e.target.value)}
          />
          <Input
            label="URL Sampul"
            type="url"
            placeholder="https://…"
            hint="Harus berupa URL lengkap (diawali http/https)."
            value={values.coverUrl}
            onChange={(e) => set("coverUrl", e.target.value)}
          />
        </div>
        <Textarea
          label="Bio Pembicara"
          rows={3}
          placeholder="Latar belakang singkat pembicara."
          value={values.speakerBio}
          onChange={(e) => set("speakerBio", e.target.value)}
        />
        <label className="flex items-center gap-3 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
            className="size-4 rounded-[4px] border border-solid border-border-strong accent-accent-cyan-strong"
          />
          Tampilkan sebagai event unggulan
        </label>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="cyan"
          size="sm"
          loading={submitting}
          leftIcon={<Check size={16} aria-hidden="true" />}
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
          leftIcon={<X size={16} aria-hidden="true" />}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
