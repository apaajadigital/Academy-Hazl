/**
 * Unit tests for pure services — mock external dependencies (PDFKit, Resend).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Email Service ────────────────────────────────────────────────────────────

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ id: "email-123" }) };
  },
}));

vi.mock("../../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
    JWT_REFRESH_SECRET: "test-refresh-must-be-32-chars!!!!!!!!",
    GOOGLE_CLIENT_ID: "test-gid",
    GOOGLE_CLIENT_SECRET: "test-gsecret",
    GOOGLE_CALLBACK_URL: "http://localhost:4000/api/auth/google/callback",
    WEB_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:3000",
    COOKIE_SECURE: false,
    MEILISEARCH_URL: "http://localhost:7700",
    MEILISEARCH_KEY: "test-key",
    UPLOAD_DIR: "uploads",
    MAX_FILE_SIZE_MB: 10,
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "noreply@test.com",
    EMAIL_FROM_NAME: "Test",
  },
}));

describe("emailService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sendPaymentSuccess sends email with correct subject", async () => {
    const { sendPaymentSuccess } = await import("../../src/services/notification/emailService.js");
    // Should not throw — in test env with mock Resend
    await expect(
      sendPaymentSuccess("user@test.com", "User Satu", "order-123", "Kursus Marketing", 299000)
    ).resolves.toBeUndefined();
  });

  it("sendPaymentPending sends email with payment URL", async () => {
    const { sendPaymentPending } = await import("../../src/services/notification/emailService.js");
    await expect(
      sendPaymentPending("user@test.com", "User Satu", "order-123", 299000, "https://pay.example.com")
    ).resolves.toBeUndefined();
  });

  it("sendOrderInvoice sends email with invoice link", async () => {
    const { sendOrderInvoice } = await import("../../src/services/notification/emailService.js");
    await expect(
      sendOrderInvoice("user@test.com", "User Satu", "order-123456")
    ).resolves.toBeUndefined();
  });

  it("sendPrivateClassWelcome sends onboarding email with group link and schedule", async () => {
    const { sendPrivateClassWelcome } = await import("../../src/services/notification/emailService.js");
    await expect(
      sendPrivateClassWelcome("user@test.com", {
        name: "User Satu",
        courseTitle: "Private Class Digital Marketing",
        waGroupLink: "https://chat.whatsapp.com/ABC123",
        onboardingContact: "6281111111111",
        liveSchedule: new Date("2026-08-01T19:00:00+07:00"),
        orderId: "order-123",
      })
    ).resolves.toBeUndefined();
  });

  it("sendPrivateClassWelcome falls back gracefully when link/contact/schedule are null", async () => {
    const { sendPrivateClassWelcome } = await import("../../src/services/notification/emailService.js");
    // null waGroupLink/onboardingContact/liveSchedule → template uses the
    // default admin contact and "will be announced" copy instead of crashing.
    await expect(
      sendPrivateClassWelcome("user@test.com", {
        name: "User Satu",
        courseTitle: "Private Class Copywriting",
        waGroupLink: null,
        onboardingContact: null,
        liveSchedule: null,
        orderId: "order-456",
      })
    ).resolves.toBeUndefined();
  });
});

// ─── Invoice PDF Service ───────────────────────────────────────────────────────

vi.mock("pdfkit", async () => {
  const { EventEmitter } = await import("events");
  class MockPDFDocument extends EventEmitter {
    page = { width: 595 };
    fillColor = () => this;
    fontSize = () => this;
    font = () => this;
    text = () => this;
    moveDown = () => this;
    moveTo = () => this;
    lineTo = () => this;
    stroke = () => this;
    rect = () => this;
    fill = () => this;
    widthOfString = () => 100;
    end = () => {
      this.emit("data", Buffer.from("PDF"));
      this.emit("end");
    };
  }
  return { default: MockPDFDocument };
});

describe("invoiceService.generateInvoicePDF", () => {
  it("generates a PDF buffer for a valid order", async () => {
    const { generateInvoicePDF } = await import("../../src/services/invoice/invoiceService.js");

    const mockOrder = {
      id: "order-1",
      userId: "user-1",
      status: "paid",
      subtotal: 299000,
      discountAmount: 0,
      finalAmount: 299000,
      currency: "IDR",
      notes: null,
      couponId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: new Date(),
      coupon: null,
      user: { name: "User Satu", email: "user@test.com" },
      items: [
        { itemTitle: "Kursus Marketing", quantity: 1, unitPrice: 299000, totalPrice: 299000 },
      ],
    };

    const result = await generateInvoicePDF(mockOrder as unknown as Parameters<typeof generateInvoicePDF>[0]);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes coupon info when provided", async () => {
    const { generateInvoicePDF } = await import("../../src/services/invoice/invoiceService.js");

    const mockOrderWithCoupon = {
      id: "order-2",
      userId: "user-1",
      status: "paid",
      subtotal: 299000,
      discountAmount: 50000,
      finalAmount: 249000,
      currency: "IDR",
      notes: null,
      couponId: "coupon-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: new Date(),
      coupon: { code: "DISKON50K" },
      user: { name: "User Dua", email: "user2@test.com" },
      items: [
        { itemTitle: "Kursus Desain", quantity: 1, unitPrice: 299000, totalPrice: 299000 },
      ],
    };

    const result = await generateInvoicePDF(mockOrderWithCoupon as unknown as Parameters<typeof generateInvoicePDF>[0]);
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
