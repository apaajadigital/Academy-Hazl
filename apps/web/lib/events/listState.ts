import type { EventApiResult, EventSummary } from "@/lib/api/events";

/**
 * Turns an event-list API result into exactly one of three view states.
 *
 * WHY THIS EXISTS
 * The page used to collapse failure into emptiness:
 *
 *     const events = result.success ? result.data.events : [];
 *
 * so an API that was down rendered the same "no events scheduled yet" card as a
 * catalogue that genuinely had none. The visitor was told a calm, confident lie
 * about our schedule, and nobody could tell the two apart from the outside.
 * Splitting the states here keeps that distinction impossible to lose again,
 * and makes it unit-testable without rendering a server component.
 */

export type EventListState =
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "list"; events: EventSummary[]; total: number };

/**
 * Client-side mirror of the server contract in eventService.isEventEnded:
 *
 *     active / upcoming  ⇔  eventEnd  >  now
 *     ended              ⇔  eventEnd <=  now
 *
 * The API already filters these out. This is a deploy-window guard, following
 * the precedent set for free courses (BL-52): between shipping the API filter
 * and shipping this page, or against a cached response, a finished event must
 * never reappear as if it were still open. It must use the SAME comparison as
 * the server — `<=`, not `<` — or the two disagree at the boundary instant.
 */
export function isEventEndedClient(
  event: Pick<EventSummary, "startDate" | "endDate">,
  now: number = Date.now(),
): boolean {
  const end = event.endDate ?? event.startDate;
  return new Date(end).getTime() <= now;
}

export function resolveEventListState(
  result: EventApiResult<{ events: EventSummary[]; total: number }>,
  now: number = Date.now(),
): EventListState {
  // A failed call says nothing about how many events exist. Never guess.
  if (!result.success) return { kind: "error" };

  const upcoming = result.data.events.filter((e) => !isEventEndedClient(e, now));
  if (upcoming.length === 0) return { kind: "empty" };

  // `total` comes from the API's own count. When the guard above dropped rows
  // the API should not have sent, report what is actually shown rather than a
  // number the visitor cannot reconcile with the grid in front of them.
  const total = upcoming.length === result.data.events.length ? result.data.total : upcoming.length;
  return { kind: "list", events: upcoming, total };
}
