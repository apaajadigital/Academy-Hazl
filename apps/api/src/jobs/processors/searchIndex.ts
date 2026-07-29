import {
  indexCourse,
  deleteCourseFromIndex,
  indexEvent,
  deleteEventFromIndex,
  type IndexEventInput,
} from "../../services/search/meilisearch.js";
import { logger } from "../../lib/logger.js";
import type { SearchIndexJob } from "../types.js";

/** Keep the Meilisearch course index in sync with the DB. Leaf processor. */
export async function processSearchIndex(job: SearchIndexJob): Promise<void> {
  if (job.type === "index-course") {
    await indexCourse(job.course);
    return;
  }
  await deleteCourseFromIndex(job.courseId);
}

// ─── Events (BL-63) ───────────────────────────────────────────────────────────

export type EventSearchIndexJob =
  | { type: "index-event"; event: IndexEventInput }
  | { type: "delete-event"; eventId: string };

/** Leaf processor for the event index — same contract as `processSearchIndex`. */
export async function processEventSearchIndex(job: EventSearchIndexJob): Promise<void> {
  if (job.type === "index-event") {
    await indexEvent(job.event);
    return;
  }
  await deleteEventFromIndex(job.eventId);
}

/**
 * Best-effort runner. Mirrors the inline fallback of `dispatch()` in
 * jobs/queues.ts: an indexing failure is logged and swallowed so it can never
 * fail the admin write that triggered it.
 *
 * WHY inline instead of `enqueueSearchIndex()`: the shared BullMQ payload union
 * (`SearchIndexJob`) models course jobs only, and jobs/types.ts + jobs/queues.ts
 * are owned by a concurrent workstream. Routing event sync through this local
 * entry point keeps BL-63 self-contained; promoting it to the queue later is a
 * one-line change once the payload union grows an event variant.
 */
async function runBestEffort(job: EventSearchIndexJob): Promise<void> {
  try {
    await processEventSearchIndex(job);
  } catch (err) {
    logger.warn("event search index sync failed (best-effort)", { type: job.type, err: String(err) });
  }
}

/**
 * Reconcile one event with the search index.
 *
 * Only `published` events may exist in the index. A draft or cancelled event is
 * actively DELETED rather than merely skipped — otherwise an event that was
 * unpublished or cancelled after being indexed would keep showing up in global
 * search and sell tickets to something that no longer runs (BL-63).
 */
export async function syncEventSearchIndex(event: IndexEventInput): Promise<void> {
  const job: EventSearchIndexJob =
    event.status === "published" ? { type: "index-event", event } : { type: "delete-event", eventId: event.id };
  await runBestEffort(job);
}

/** Drop a hard-deleted event from the index. */
export async function removeEventFromSearchIndex(eventId: string): Promise<void> {
  await runBestEffort({ type: "delete-event", eventId });
}
