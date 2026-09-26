import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    certificate: { findUnique: vi.fn() },
    courseEnrollment: { findUnique: vi.fn() },
  },
}));

// Mock certificate service to avoid file system operations in tests
vi.mock("../../../src/services/certificate/certificateService.js", () => ({
  issueCertificate: vi.fn(),
  generateCertificatePDF: vi.fn(),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_USER = {
  id: "user-1",
  email: "a@b.com",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const ACCESS_TOKEN = jwt.sign(
  { sub: "user-1", email: "a@b.com", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const AUTH = { Authorization: `Bearer ${ACCESS_TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
});

describe("GET /api/certificates/:code", () => {
  it("returns certificate info for valid code", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      code: "ABCD-EFGH-IJKL-MNOP",
      type: "course",
      issuedAt: new Date("2025-01-01"),
      revokedAt: null,
      isValid: true,
      user: { name: "Budi Santoso" },
      course: { title: "Marketing Management" },
    } as never);

    const res = await request(app).get("/api/certificates/ABCD-EFGH-IJKL-MNOP");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.holderName).toBe("Budi Santoso");
    expect(res.body.data.status).toBe("valid");
  });

  it("returns 404 for unknown code", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/certificates/ZZZZ-ZZZZ-ZZZZ-ZZZZ");
    expect(res.status).toBe(404);
  });

  it("returns revoked status for revoked certificate", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      code: "ABCD-EFGH-IJKL-MNOP",
      type: "course",
      issuedAt: new Date("2025-01-01"),
      revokedAt: new Date("2025-06-01"),
      isValid: false,
      user: { name: "Budi Santoso" },
      course: { title: "Marketing Management" },
    } as never);

    const res = await request(app).get("/api/certificates/ABCD-EFGH-IJKL-MNOP");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("revoked");
  });
});

describe("GET /api/certificates/:code/download", () => {
  it("returns 403 if user does not own certificate", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      userId: "other-user",
      fileUrl: "/uploads/certificates/cert-TEST.pdf",
      isValid: true,
      revokedAt: null,
    } as never);

    const res = await request(app).get("/api/certificates/TEST/download").set(AUTH);
    expect(res.status).toBe(403);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/certificates/TEST/download");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/certificates/issue/:courseId", () => {
  const COURSE_ID = "00000000-0000-0000-0000-000000000001";

  it("returns 400 if enrollment is not completed", async () => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue({
      id: "enr-1",
      isCompleted: false,
    } as never);

    const res = await request(app)
      .post(`/api/certificates/issue/${COURSE_ID}`)
      .set(AUTH);

    expect(res.status).toBe(400);
  });

  it("issues certificate when course is completed", async () => {
    const { issueCertificate } = await import(
      "../../../src/services/certificate/certificateService.js"
    );
    vi.mocked(issueCertificate).mockResolvedValue({
      code: "ABCD-EFGH-IJKL-MNOP",
      fileUrl: "/uploads/certificates/cert-ABCD.pdf",
    });
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue({
      id: "enr-1",
      isCompleted: true,
    } as never);

    const res = await request(app)
      .post(`/api/certificates/issue/${COURSE_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe("ABCD-EFGH-IJKL-MNOP");
  });
});
