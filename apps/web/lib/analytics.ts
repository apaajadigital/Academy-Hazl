/**
 * Analytics taxonomy + dispatch (TASK-041). One consistent event vocabulary
 * fired to Google Analytics (gtag) and/or Mixpanel when configured. Safe no-op
 * on the server or when neither is loaded.
 */

export const AnalyticsEvent = {
  PAGE_VIEW: "page_view",
  SIGN_UP: "sign_up",
  LOGIN: "login",
  LEAD_SUBMIT: "lead_submit",
  CTA_CLICK: "cta_click",
  ENROLL: "enroll",
  CHECKOUT_START: "checkout_start",
  PURCHASE: "purchase",
  SUBSCRIBE: "subscribe",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type Gtag = (command: string, event: string, params?: Record<string, unknown>) => void;
type Mixpanel = { track: (event: string, props?: Record<string, unknown>) => void };

type AnalyticsWindow = Window & {
  gtag?: Gtag;
  mixpanel?: Mixpanel;
};

/** Fire a taxonomy event to every configured analytics sink. Never throws. */
export function track(event: AnalyticsEventName, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  try {
    if (typeof w.gtag === "function") w.gtag("event", event, props);
    if (w.mixpanel && typeof w.mixpanel.track === "function") w.mixpanel.track(event, props);
  } catch {
    // Analytics must never break the app.
  }
}
