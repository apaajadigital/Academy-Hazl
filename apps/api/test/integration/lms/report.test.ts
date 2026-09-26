import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

// Roles are mutable so a single file can cover the super-admin path, the
// per-tenant lms_admin path and the "administers a different tenant" 403.
const authState = vi.hoisted(() => ({ id: "admin-1", roles: ["super_admin"] as string[] }));

// Every line the PDF route renders, captured by the pdfkit stand-in below. The
// PDF path is otherwise unassertable: its body is a binary stream, so without
// this the only thing a test could check is the status code — which would stay
// 200 even if the report listed another tenant's employees.
const pdfState = vi.hoisted(() => ({ lines: [] as string[] }));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsEnrollment: {
      findMany: vi.fn(),
    },
    lmsLesson: {
      groupBy: vi.fn(),
    },
    lmsBatchMember: {
      findMany: vi.fn(),
    },
    // BL-169: the handler now resolves batchId through assertBatchInTenant, so
    // this model is reached where it previously was not.
    lmsBatch: {
      findFirst: vi.fn(),
    },
    lmsTenant: {
      findUnique: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: authState.id, email: "admin@test.com", name: "Admin", roles: authState.roles };
    next();
  }),
}));

// A PassThrough is a drop-in for `doc.pipe(res)` + `doc.end()`, so the route
// really streams a response instead of hanging the request. Rendering a real PDF
// here would only add a binary blob nothing can assert against.
vi.mock("pdfkit", async () => {
  const { PassThrough } = await import("node:stream");
  class MockPDFDocument extends PassThrough {
    fontSize(): MockPDFDocument {
      return this;
    }
    moveDown(): MockPDFDocument {
      return this;
    }
    text(value: string): MockPDFDocument {
      pdfState.lines.push(String(value));
      this.write(`${String(value)}\n`);
      return this;
    }
  }
  return { default: MockPDFDocument };
});

const { prisma } = await import("../../../src/db/prisma.js");

// ─── Two-tenant fixture ───────────────────────────────────────────────────────
// The whole point of these tests is that a caller scoped to tenant-a can never
// see tenant-b. That only holds if the fixture actually CONTAINS tenant-b rows —
// a single-tenant `mockResolvedValue` would return the same array whether or not
// the handler passed `tenantId`, so it can never fail on a missing scope.

const DAY = 24 * 60 * 60 * 1000;
// Relative, never a date literal: a hardcoded date measured against "now" is
// exactly what turned main red on 10 Sep 2026 (BL-166). These stay correct
// whenever the suite runs.
const enrolledAt = new Date(Date.now() - 30 * DAY);
const completedAt = new Date(Date.now() - 2 * DAY);
const certIssuedAt = new Date(Date.now() - 1 * DAY);

type EnrollmentRow = {
  tenantId: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  completedAt: Date | null;
  user: { id: string; name: string; email: string };
  course: { id: string; title: string };
  progress: { lessonId: string }[];
  certificate: { issuedAt: Date } | null;
};

const ENROLLMENTS: EnrollmentRow[] = [
  {
    tenantId: "tenant-a",
    userId: "user-alice",
    courseId: "course-a1",
    enrolledAt,
    completedAt: null,
    user: { id: "user-alice", name: "Alice", email: "alice@tenant-a.test" },
    course: { id: "course-a1", title: "Onboarding Tenant A" },
    progress: [{ lessonId: "lesson-a1-1" }],
    certificate: null,
  },
  {
    tenantId: "tenant-a",
    userId: "user-bob",
    courseId: "course-a1",
    enrolledAt,
    completedAt,
    user: { id: "user-bob", name: "Bob", email: "bob@tenant-a.test" },
    course: { id: "course-a1", title: "Onboarding Tenant A" },
    progress: [{ lessonId: "lesson-a1-1" }, { lessonId: "lesson-a1-2" }],
    certificate: { issuedAt: certIssuedAt },
  },
  {
    tenantId: "tenant-a",
    userId: "user-cara",
    courseId: "course-a2",
    enrolledAt,
    completedAt: null,
    user: { id: "user-cara", name: "Cara", email: "cara@tenant-a.test" },
    course: { id: "course-a2", title: "Keamanan Data" },
    progress: [],
    certificate: null,
  },
  {
    tenantId: "tenant-b",
    userId: "user-dave",
    courseId: "course-b1",
    enrolledAt,
    completedAt,
    user: { id: "user-dave", name: "Dave", email: "dave@tenant-b.test" },
    course: { id: "course-b1", title: "Rahasia Tenant B" },
    progress: [{ lessonId: "lesson-b1-1" }],
    certificate: { issuedAt: certIssuedAt },
  },
];

// `course-a2` is deliberately absent: Prisma's groupBy emits no row for a course
// that has no lessons, which is the `?? 0` fallback in the handler and the
// difference between reporting 0% and rendering `NaN%` to an HR manager.
const LESSONS_PER_COURSE = [
  { courseId: "course-a1", tenantId: "tenant-a", count: 2 },
  { courseId: "course-b1", tenantId: "tenant-b", count: 4 },
];

const BATCH_MEMBERS = [
  { batchId: "batch-a1", userId: "user-alice" },
  // A batch that belongs to tenant-b. See the cross-tenant batchId test below.
  // `user-bob` is a tenant-A user on purpose: that overlap IS the oracle BL-169
  // closed. Before the fix, asking for batch-b1 filtered tenant-A's own rows down
  // to exactly the people who were also in tenant-B's batch.
  { batchId: "batch-b1", userId: "user-bob" },
];

// BL-169: the batch rows themselves, so `assertBatchInTenant` has something to
// resolve. batch-b1 exists but belongs to tenant-b — which is what makes the
// cross-tenant request a 404 rather than an empty result.
const BATCHES = [
  { id: "batch-a1", tenantId: "tenant-a", name: "Batch A1" },
  { id: "batch-b1", tenantId: "tenant-b", name: "Batch B1" },
];

const TENANTS = [
  { id: "tenant-a", name: "PT Tenant A", slug: "tenant-a-slug" },
  { id: "tenant-b", name: "PT Tenant B", slug: "tenant-b-slug" },
];

type EnrollmentArgs = { where?: { tenantId?: string; courseId?: string } };
type GroupByArgs = { where?: { course?: { tenantId?: string } } };
type BatchMemberArgs = { where?: { batchId?: string } };
type BatchArgs = { where?: { id?: string; tenantId?: string } };
type TenantArgs = { where?: { id?: string } };

beforeEach(() => {
  vi.clearAllMocks();
  authState.id = "admin-1";
  authState.roles = ["super_admin"];
  pdfState.lines = [];

  // Each mock FILTERS the fixture the way Postgres would, so an unscoped query
  // yields foreign rows and the content assertions fail.
  vi.mocked(prisma.lmsEnrollment.findMany).mockImplementation((((args: EnrollmentArgs) =>
    Promise.resolve(
      ENROLLMENTS.filter(
        (e) =>
          (args.where?.tenantId === undefined || e.tenantId === args.where.tenantId) &&
          (args.where?.courseId === undefined || e.courseId === args.where.courseId),
      ),
    )) as unknown) as never);

  vi.mocked(prisma.lmsLesson.groupBy).mockImplementation((((args: GroupByArgs) =>
    Promise.resolve(
      LESSONS_PER_COURSE.filter(
        (c) => args.where?.course?.tenantId === undefined || c.tenantId === args.where.course.tenantId,
      ).map((c) => ({ courseId: c.courseId, _count: { id: c.count } })),
    )) as unknown) as never);

  vi.mocked(prisma.lmsBatchMember.findMany).mockImplementation((((args: BatchMemberArgs) =>
    Promise.resolve(
      BATCH_MEMBERS.filter((m) => m.batchId === args.where?.batchId).map((m) => ({ userId: m.userId })),
    )) as unknown) as never);

  // BL-169: filters on BOTH id and tenantId, like the real query. A mock that
  // matched on id alone would return tenant-b's batch to a tenant-a caller and
  // the fix would look like it worked while the hole stayed open.
  vi.mocked(prisma.lmsBatch.findFirst).mockImplementation((((args: BatchArgs) =>
    Promise.resolve(
      BATCHES.find((b) => b.id === args.where?.id && b.tenantId === args.where?.tenantId) ?? null,
    )) as unknown) as never);

  vi.mocked(prisma.lmsTenant.findUnique).mockImplementation((((args: TenantArgs) =>
    Promise.resolve(TENANTS.find((t) => t.id === args.where?.id) ?? null)) as unknown) as never);

  vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
});

// ─── GET /reports/completion ──────────────────────────────────────────────────

describe("GET /api/lms/tenants/:tenantId/reports/completion", () => {
  it("returns only the addressed tenant's enrollments", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // tenant-b's Dave and the course title "Rahasia Tenant B" must not leak.
    expect(res.body.data.map((r: { userId: string }) => r.userId)).toEqual([
      "user-alice",
      "user-bob",
      "user-cara",
    ]);
  });

  it("scopes both the enrollment query and the lesson-count query to the tenant", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    // Exact `where` (not objectContaining) so an extra or missing scope is caught.
    expect(prisma.lmsEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } }),
    );
    // The lesson counter joins through the course; without `course.tenantId` a
    // tenant would be scored against another tenant's lesson totals.
    expect(prisma.lmsLesson.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { course: { tenantId: "tenant-a" } } }),
    );
  });

  it("computes completion percentage from the tenant's own lesson totals", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    const alice = res.body.data.find((r: { userId: string }) => r.userId === "user-alice");
    expect(alice).toMatchObject({
      userName: "Alice",
      userEmail: "alice@tenant-a.test",
      courseTitle: "Onboarding Tenant A",
      totalLessons: 2,
      completedLessons: 1,
      completionPct: 50,
      isCompleted: false,
      completedAt: null,
      certificateIssuedAt: null,
    });
    expect(alice.enrolledAt).toBe(enrolledAt.toISOString());
  });

  it("reports 0% instead of NaN for a course with no lessons", async () => {
    // Divide-by-zero here would render "NaN%" in the HR dashboard rather than a
    // course that simply has no content yet.
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    const cara = res.body.data.find((r: { userId: string }) => r.userId === "user-cara");
    expect(cara.totalLessons).toBe(0);
    expect(cara.completionPct).toBe(0);
  });

  it("surfaces completion and certificate issuance for a finished enrollment", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    const bob = res.body.data.find((r: { userId: string }) => r.userId === "user-bob");
    expect(bob.completionPct).toBe(100);
    expect(bob.isCompleted).toBe(true);
    expect(bob.completedAt).toBe(completedAt.toISOString());
    expect(bob.certificateIssuedAt).toBe(certIssuedAt.toISOString());
  });

  it("narrows to one course when courseId is supplied, keeping the tenant scope", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion?courseId=course-a2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].courseId).toBe("course-a2");
    // courseId is an ADDITIONAL filter — it must never replace the tenant scope,
    // or a tenant-a admin could pass `?courseId=course-b1` and read tenant-b.
    expect(prisma.lmsEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a", courseId: "course-a2" } }),
    );
  });

  it("returns nothing when courseId names a course in another tenant", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion?courseId=course-b1");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("filters rows to batch members when batchId is supplied", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion?batchId=batch-a1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].userId).toBe("user-alice");
  });

  // BL-169 — was a characterisation test for a known gap; now it asserts the fix.
  //
  // The leak was never a foreign ROW: the enrollment query has always been
  // tenant-scoped, so the response only ever held tenant-a's own people. What
  // leaked was the FILTER. Passing tenant-b's batchId let a tenant-a admin learn
  // which of their OWN users also sat in that foreign batch — an intersection
  // oracle over lmsBatchMember, invisible in the response body, which is exactly
  // why it survived review: every row on screen genuinely belonged to the caller.
  //
  // The batch must now be resolved through the tenant first, so a foreign id is
  // simply not found.
  it("refuses a foreign batchId instead of using it as a filter", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion?batchId=batch-b1");

    expect(res.status).toBe(404);
    // The roster read is the oracle. Proving it never ran is the whole point —
    // a 404 returned after the membership list was already fetched would be the
    // same leak with a tidier status code.
    expect(prisma.lmsBatchMember.findMany).not.toHaveBeenCalled();
  });

  it("resolves an own-tenant batchId THROUGH the tenant before reading the roster", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion?batchId=batch-a1");

    expect(res.status).toBe(200);
    // Exact object, not objectContaining: a scope that widened to `{ id }` alone
    // would still satisfy a loose assertion while reopening the hole.
    expect(prisma.lmsBatch.findFirst).toHaveBeenCalledWith({
      where: { id: "batch-a1", tenantId: "tenant-a" },
    });
  });

  it("skips the batch-member query entirely when no batchId is supplied", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    expect(prisma.lmsBatchMember.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty array for a tenant with no enrollments", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-empty/reports/completion");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it("allows a tenant lms_admin and looks the grant up scoped to that tenant", async () => {
    authState.roles = ["corporate_client"];
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ id: "role-1" } as never);
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    expect(res.status).toBe(200);
    // A grant for ANY tenant must not open every tenant's report.
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
      where: { userId: "admin-1", role: "lms_admin", tenantId: "tenant-a" },
    });
  });

  it("returns 403 and runs no query when the caller administers another tenant", async () => {
    authState.roles = ["corporate_client"];
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
    const res = await request(app).get("/api/lms/tenants/tenant-b/reports/completion");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    // Status alone is not enough: the guard must short-circuit BEFORE any read,
    // otherwise the rows are already in memory (and in the logs) when it denies.
    expect(prisma.lmsEnrollment.findMany).not.toHaveBeenCalled();
    expect(prisma.lmsLesson.groupBy).not.toHaveBeenCalled();
  });

  it("lets a super admin through without a per-tenant role lookup", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    expect(res.status).toBe(200);
    expect(prisma.userRole.findFirst).not.toHaveBeenCalled();
  });

  it("converts a database failure into a 500 envelope without leaking the driver error", async () => {
    // The handler forwards to `next(err)`; if it ever swallowed the rejection the
    // request would hang instead. The message must stay generic — a raw Prisma
    // error carries table and column names straight to the client.
    vi.mocked(prisma.lmsEnrollment.findMany).mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 lms_enrollment"),
    );
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
  });
});

// ─── GET /reports/completion/csv ──────────────────────────────────────────────

describe("GET /api/lms/tenants/:tenantId/reports/completion/csv", () => {
  it("exports the tenant's rows as CSV with the Indonesian header", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const lines = res.text.trim().split("\n");
    expect(lines[0]).toBe("Nama,Email,Kursus,Total Pelajaran,Selesai,Persentase,Lulus");
    expect(lines).toHaveLength(4);
  });

  it("never writes another tenant's employees into the export", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/csv");
    // A CSV lands in an inbox; one leaked row is a disclosure that cannot be
    // recalled. Assert on the payload, not just on the 200.
    expect(res.text).not.toContain("Dave");
    expect(res.text).not.toContain("dave@tenant-b.test");
    expect(res.text).not.toContain("Rahasia Tenant B");
    expect(prisma.lmsEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } }),
    );
    expect(prisma.lmsLesson.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { course: { tenantId: "tenant-a" } } }),
    );
  });

  it('marks a finished enrollment "Ya" and an unfinished one "Tidak"', async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/csv");
    expect(res.text).toContain("Alice,alice@tenant-a.test,Onboarding Tenant A,2,1,50,Tidak");
    expect(res.text).toContain("Bob,bob@tenant-a.test,Onboarding Tenant A,2,2,100,Ya");
  });

  it("writes 0 rather than NaN for a course with no lessons", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/csv");
    expect(res.text).toContain("Cara,cara@tenant-a.test,Keamanan Data,0,0,0,Tidak");
    expect(res.text).not.toContain("NaN");
  });

  it("names the download after the tenant in the URL", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/csv");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="laporan-tenant-a.csv"');
  });

  it("emits a header-only file for a tenant with no enrollments", async () => {
    // An empty tenant must still produce a valid, openable CSV — not a 500 and
    // not a zero-byte file that Excel refuses.
    const res = await request(app).get("/api/lms/tenants/tenant-empty/reports/completion/csv");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Nama,Email,Kursus,Total Pelajaran,Selesai,Persentase,Lulus\n");
  });

  it("returns 403 and exports nothing when the caller administers another tenant", async () => {
    authState.roles = ["corporate_client"];
    const res = await request(app).get("/api/lms/tenants/tenant-b/reports/completion/csv");
    expect(res.status).toBe(403);
    expect(prisma.lmsEnrollment.findMany).not.toHaveBeenCalled();
  });

  it("returns a JSON 500 — not a truncated CSV — when the database fails", async () => {
    // Nothing has been written to the response yet at this point, so the error
    // handler can still answer with the envelope. A half-written CSV would look
    // like a complete (but silently short) export to whoever downloads it.
    vi.mocked(prisma.lmsLesson.groupBy).mockRejectedValue(new Error("statement timeout"));
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/csv");
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });
});

// ─── GET /reports/completion/pdf ──────────────────────────────────────────────

describe("GET /api/lms/tenants/:tenantId/reports/completion/pdf", () => {
  it("streams a PDF for an existing tenant", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/pdf");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("names the file after the tenant slug, not the raw id", async () => {
    // The slug comes from the tenant row that was just looked up by id; using the
    // id would put a UUID in front of an HR manager.
    const res = await request(app).get("/api/lms/tenants/tenant-a/reports/completion/pdf");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="laporan-tenant-a-slug.pdf"');
  });

  it("renders the tenant name in the title and one line per enrollment", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/reports/completion/pdf");
    expect(pdfState.lines[0]).toBe("Laporan Completion — PT Tenant A");
    expect(pdfState.lines).toContain("Kursus: Onboarding Tenant A | User: user-alice | 50% (1/2)");
    expect(pdfState.lines).toContain("Kursus: Onboarding Tenant A | User: user-bob | 100% (2/2)");
    // The no-lessons branch again — a PDF is the artefact people archive.
    expect(pdfState.lines).toContain("Kursus: Keamanan Data | User: user-cara | 0% (0/0)");
  });

  it("never renders another tenant's enrollments", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/reports/completion/pdf");
    expect(pdfState.lines.join("\n")).not.toContain("Rahasia Tenant B");
    expect(pdfState.lines.join("\n")).not.toContain("user-dave");
    expect(prisma.lmsEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } }),
    );
    expect(prisma.lmsLesson.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { course: { tenantId: "tenant-a" } } }),
    );
  });

  it("looks the tenant up by the id in the URL", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/reports/completion/pdf");
    expect(prisma.lmsTenant.findUnique).toHaveBeenCalledWith({ where: { id: "tenant-a" } });
  });

  it("returns 404 for a tenant that does not exist", async () => {
    // Must fail before any header is written, otherwise the client receives a
    // half-streamed PDF that no reader can open.
    const res = await request(app).get("/api/lms/tenants/tenant-ghost/reports/completion/pdf");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Tenant tidak ditemukan." },
    });
  });

  it("returns 403 and never loads the tenant when the caller administers another one", async () => {
    authState.roles = ["corporate_client"];
    const res = await request(app).get("/api/lms/tenants/tenant-b/reports/completion/pdf");
    expect(res.status).toBe(403);
    expect(prisma.lmsTenant.findUnique).not.toHaveBeenCalled();
    expect(pdfState.lines).toEqual([]);
  });
});
