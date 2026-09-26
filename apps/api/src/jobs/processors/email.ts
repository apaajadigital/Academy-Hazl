import {
  sendPaymentSuccess,
  sendPaymentPending,
  sendOrderInvoice,
  sendEventFullRefund,
  sendEventRegistrationConfirmed,
  sendPrivateClassWelcome,
} from "../../services/notification/emailService.js";
import { notifyPaymentSuccess } from "../../services/notification/whatsappService.js";
import type { EmailJob } from "../types.js";

/**
 * Private Class post-purchase onboarding welcome. Declared here (next to its
 * switch case) rather than in jobs/types.ts because it is only dispatched
 * inline from the webhook processor — the queued EmailJob union in types.ts is
 * left untouched so the queue payload contract does not widen.
 */
export type PrivateClassWelcomeJob = {
  type: "private-class-welcome";
  to: string;
  name: string;
  orderId: string;
  courseTitle: string;
  waGroupLink?: string | null;
  onboardingContact?: string | null;
  liveSchedule?: Date | null;
};

/** Send a transactional notification (email or WhatsApp). Leaf processor. */
export async function processEmail(job: EmailJob | PrivateClassWelcomeJob): Promise<void> {
  switch (job.type) {
    case "payment-success":
      await sendPaymentSuccess(job.to, job.name, job.orderId, job.courseName, job.amount);
      return;
    case "payment-pending":
      await sendPaymentPending(job.to, job.name, job.orderId, job.amount, job.paymentUrl);
      return;
    case "order-invoice":
      await sendOrderInvoice(job.to, job.name, job.orderId);
      return;
    case "wa-payment-success":
      await notifyPaymentSuccess(job.phone, job.name, job.courseName);
      return;
    case "event-full-refund":
      await sendEventFullRefund(job.to, job.name, job.orderId, job.eventName);
      return;
    case "event-registration-confirmed":
      // BL-63: confirmation + e-ticket for every successful registration path.
      await sendEventRegistrationConfirmed(job.to, {
        name: job.name,
        eventTitle: job.eventTitle,
        ticketCode: job.ticketCode,
        startDate: job.startDate,
        location: job.location,
        venue: job.venue,
        eventType: job.eventType,
        orderId: job.orderId,
      });
      return;
    case "private-class-welcome":
      await sendPrivateClassWelcome(job.to, {
        name: job.name,
        courseTitle: job.courseTitle,
        waGroupLink: job.waGroupLink,
        onboardingContact: job.onboardingContact,
        liveSchedule: job.liveSchedule,
        orderId: job.orderId,
      });
      return;
  }
}
