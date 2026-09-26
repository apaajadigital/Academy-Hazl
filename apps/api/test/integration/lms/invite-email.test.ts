/**
 * Regression suite for the delivery half of POST /api/lms/tenants/:tenantId/invites.
 *
 * The route used to write `lmsUserInvite` rows and import no mailer at all, so the
 * token never left the database and `/lms/invite/[token]` was a dead route while
 * the admin UI reported "Undangan terkirim". These tests pin the fix: one send per
 * created row, carrying the PERSISTED token; an honest emailed/emailFailed split in
 * the response; and no token ever echoed back to the caller.
 *
 * Row-creation behaviour itself is covered by `invites.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsUserInvite: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lmsTenant: {
      findUnique: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@test.com", name: "Admin", roles: ["student"] };
    next();
  }),
}));

// Stub only the invite template; the rest stay real (and no-op without an API key).
vi.mock("../../../src/services/notification/emailService.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/services/notification/emailService.js")>();
  return { ...actual, sendLmsInviteEmail: vi.fn().mockResolvedValue(undefined) };
});

const { prisma } = await import("../../../src/db/prisma.js");
const { sendLmsInviteEmail } = await import("../../../src/services/notification/emailService.js");

const TENANT_NAME = "PT Contoh Nusantara";

beforeEach(() => {
  vi.clearAllMocks();
  // `token` is a DB default, so the route must read it back off the create() result.
  vi.mocked(prisma.lmsUserInvite.create).mockImplementation((async (args: {
    data: { email: string };
  }) => ({ token: `token-for-${args.data.email}` })) as never);
  vi.mocked(prisma.lmsTenant.findUnique).mockResolvedValue({ name: TENANT_NAME } as never);
  // requireLmsAdmin resolves the caller's tenant role through this lookup.
  vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ role: "lms_admin" } as never);
  vi.mocked(sendLmsInviteEmail).mockResolvedValue(undefined);
});

describe("POST /api/lms/tenants/:tenantId/invites — invite delivery", () => {
  it("sends one invite email per created row, with the persisted token", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/invites")
      .send({ emails: ["a@test.com", "b@test.com"] });

    expect(res.status).toBe(201);
    expect(sendLmsInviteEmail).toHaveBeenCalledTimes(2);
    expect(sendLmsInviteEmail).toHaveBeenCalledWith("a@test.com", TENANT_NAME, "token-for-a@test.com");
    expect(sendLmsInviteEmail).toHaveBeenCalledWith("b@test.com", TENANT_NAME, "token-for-b@test.com");
    expect(res.body.data.emailed).toEqual(["a@test.com", "b@test.com"]);
    expect(res.body.data.emailFailed).toEqual([]);
  });

  it("selects the token explicitly so it is read from the persisted row", async () => {
    await request(app).post("/api/lms/tenants/tenant-1/invites").send({ email: "a@test.com" });

    expect(prisma.lmsUserInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ token: true }) }),
    );
  });

  it("reports a mailer failure in emailFailed without failing the request", async () => {
    vi.mocked(sendLmsInviteEmail)
      .mockRejectedValueOnce(new Error("resend down"))
      .mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/invites")
      .send({ emails: ["fail@test.com", "ok@test.com"] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // The row exists either way — a send failure must never demote it to "skipped",
    // which would hide a seat that was actually provisioned.
    expect(res.body.data.created).toEqual(["fail@test.com", "ok@test.com"]);
    expect(res.body.data.skipped).toEqual([]);
    expect(res.body.data.emailFailed).toEqual(["fail@test.com"]);
    expect(res.body.data.emailed).toEqual(["ok@test.com"]);
  });

  it("does not attempt a send for a row that failed to create", async () => {
    vi.mocked(prisma.lmsUserInvite.create).mockRejectedValueOnce(new Error("unique violation"));

    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/invites")
      .send({ emails: ["dupe@test.com"] });

    expect(res.status).toBe(201);
    expect(res.body.data.created).toEqual([]);
    expect(res.body.data.skipped).toEqual(["dupe@test.com"]);
    expect(res.body.data.emailed).toEqual([]);
    expect(res.body.data.emailFailed).toEqual([]);
    expect(sendLmsInviteEmail).not.toHaveBeenCalled();
  });

  it("never leaks the invite token in the response", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/invites")
      .send({ email: "a@test.com" });

    expect(JSON.stringify(res.body)).not.toContain("token-for-a@test.com");
  });

  it("degrades to a neutral tenant name when the lookup returns nothing", async () => {
    vi.mocked(prisma.lmsTenant.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/invites")
      .send({ email: "a@test.com" });

    expect(res.status).toBe(201);
    expect(sendLmsInviteEmail).toHaveBeenCalledWith("a@test.com", "Jago Akademi", expect.any(String));
  });

  it("degrades to a neutral tenant name when the lookup throws", async () => {
    vi.mocked(prisma.lmsTenant.findUnique).mockRejectedValue(new Error("db down"));

    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/invites")
      .send({ email: "a@test.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.emailed).toEqual(["a@test.com"]);
    expect(sendLmsInviteEmail).toHaveBeenCalledWith("a@test.com", "Jago Akademi", expect.any(String));
  });
});
