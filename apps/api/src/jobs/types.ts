import type { indexCourse } from "../services/search/meilisearch.js";

/** Canonical queue names (TASK-022, SSOT §3.8). */
export const QUEUE = {
  EMAIL: "email",
  CERTIFICATE: "certificate",
  SEARCH_INDEX: "search-index",
  WEBHOOK: "webhook",
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

/** Transactional notification jobs (email + WhatsApp), all retryable. */
export type EmailJob =
  | { type: "payment-success"; to: string; name: string; orderId: string; courseName: string; amount: number }
  | { type: "payment-pending"; to: string; name: string; orderId: string; amount: number; paymentUrl: string }
  | { type: "order-invoice"; to: string; name: string; orderId: string }
  | { type: "wa-payment-success"; phone: string; name: string; courseName: string }
  // Batch8 D2: event was full at fulfillment — the payment is auto-refunded and
  // the buyer is notified instead of being oversold a seat.
  | { type: "event-full-refund"; to: string; name: string; orderId: string; eventName: string }
  // BL-63: successful event registration → confirmation + e-ticket. `startDate`
  // is widened to string because Date is serialized to ISO by the queue payload.
  | {
      type: "event-registration-confirmed";
      to: string;
      name: string;
      eventTitle: string;
      ticketCode: string;
      startDate?: Date | string | null;
      location?: string | null;
      venue?: string | null;
      eventType?: string | null;
      orderId?: string | null;
    };

export type CertificateJob = { type: "issue"; userId: string; courseId: string };

// Reuse the exact shape indexCourse expects so the queue payload never drifts.
export type IndexCourseInput = Parameters<typeof indexCourse>[0];

export type SearchIndexJob =
  | { type: "index-course"; course: IndexCourseInput }
  | { type: "delete-course"; courseId: string };

/**
 * DOKU payment fulfillment; processed idempotently (skip already-paid orders).
 *
 * BL-139: `amount` is the value DOKU says it actually settled, carried through
 * from the notification so the processor can re-check it against the order
 * inside the fulfillment transaction. It is optional and nullable on purpose:
 * FAILED/EXPIRED notifications move no money and need not state an amount, and
 * a job enqueued by a pre-BL-139 deploy must still be processable after a
 * rolling restart rather than crashing the worker.
 */
export type WebhookJob = {
  invoiceNumber: string;
  txStatus: string;
  channelId?: string;
  amount?: number | null;
};
