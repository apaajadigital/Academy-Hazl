import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { successResponse } from "../../types/index.js";
import { csvCell, CSV_EXPORT_MAX_ROWS } from "../../lib/csv.js";

const router = Router();

// ─── Admin: Leads CRM ─────────────────────────────────────────────────────────

const LeadListSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  q:      z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
});

// GET /api/admin/leads — paginated leads with optional filters
router.get("/leads", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, q, source, status } = LeadListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name:  { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { company: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          message: true,
          source: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json(successResponse(leads, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/leads/:id — update lead status
router.patch("/leads/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: string };
    const VALID_STATUSES = ["new", "contacted", "qualified", "converted", "archived"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: { message: `Status harus salah satu dari: ${VALID_STATUSES.join(", ")}.` } });
    }
    const lead = await prisma.lead.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
    return res.json(successResponse(lead));
  } catch (err) {
    next(err);
  }
});
// GET /api/admin/leads/export — export all leads as CSV
router.get("/leads/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = await prisma.lead.findMany({
      // Hard cap (see CSV_EXPORT_MAX_ROWS): keep the export bounded in memory.
      take: CSV_EXPORT_MAX_ROWS,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        message: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });

    const csvHeaders = "ID,Nama,Email,Telepon,Perusahaan,Pesan,Sumber,Status,Dibuat Pada\n";
    // csvCell handles quote-escaping AND formula-injection (M2) for every
    // string cell — lead fields are end-user input, so all must be sanitized.
    const csvRows = leads.map((l) => {
      const createdAt = l.createdAt.toISOString();
      return [
        csvCell(l.id),
        csvCell(l.name),
        csvCell(l.email),
        csvCell(l.phone),
        csvCell(l.company),
        csvCell(l.message),
        csvCell(l.source),
        csvCell(l.status),
        createdAt,
      ].join(",");
    }).join("\n");

    const csvContent = csvHeaders + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="leads-export.csv"');
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

export default router;
