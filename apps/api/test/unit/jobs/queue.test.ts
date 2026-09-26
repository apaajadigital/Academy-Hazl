import { describe, it, expect, vi, beforeEach } from "vitest";

// With REDIS_URL unset (test env), queues are null → enqueue runs processors
// INLINE. Mock the leaf services so the inline path is observable + side-effect free.
vi.mock("../../../src/services/notification/emailService.js", () => ({
  sendPaymentSuccess: vi.fn().mockResolvedValue(undefined),
  sendPaymentPending: vi.fn().mockResolvedValue(undefined),
  sendOrderInvoice: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/services/notification/whatsappService.js", () => ({
  notifyPaymentSuccess: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/services/search/meilisearch.js", () => ({
  indexCourse: vi.fn().mockResolvedValue(undefined),
  deleteCourseFromIndex: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/services/certificate/certificateService.js", () => ({
  issueCertificate: vi.fn().mockResolvedValue({ id: "cert-1" }),
}));

const email = await import("../../../src/services/notification/emailService.js");
const wa = await import("../../../src/services/notification/whatsappService.js");
const meili = await import("../../../src/services/search/meilisearch.js");
const cert = await import("../../../src/services/certificate/certificateService.js");
const { enqueueEmail, enqueueSearchIndex, enqueueCertificate } = await import("../../../src/jobs/queues.js");

describe("job queues — inline fallback (no Redis)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enqueueEmail runs the email processor inline", async () => {
    await enqueueEmail({ type: "payment-success", to: "a@b.c", name: "A", orderId: "o1", courseName: "C", amount: 1000 });
    expect(email.sendPaymentSuccess).toHaveBeenCalledWith("a@b.c", "A", "o1", "C", 1000);
  });

  it("routes wa-payment-success to the WhatsApp service", async () => {
    await enqueueEmail({ type: "wa-payment-success", phone: "628", name: "A", courseName: "C" });
    expect(wa.notifyPaymentSuccess).toHaveBeenCalledWith("628", "A", "C");
  });

  it("is best-effort: a failing send does not throw", async () => {
    vi.mocked(email.sendPaymentSuccess).mockRejectedValueOnce(new Error("smtp down"));
    await expect(
      enqueueEmail({ type: "payment-success", to: "a@b.c", name: "A", orderId: "o1", courseName: "C", amount: 1 }),
    ).resolves.toBeUndefined();
  });

  it("enqueueSearchIndex routes index/delete to meilisearch", async () => {
    await enqueueSearchIndex({ type: "index-course", course: { id: "c1" } as never });
    expect(meili.indexCourse).toHaveBeenCalled();
    await enqueueSearchIndex({ type: "delete-course", courseId: "c1" });
    expect(meili.deleteCourseFromIndex).toHaveBeenCalledWith("c1");
  });

  it("enqueueCertificate runs issueCertificate", async () => {
    await enqueueCertificate({ type: "issue", userId: "u1", courseId: "c1" });
    expect(cert.issueCertificate).toHaveBeenCalledWith("u1", "c1");
  });
});
