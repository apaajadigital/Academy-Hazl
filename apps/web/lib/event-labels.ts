/**
 * @file lib/event-labels.ts
 * @description Single source of truth for Event type & status labels (BL-60c).
 *
 * WHY: the admin page shipped its own enum (`seminar | webinar | workshop |
 * bootcamp`) that no API response can ever produce, so every badge silently
 * fell through to the raw DB string. The authoritative value sets live in
 * `apps/api/prisma/schema.prisma` (model Event) and are enforced by
 * `eventSchema` in `apps/api/src/routes/events.ts`:
 *   - type   → online | offline | hybrid
 *   - status → draft | published | cancelled
 * Every surface that renders an event type/status must read from this module
 * so the two can never drift apart again.
 */

// ─── Type ─────────────────────────────────────────────────────────────────────

export const EVENT_TYPES = ["online", "offline", "hybrid"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  online: "Online",
  offline: "Offline",
  hybrid: "Hybrid",
};

// ─── Status ───────────────────────────────────────────────────────────────────

/** Canonical statuses accepted by the API's `eventSchema`. */
export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Aktif",
  cancelled: "Dibatalkan",
};

/**
 * Lifecycle statuses the admin panel has historically written straight through
 * `PATCH /api/admin/events/:id` (that route does not validate against
 * `eventSchema`). They are not part of the canonical set, but rows carrying
 * them may already exist — keep labels here so such rows never render raw.
 */
export const EVENT_STATUS_LABEL_LEGACY: Record<string, string> = {
  ongoing: "Berlangsung",
  ended: "Selesai",
};

// ─── Safe accessors ───────────────────────────────────────────────────────────

/**
 * Turn an unknown/free-form string into something presentable so the UI never
 * renders `undefined` when the backend introduces a value we do not know yet.
 */
function humanizeFallback(value: string | null | undefined, emptyLabel: string): string {
  const raw = value?.trim();
  if (!raw) return emptyLabel;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function isEventType(value: string | null | undefined): value is EventType {
  return EVENT_TYPES.includes(value as EventType);
}

export function isEventStatus(value: string | null | undefined): value is EventStatus {
  return EVENT_STATUSES.includes(value as EventStatus);
}

/** Human label for an `Event.type`, with a safe fallback for unknown values. */
export function getEventTypeLabel(type: string | null | undefined): string {
  if (isEventType(type)) return EVENT_TYPE_LABEL[type];
  return humanizeFallback(type, "Lainnya");
}

/** Human label for an `Event.status`, with a safe fallback for unknown values. */
export function getEventStatusLabel(status: string | null | undefined): string {
  if (isEventStatus(status)) return EVENT_STATUS_LABEL[status];
  const raw = status?.trim();
  const legacy = raw ? EVENT_STATUS_LABEL_LEGACY[raw] : undefined;
  if (legacy) return legacy;
  return humanizeFallback(status, "Tidak diketahui");
}
