import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../../src/app.js";
import { AppError } from "../../../src/types/index.js";

/**
 * BL-78d regression: `PATCH /api/trainer/payouts/:payoutId` and
 * `PATCH /api/admin/payouts/trainer/:id` used to carry two independent copies of
 * the same decision flow (guarded update, 404, 409). Two copies means one can be
 * fixed and the other silently left behind — exactly how a payout could end up
 * processable twice through the admin queue after the trainer route was hardened.
 *
 * These tests mock the service module, so they fail if either route ever grows
 * its own `updateMany` again: the assertion is not "the response looks right"
 * but "the decision was delegated to the one shared implementation".
 */
const { processTrainerPayout } = vi.hoisted(() => ({ processTrainerPayout: vi.fn() }));

vi.mock("../../../src/services/payout/trainerPayoutService.js", () => ({
  // Re-exported as-is: routes/trainer.ts reads these at module load to build its
  // Zod schema, so they must be real numbers even in a mocked module. Adding a
  // constant to the service and using it in the route WILL break this suite at
  // import time until it is listed here — that is the cost of an explicit
  // factory, and the error names the missing export.
  MAX_PAYOUT_AMOUNT: 9_999_999_999.99,
  MIN_PAYOUT_AMOUNT: 10_000,
  TRAINER_REVENUE_SHARE: 0.7,
  trainerShareOf: vi.fn(),
  computeCourseNetRevenue: vi.fn(),
  computeTrainerAvailableBalance: vi.fn(),
  requestTrainerPayout: vi.fn(),
  processTrainerPayout,
}));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    // Left mocked so a route that goes back to writing the payout itself shows
    // up as a failed `not.toHaveBeenCalled()` instead of a crash.
    trainerPayout: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" },
);
const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const PROCESSED_PAYOUT = {
  id: "po-1",
  trainerId: "trainer-1",
  amount: 750000,
  status: "approved",
  note: "OK",
};

const TRAINER_SUMMARY = { id: "trainer-1", name: "Trainer Satu", email: "trainer@jago.id" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
});

describe("trainer payout decision is one shared service (BL-78d)", () => {
  it("PATCH /api/trainer/payouts/:payoutId delegates to processTrainerPayout", async () => {
    processTrainerPayout.mockResolvedValue(PROCESSED_PAYOUT);

    const res = await request(app)
      .patch("/api/trainer/payouts/po-1")
      .set(ADMIN_AUTH)
      .send({ status: "approved", note: "OK" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: "po-1", status: "approved" });
    expect(processTrainerPayout).toHaveBeenCalledTimes(1);
    expect(processTrainerPayout).toHaveBeenCalledWith({
      payoutId: "po-1",
      status: "approved",
      note: "OK",
      processedBy: "admin-1",
    });
    // The route holds no decision logic of its own.
    expect(prisma.trainerPayout.updateMany).not.toHaveBeenCalled();
  });

  it("PATCH /api/admin/payouts/trainer/:id delegates to the SAME service", async () => {
    processTrainerPayout.mockResolvedValue({ ...PROCESSED_PAYOUT, trainer: TRAINER_SUMMARY });

    const res = await request(app)
      .patch("/api/admin/payouts/trainer/po-1")
      .set(ADMIN_AUTH)
      .send({ status: "approved", note: "OK" });

    expect(res.status).toBe(200);
    expect(processTrainerPayout).toHaveBeenCalledTimes(1);
    // Only difference between the two callers: this response carries the trainer
    // relation, which is now an option on the shared service instead of a
    // duplicated query + duplicated guard.
    expect(processTrainerPayout).toHaveBeenCalledWith({
      payoutId: "po-1",
      status: "approved",
      note: "OK",
      processedBy: "admin-1",
      includeTrainer: true,
    });
    expect(res.body.data.trainer).toEqual(TRAINER_SUMMARY);
    expect(prisma.trainerPayout.updateMany).not.toHaveBeenCalled();
  });

  it("both endpoints surface the service's 409 for an already-processed payout", async () => {
    processTrainerPayout.mockRejectedValue(new AppError(409, "Payout sudah diproses."));

    const trainerRes = await request(app)
      .patch("/api/trainer/payouts/po-1")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });
    const adminRes = await request(app)
      .patch("/api/admin/payouts/trainer/po-1")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });

    expect(trainerRes.status).toBe(409);
    expect(adminRes.status).toBe(409);
    expect(trainerRes.body.error.message).toBe(adminRes.body.error.message);
  });

  it("both endpoints surface the service's 404 for a missing payout", async () => {
    processTrainerPayout.mockRejectedValue(new AppError(404, "Payout tidak ditemukan."));

    const trainerRes = await request(app)
      .patch("/api/trainer/payouts/missing")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });
    const adminRes = await request(app)
      .patch("/api/admin/payouts/trainer/missing")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });

    expect(trainerRes.status).toBe(404);
    expect(adminRes.status).toBe(404);
    expect(trainerRes.body.error.message).toBe(adminRes.body.error.message);
  });
});
