import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

/**
 * A certificate is a product the student paid for, and this service sat at 1.36%
 * coverage. PDFKit and qrcode are exercised FOR REAL here — they are pure Node,
 * no network — so the PDF path is genuinely covered rather than mocked away.
 * Only the filesystem and the database are substituted.
 */

vi.mock("../../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    WEB_URL: "https://jagoakademi.com",
    UPLOAD_DIR: "uploads",
  },
}));

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    certificate: { findFirst: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    course: { findUnique: vi.fn() },
  },
}));

const fsMock = {
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  createWriteStream: vi.fn(),
};
vi.mock("node:fs", () => fsMock);

const { prisma } = await import("../../src/db/prisma.js");
const { Prisma } = await import("@prisma/client");
const QRCode = (await import("qrcode")).default;
const { generateCertificatePDF, issueCertificate } = await import(
  "../../src/services/certificate/certificateService.js"
);

/** A write stream that reports success on the next tick, like the real one. */
function okStream() {
  const stream = new EventEmitter() as EventEmitter & { end: (b: Buffer) => void };
  stream.end = () => {
    setImmediate(() => stream.emit("finish"));
  };
  return stream;
}

function failingStream(err: Error) {
  const stream = new EventEmitter() as EventEmitter & { end: (b: Buffer) => void };
  stream.end = () => {
    setImmediate(() => stream.emit("error", err));
  };
  return stream;
}

beforeEach(() => {
  vi.clearAllMocks();
  fsMock.existsSync.mockReturnValue(true);
  fsMock.createWriteStream.mockImplementation(() => okStream() as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Budi Santoso" } as never);
  vi.mocked(prisma.course.findUnique).mockResolvedValue({ title: "Kursus React Lanjutan" } as never);
  vi.mocked(prisma.certificate.findFirst).mockResolvedValue(null as never);
});

describe("generateCertificatePDF", () => {
  it("produces a real PDF document", async () => {
    const pdf = await generateCertificatePDF(
      "Budi Santoso",
      "Kursus React Lanjutan",
      new Date("2026-09-02T00:00:00Z"),
      "ABCD-EFGH-JKLM-NPQR",
    );

    expect(Buffer.isBuffer(pdf)).toBe(true);
    // Every PDF starts with the %PDF- header and ends with the EOF marker; a
    // truncated or empty render would fail one of these.
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.subarray(-1024).toString("latin1")).toContain("%%EOF");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  it("encodes the public verify URL for that certificate into the QR code", async () => {
    const spy = vi.spyOn(QRCode, "toDataURL");

    await generateCertificatePDF("Budi", "Kursus", new Date(), "ABCD-EFGH-JKLM-NPQR");

    // This URL is the entire point of the QR: scan it, land on the page that
    // proves the certificate is real. A wrong origin makes it unverifiable.
    expect(spy).toHaveBeenCalledWith(
      "https://jagoakademi.com/verify/ABCD-EFGH-JKLM-NPQR",
      expect.objectContaining({ width: 120 }),
    );
    spy.mockRestore();
  });

  it("renders long holder and course names without throwing", async () => {
    const pdf = await generateCertificatePDF(
      "Muhammad Rizky Ananda Pratama Wijaya Kusuma Nugroho",
      "Kursus Pengembangan Aplikasi Web Modern dengan React, Next.js, dan TypeScript",
      new Date(),
      "ABCD-EFGH-JKLM-NPQR",
    );

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("issueCertificate", () => {
  it("returns the existing certificate instead of minting a second one", async () => {
    vi.mocked(prisma.certificate.findFirst).mockResolvedValue({
      code: "OLDC-ODE1-OLDC-ODE2",
      fileUrl: "/uploads/certificates/cert-OLDC-ODE1-OLDC-ODE2.pdf",
    } as never);

    const result = await issueCertificate("user-1", "course-1");

    expect(result.code).toBe("OLDC-ODE1-OLDC-ODE2");
    // No PDF, no disk write, no insert: the cheap path must stay cheap.
    expect(prisma.certificate.create).not.toHaveBeenCalled();
    expect(fsMock.createWriteStream).not.toHaveBeenCalled();
  });

  it("tolerates an existing row whose fileUrl is null", async () => {
    vi.mocked(prisma.certificate.findFirst).mockResolvedValue({
      code: "OLDC-ODE1-OLDC-ODE2",
      fileUrl: null,
    } as never);

    await expect(issueCertificate("user-1", "course-1")).resolves.toEqual({
      code: "OLDC-ODE1-OLDC-ODE2",
      fileUrl: "",
    });
  });

  it("404s when the user is gone", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    await expect(issueCertificate("user-1", "course-1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("404s when the course is gone", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null as never);

    await expect(issueCertificate("user-1", "course-1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("issues a certificate: writes the PDF and records the row", async () => {
    vi.mocked(prisma.certificate.create).mockImplementation((async (args: {
      data: { code: string; fileUrl: string };
    }) => ({ code: args.data.code, fileUrl: args.data.fileUrl })) as never);

    const result = await issueCertificate("user-1", "course-1");

    expect(fsMock.createWriteStream).toHaveBeenCalledOnce();
    expect(prisma.certificate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        courseId: "course-1",
        type: "course",
        code: result.code,
      }),
    });
    expect(result.fileUrl).toBe(`/uploads/certificates/cert-${result.code}.pdf`);
  });

  it("mints a code in the documented shape, from an unambiguous alphabet", async () => {
    vi.mocked(prisma.certificate.create).mockImplementation((async (args: {
      data: { code: string; fileUrl: string };
    }) => ({ code: args.data.code, fileUrl: args.data.fileUrl })) as never);

    const { code } = await issueCertificate("user-1", "course-1");

    // Four groups of four, hyphen separated.
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    // I, O, 0 and 1 are excluded on purpose: a certificate code gets read aloud
    // and typed by hand into the verify page.
    expect(code).not.toMatch(/[IO01]/);
  });

  it("creates the certificate directory only when it is missing", async () => {
    vi.mocked(prisma.certificate.create).mockResolvedValue({ code: "X", fileUrl: "u" } as never);

    await issueCertificate("user-1", "course-1");
    expect(fsMock.mkdirSync).not.toHaveBeenCalled();

    fsMock.existsSync.mockReturnValue(false);
    await issueCertificate("user-1", "course-1");
    expect(fsMock.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("certificates"), {
      recursive: true,
    });
  });

  it("propagates a filesystem write failure instead of recording a certificate with no file", async () => {
    fsMock.createWriteStream.mockImplementation(() => failingStream(new Error("ENOSPC")) as never);

    await expect(issueCertificate("user-1", "course-1")).rejects.toThrow("ENOSPC");
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  describe("Batch8 D6 — concurrent issue must not create a duplicate", () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
    });

    it("returns the oldest existing certificate when the unique constraint fires", async () => {
      vi.mocked(prisma.certificate.create).mockRejectedValue(p2002 as never);
      vi.mocked(prisma.certificate.findFirst)
        // The pre-check that lost the race.
        .mockResolvedValueOnce(null as never)
        // The winner the other call inserted.
        .mockResolvedValueOnce({ code: "WINN-ER01-WINN-ER02", fileUrl: "/u/w.pdf" } as never);

      const result = await issueCertificate("user-1", "course-1");

      expect(result).toEqual({ code: "WINN-ER01-WINN-ER02", fileUrl: "/u/w.pdf" });
      // Oldest wins — a later duplicate must never displace the one already issued.
      expect(prisma.certificate.findFirst).toHaveBeenLastCalledWith({
        where: { userId: "user-1", courseId: "course-1", type: "course" },
        orderBy: { issuedAt: "asc" },
      });
    });

    it("rethrows P2002 when no winner can be found — silence would hide a broken constraint", async () => {
      vi.mocked(prisma.certificate.create).mockRejectedValue(p2002 as never);
      vi.mocked(prisma.certificate.findFirst)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce(null as never);

      await expect(issueCertificate("user-1", "course-1")).rejects.toThrow(
        /Unique constraint failed/,
      );
    });

    it("rethrows any error that is not P2002", async () => {
      vi.mocked(prisma.certificate.create).mockRejectedValue(new Error("connection lost") as never);

      await expect(issueCertificate("user-1", "course-1")).rejects.toThrow("connection lost");
    });
  });
});
