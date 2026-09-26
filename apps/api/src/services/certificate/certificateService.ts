import { createWriteStream, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../types/index.js";

const CERT_DIR = join(process.cwd(), env.UPLOAD_DIR, "certificates");

function ensureCertDir() {
  if (!existsSync(CERT_DIR)) mkdirSync(CERT_DIR, { recursive: true });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateCertificatePDF(
  holderName: string,
  courseName: string,
  issuedAt: Date,
  certCode: string
): Promise<Buffer> {
  const verifyUrl = `${env.WEB_URL}/verify/${certCode}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill("#FFFFFF");
    doc.rect(0, 0, W, 8).fill("#0077A8");
    doc.rect(0, H - 8, W, 8).fill("#CC0052");
    doc.rect(0, 0, 8, H).fill("#0077A8");
    doc.rect(W - 8, 0, 8, H).fill("#CC0052");

    // Inner border
    doc.rect(24, 24, W - 48, H - 48).stroke("#E5E5EA");

    // Header
    doc
      .fillColor("#0077A8")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("HAZL ACADEMY", 0, 48, { align: "center" });

    doc
      .fillColor("#6E6E73")
      .fontSize(10)
      .font("Helvetica")
      .text("Platform Edukasi Digital Indonesia", 0, 82, { align: "center" });

    // Title
    doc
      .fillColor("#1D1D1F")
      .fontSize(16)
      .font("Helvetica")
      .text("Sertifikat Penyelesaian Kursus", 0, 120, { align: "center" });

    // Divider
    const divY = 148;
    doc.moveTo(W * 0.25, divY).lineTo(W * 0.75, divY).stroke("#E5E5EA");

    // "Diberikan kepada"
    doc
      .fillColor("#6E6E73")
      .fontSize(12)
      .font("Helvetica")
      .text("Diberikan kepada:", 0, 168, { align: "center" });

    // Holder name
    doc
      .fillColor("#1D1D1F")
      .fontSize(32)
      .font("Helvetica-Bold")
      .text(holderName, 60, 192, { align: "center", width: W - 200 });

    // "telah berhasil menyelesaikan"
    doc
      .fillColor("#6E6E73")
      .fontSize(12)
      .font("Helvetica")
      .text("telah berhasil menyelesaikan kursus:", 0, 250, { align: "center" });

    // Course name
    doc
      .fillColor("#0077A8")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(courseName, 60, 272, { align: "center", width: W - 200 });

    // Date
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(issuedAt);

    doc
      .fillColor("#6E6E73")
      .fontSize(11)
      .font("Helvetica")
      .text(`Tanggal: ${formattedDate}`, 0, 318, { align: "center" });

    // Bottom section: code left, QR right
    const bottomY = 360;

    doc
      .fillColor("#1D1D1F")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Kode Sertifikat:", 60, bottomY);

    doc
      .fillColor("#CC0052")
      .fontSize(14)
      .font("Courier-Bold")
      .text(certCode, 60, bottomY + 16);

    doc
      .fillColor("#6E6E73")
      .fontSize(8)
      .font("Helvetica")
      .text(`Verifikasi: ${verifyUrl}`, 60, bottomY + 44, { width: W - 240 });

    // QR code (right side)
    doc.image(qrBuffer, W - 160, bottomY - 10, { width: 100 });

    doc.end();
  });
}

export async function issueCertificate(
  userId: string,
  courseId: string
): Promise<{ code: string; fileUrl: string }> {
  const existing = await prisma.certificate.findFirst({
    where: { userId, courseId, type: "course" },
  });
  if (existing) return { code: existing.code, fileUrl: existing.fileUrl ?? "" };

  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
  ]);

  if (!user || !course) throw new AppError(404, "User atau kursus tidak ditemukan.");

  const code = generateCode();
  const issuedAt = new Date();
  const pdfBuffer = await generateCertificatePDF(user.name, course.title, issuedAt, code);

  ensureCertDir();
  const filename = `cert-${code}.pdf`;
  const filePath = join(CERT_DIR, filename);
  const fileUrl = `/${env.UPLOAD_DIR}/certificates/${filename}`;

  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(filePath);
    stream.on("finish", resolve);
    stream.on("error", reject);
    stream.end(pdfBuffer);
  });

  // Batch8 D6 (duplicate certificates): a race between two concurrent issue calls
  // can slip past the findFirst check above. The @@unique([userId,courseId,type])
  // makes the DB the arbiter — on a P2002 collision we keep the existing (oldest)
  // certificate instead of creating a duplicate.
  try {
    const certificate = await prisma.certificate.create({
      data: { userId, courseId, code, type: "course", issuedAt, fileUrl },
    });
    return { code: certificate.code, fileUrl: certificate.fileUrl ?? "" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.certificate.findFirst({
        where: { userId, courseId, type: "course" },
        orderBy: { issuedAt: "asc" },
      });
      if (winner) return { code: winner.code, fileUrl: winner.fileUrl ?? "" };
    }
    throw err;
  }
}
