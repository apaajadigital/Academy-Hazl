import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * BL-168 — regression test for a one-word bug that took the API process down.
 *
 * `requireLmsAdmin` is not used as Express middleware. Every LMS route awaits it
 * and hands it an ASYNC callback:
 *
 *     await requireLmsAdmin(req, res, async () => { ...handler... });
 *
 * so whether the callback's promise is adopted decides whether the route's
 * try/catch can ever see a throw from inside it. The super-admin branch did
 * `return next()` and was fine. The tenant-admin branch did a bare `next()`,
 * which drops the promise on the floor: `requireLmsAdmin` resolves immediately,
 * the route's `await` completes, the try/catch exits, and the handler's
 * AppError rejects afterwards with nobody listening.
 *
 * That is an unhandled rejection, and apps/api registers no
 * `unhandledRejection` handler anywhere. Production runs Node v22, where the
 * default is `--unhandled-rejections=throw`: the process dies. Docker restarts
 * it, so the symptom is a brief sitewide blip with nothing in the API log
 * pointing at a cause.
 *
 * Reachable with no attacker: a tenant `lms_admin` mistyping a batch id is
 * enough. The same shape sits behind course and lesson ids and the report
 * export, so it is not one endpoint.
 *
 * The assertion that matters is `expect(res.status).toBe(404)`. Before the fix
 * this test does not fail with a wrong status — it never gets a response at all
 * and times out, which is exactly what the bug does to a real caller.
 */

const authState = vi.hoisted(() => ({ id: "admin-1", roles: ["lms_admin"] as string[] }));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsBatch: { findFirst: vi.fn(), update: vi.fn() },
    lmsBatchMember: { findMany: vi.fn() },
    userRole: { findFirst: vi.fn() },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: authState.id, email: "admin@tenant-a.test", name: "Admin", roles: authState.roles };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const mock = prisma as unknown as {
  lmsBatch: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  lmsBatchMember: { findMany: ReturnType<typeof vi.fn> };
  userRole: { findFirst: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  authState.roles = ["lms_admin"];
  // The caller genuinely administers tenant-a, so requireLmsAdmin lets them
  // through. This is an ordinary authorised user, not an intruder.
  mock.userRole.findFirst.mockResolvedValue({ id: "role-1", userId: "admin-1", role: "lms_admin", tenantId: "tenant-a" });
  // The batch they name does not exist in their tenant — a typo, or a batch
  // someone else already deleted.
  mock.lmsBatch.findFirst.mockResolvedValue(null);
});

describe("BL-168 — a tenant lms_admin hitting a missing nested resource", () => {
  it("answers 404 instead of hanging and killing the process", async () => {
    const res = await request(app)
      .patch("/api/lms/tenants/tenant-a/batches/does-not-exist")
      .send({ name: "Batch Baru" });

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe("NOT_FOUND");
  });

  it("answers 404 on the member roster route too, and never reads the roster", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches/does-not-exist/members");

    expect(res.status).toBe(404);
    // Status alone would not prove the guard stopped the handler: a 404 body
    // with the roster already fetched is a different, quieter bug.
    expect(mock.lmsBatchMember.findMany).not.toHaveBeenCalled();
  });

  it("still works for super_admin, whose branch was never broken", async () => {
    // Pinning the branch that already had `return next()`, so a future tidy-up
    // that "makes both branches consistent" cannot regress this one instead.
    authState.roles = ["super_admin"];

    const res = await request(app)
      .patch("/api/lms/tenants/tenant-a/batches/does-not-exist")
      .send({ name: "Batch Baru" });

    expect(res.status).toBe(404);
  });
});
