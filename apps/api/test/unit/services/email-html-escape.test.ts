/**
 * BL-91 — user-controlled values must not reach an email as live HTML.
 *
 * Every template in emailService builds HTML by string interpolation, and most
 * of the interpolated values are database columns a user (or a tenant admin)
 * typed. A display name of `<script>alert(1)</script>` used to be delivered as
 * markup, and the recipient is often NOT the person who supplied the value —
 * the payment-success mail carries the buyer's name, the LMS invite carries a
 * tenant name chosen by someone else.
 *
 * The templates are exercised through the real Resend boundary (mocked at the
 * SDK) rather than by asserting on a string builder, so the assertions pin what
 * actually leaves the process.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ id: "email-1" });

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("../../../src/config/env.js", () => ({
  env: {
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "no-reply@jagoakademi.com",
    EMAIL_FROM_NAME: "Jago Akademi",
    WEB_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}));

const {
  escapeHtml,
  sendPaymentSuccess,
  sendPaymentPending,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLmsInviteEmail,
  sendEventFullRefund,
  sendEventRegistrationConfirmed,
  sendPrivateClassWelcome,
  sendOrderInvoice,
} = await import("../../../src/services/notification/emailService.js");

/** The canonical payload from the bug report. */
const XSS = '<script>alert(1)</script>';
const ESCAPED_XSS = "&lt;script&gt;alert(1)&lt;/script&gt;";

/** The HTML body of the single email sent by the call under test. */
function sentHtml(): string {
  expect(sendMock).toHaveBeenCalledTimes(1);
  return sendMock.mock.calls[0][0].html as string;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("escapeHtml", () => {
  it("neutralises the script payload from the bug report", () => {
    expect(escapeHtml(XSS)).toBe(ESCAPED_XSS);
  });

  it("escapes every HTML metacharacter", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes the ampersand first so escapes are not double-escaped", () => {
    // A naive ordering turns `<` into `&lt;` and then that `&` into `&amp;lt;`,
    // which renders as the literal text `&lt;` instead of `<`.
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Budi Santoso")).toBe("Budi Santoso");
    expect(escapeHtml("")).toBe("");
  });

  it("renders null and undefined as an empty string, not 'null'", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("accepts numbers", () => {
    expect(escapeHtml(150000)).toBe("150000");
  });
});

describe("email templates escape user-controlled values", () => {
  it("sendPaymentSuccess escapes the recipient name and the course title", async () => {
    await sendPaymentSuccess("buyer@jago.id", XSS, "order-1", XSS, 299000);

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendPaymentPending escapes the recipient name", async () => {
    await sendPaymentPending("buyer@jago.id", XSS, "order-1", 299000, "https://pay.example/x");

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendVerificationEmail escapes the recipient name", async () => {
    await sendVerificationEmail("new@jago.id", XSS, "token-1");

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendPasswordResetEmail escapes the recipient name", async () => {
    await sendPasswordResetEmail("user@jago.id", XSS, "token-1");

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendLmsInviteEmail escapes the tenant name", async () => {
    // The highest-value case: the invitee never chose this tenant name, so the
    // value is attacker-controlled from the reader's point of view.
    await sendLmsInviteEmail("invitee@corp.id", XSS, "token-1");

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendEventFullRefund escapes the name and the event title", async () => {
    await sendEventFullRefund("buyer@jago.id", XSS, "order-1", XSS);

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendEventRegistrationConfirmed escapes the name, title, ticket code and venue", async () => {
    await sendEventRegistrationConfirmed("attendee@jago.id", {
      name: XSS,
      eventTitle: XSS,
      ticketCode: XSS,
      startDate: new Date("2026-09-01T09:00:00.000Z"),
      venue: XSS,
      location: XSS,
      eventType: "offline",
      orderId: "order-1",
    });

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendPrivateClassWelcome escapes the name and course title", async () => {
    await sendPrivateClassWelcome("buyer@jago.id", {
      name: XSS,
      courseTitle: XSS,
      waGroupLink: null,
      onboardingContact: null,
      liveSchedule: null,
      orderId: "order-1",
    });

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("sendOrderInvoice escapes the recipient name", async () => {
    await sendOrderInvoice("buyer@jago.id", XSS, "order-1");

    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain(ESCAPED_XSS);
  });

  it("closes the attribute-breakout vector in an href", async () => {
    // A WhatsApp group link is admin-authored and lands inside href="...".
    // Escaping only the angle brackets would still let a quote close the
    // attribute and inject an event handler.
    await sendPrivateClassWelcome("buyer@jago.id", {
      name: "Budi",
      courseTitle: "Private Class",
      waGroupLink: '" onmouseover="alert(1)',
      onboardingContact: null,
      liveSchedule: null,
      orderId: "order-1",
    });

    const html = sentHtml();
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toContain("&quot; onmouseover=&quot;alert(1)");
  });

  it("still renders a normal name as plain readable text", async () => {
    // Guard against over-escaping: the fix must not turn every email into
    // entity soup for the 99.99% of users with an ordinary name.
    await sendPaymentSuccess("buyer@jago.id", "Budi Santoso", "order-1", "Digital Marketing", 299000);

    const html = sentHtml();
    expect(html).toContain("<b>Budi Santoso</b>");
    expect(html).toContain("<b>Digital Marketing</b>");
    expect(html).not.toContain("&amp;");
  });

  it("keeps the subject line as plain text, not entities", async () => {
    // Subjects are a header, not markup — escaping there would show the reader
    // a literal `&amp;` while protecting nothing.
    await sendPaymentSuccess("buyer@jago.id", "Budi", "order-1", "Desain & Branding", 299000);

    expect(sendMock.mock.calls[0][0].subject).toBe("Pembayaran Berhasil — Desain & Branding");
  });
});
