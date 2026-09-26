/**
 * Production seed — creates demo content for launch:
 * - 1 super admin user
 * - 5 categories
 * - 6 published courses
 * - 4 events
 * - 6 e-books
 * - 3 blog posts
 *
 * Usage: npx tsx prisma/seed.ts
 * Or via: npx prisma db seed (if configured in package.json)
 */

import { PrismaClient } from "@prisma/client";
import { Meilisearch } from "meilisearch";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

/**
 * Best-effort Meilisearch sync (TASK-021). The seed writes courses straight to
 * Postgres via upsert, bypassing the publish flow that normally fires the
 * search-index job — so without this the catalog exists in the DB but returns
 * nothing from /api/search. Reads MEILISEARCH_* from process.env directly (no
 * env.ts coupling) and never throws: Meilisearch is optional.
 */
async function syncSearchIndex() {
  const host = process.env.MEILISEARCH_URL;
  if (!host) {
    console.log("↷ MEILISEARCH_URL unset — skipping search index sync");
    return;
  }
  try {
    const client = new Meilisearch({ host, apiKey: process.env.MEILISEARCH_KEY });
    const index = client.index("courses");
    await index.updateSearchableAttributes(["title", "shortDesc", "description", "categoryName"]);
    await index.updateFilterableAttributes(["status", "categoryName", "level", "isFeatured"]);
    await index.updateSortableAttributes(["price", "avgRating", "totalEnrolled"]);

    const courses = await prisma.course.findMany({
      where: { status: "published" },
      include: { category: { select: { name: true } } },
    });
    if (courses.length > 0) {
      await index.addDocuments(
        courses.map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          shortDesc: c.shortDesc ?? "",
          description: c.description ?? "",
          status: c.status,
          categoryName: c.category?.name ?? "",
          level: c.level ?? "",
          price: Number(c.price),
          thumbnailUrl: c.thumbnailUrl ?? "",
          avgRating: Number(c.avgRating),
          totalEnrolled: c.totalEnrolled,
          isFeatured: c.isFeatured,
        })),
      );
    }
    console.log(`✓ search index synced (${courses.length} courses)`);
  } catch (err) {
    console.warn(`↷ search index sync skipped: ${String(err)}`);
  }
}

async function main() {
  console.log("🌱 Seeding Jago Akademi production data...");

  // ─── Super Admin ───────────────────────────────────────────────────────────
  // Fail-closed (TD-33): NEVER fall back to a hardcoded password. The seed
  // refuses to run without an explicit, strong SEED_ADMIN_PASSWORD.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@jagoakademi.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    console.error(
      "FATAL: SEED_ADMIN_PASSWORD env var is required (min 12 chars). " +
        "Refusing to seed an admin account with a default/weak password.",
    );
    process.exit(1);
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin Jago Akademi",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      isVerified: true,
      isActive: true,
      authProvider: "local",
      roles: { create: { role: "super_admin" } },
    },
  });
  console.log(`✓ Admin created: ${admin.email}`);

  // ─── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: "Marketing Digital", slug: "marketing-digital", sortOrder: 1 },
    { name: "Desain Grafis", slug: "desain-grafis", sortOrder: 2 },
    { name: "Programming & Tech", slug: "programming-tech", sortOrder: 3 },
    { name: "Bisnis & Keuangan", slug: "bisnis-keuangan", sortOrder: 4 },
    { name: "HR & Kepemimpinan", slug: "hr-kepemimpinan", sortOrder: 5 },
  ];

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✓ ${categories.length} categories seeded`);

  // ─── Trainer users ─────────────────────────────────────────────────────────
  const trainers = [
    { email: "trainer1@jagoakademi.com", name: "Budi Santoso" },
    { email: "trainer2@jagoakademi.com", name: "Rina Kusuma" },
    { email: "trainer3@jagoakademi.com", name: "Kevin Wijaya" },
  ];

  const trainerIds: string[] = [];
  for (const t of trainers) {
    // Fail-closed: each demo trainer gets a random unguessable password —
    // these accounts are not meant to be logged into; an admin can reset
    // credentials later if a real person takes the account over.
    const randomPassword = randomBytes(24).toString("base64url");
    const trainer = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        name: t.name,
        passwordHash: await bcrypt.hash(randomPassword, 12),
        isVerified: true,
        isActive: true,
        authProvider: "local",
        roles: { create: { role: "trainer" } },
      },
    });
    trainerIds.push(trainer.id);
  }
  console.log(`✓ ${trainers.length} trainers seeded`);

  // ─── Courses ───────────────────────────────────────────────────────────────
  const marketingCatId = await prisma.courseCategory
    .findUnique({ where: { slug: "marketing-digital" } })
    .then((c) => c!.id);

  const designCatId = await prisma.courseCategory
    .findUnique({ where: { slug: "desain-grafis" } })
    .then((c) => c!.id);

  const techCatId = await prisma.courseCategory
    .findUnique({ where: { slug: "programming-tech" } })
    .then((c) => c!.id);

  // BL-116: the seed writes straight to Postgres, bypassing the admin publish
  // flow that stamps publishedAt — so seeded courses used to go live with
  // status "published" but publishedAt NULL, leaving the admin `publishedAt:desc`
  // sort undefined over them. Stamp it here like the blog seed already does;
  // rows created before this fix are repaired by scripts/backfill-published-at.sql.
  const coursePublishedAt = new Date();
  const courses = [
    {
      slug: "digital-marketing-fundamentals",
      title: "Digital Marketing Fundamentals",
      shortDesc: "Kuasai dasar-dasar pemasaran digital dari nol hingga mahir.",
      level: "beginner", price: 299000, status: "published", publishedAt: coursePublishedAt,
      categoryId: marketingCatId, trainerId: trainerIds[0],
    },
    {
      slug: "social-media-marketing-advanced",
      title: "Social Media Marketing Advanced",
      shortDesc: "Strategi konten dan iklan berbayar di Instagram, TikTok, Facebook.",
      level: "intermediate", price: 399000, status: "published", publishedAt: coursePublishedAt,
      categoryId: marketingCatId, trainerId: trainerIds[0],
    },
    {
      slug: "ui-ux-design-figma",
      title: "UI/UX Design dengan Figma",
      shortDesc: "Belajar desain antarmuka modern menggunakan Figma dari nol.",
      level: "beginner", price: 349000, status: "published", publishedAt: coursePublishedAt,
      categoryId: designCatId, trainerId: trainerIds[1],
    },
    {
      slug: "web-development-react-nextjs",
      title: "Full Stack Web Development: React & Next.js",
      shortDesc: "Bangun aplikasi web modern dengan React 18 dan Next.js 14.",
      level: "intermediate", price: 499000, status: "published", publishedAt: coursePublishedAt,
      categoryId: techCatId, trainerId: trainerIds[2],
    },
    {
      slug: "seo-mastery",
      title: "SEO Mastery: Ranking #1 di Google",
      shortDesc: "Teknik SEO on-page dan off-page terkini untuk bisnis Anda.",
      level: "intermediate", price: 279000, status: "published", publishedAt: coursePublishedAt,
      categoryId: marketingCatId, trainerId: trainerIds[0],
    },
    {
      slug: "brand-design-canva",
      title: "Brand Design dengan Canva Pro",
      shortDesc: "Buat identitas merek profesional tanpa keahlian desain sebelumnya.",
      level: "beginner", price: 0, status: "published", publishedAt: coursePublishedAt,
      categoryId: designCatId, trainerId: trainerIds[1],
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: { status: course.status },
      create: course,
    });
  }
  console.log(`✓ ${courses.length} courses seeded`);

  // ─── Events ────────────────────────────────────────────────────────────────
  const now = new Date();
  const events = [
    {
      slug: "webinar-marketing-digital-2024",
      title: "Webinar: Tren Digital Marketing 2024",
      type: "online", status: "published",
      startDate: new Date(now.getTime() + 7 * 86400000),
      endDate: new Date(now.getTime() + 7 * 86400000 + 7200000),
      location: "Zoom Webinar", price: 0,
      quota: 500, isFeatured: true,
    },
    {
      slug: "workshop-ui-ux-jakarta",
      title: "Workshop UI/UX Design — Jakarta",
      type: "offline", status: "published",
      startDate: new Date(now.getTime() + 14 * 86400000),
      endDate: new Date(now.getTime() + 14 * 86400000 + 28800000),
      location: "Co-working Space Jakarta Selatan", price: 350000,
      quota: 30, isFeatured: false,
    },
    {
      slug: "seminar-startup-indonesia",
      title: "Seminar: Membangun Startup Indonesia",
      type: "hybrid", status: "published",
      startDate: new Date(now.getTime() + 21 * 86400000),
      endDate: new Date(now.getTime() + 21 * 86400000 + 14400000),
      location: "Jakarta Convention Center", price: 150000,
      quota: 1000, isFeatured: true,
    },
    {
      slug: "bootcamp-fullstack-dev",
      title: "Bootcamp Full Stack Developer — 2 Hari",
      type: "online", status: "draft",
      startDate: new Date(now.getTime() + 30 * 86400000),
      endDate: new Date(now.getTime() + 31 * 86400000),
      location: "Live Streaming YouTube", price: 500000,
      quota: 200, isFeatured: false,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { slug: event.slug },
      update: {},
      create: event,
    });
  }
  console.log(`✓ ${events.length} events seeded`);

  // ─── E-Books ───────────────────────────────────────────────────────────────
  const ebooks = [
    { slug: "panduan-digital-marketing-2024", title: "Panduan Digital Marketing 2024", category: "Marketing", price: 0, status: "published" },
    { slug: "desain-logo-profesional", title: "Desain Logo Profesional dengan Canva", category: "Desain", price: 0, status: "published" },
    { slug: "seo-guide-indonesia", title: "SEO Guide for Indonesian Business", category: "Marketing", price: 79000, status: "published" },
    { slug: "financial-planning-freelancer", title: "Financial Planning untuk Freelancer", category: "Keuangan", price: 99000, status: "published" },
    { slug: "react-best-practices", title: "React Best Practices 2024", category: "Teknologi", price: 129000, status: "published" },
    { slug: "hr-playbook-startup", title: "HR Playbook untuk Startup Indonesia", category: "HR", price: 0, status: "published" },
  ];

  for (const ebook of ebooks) {
    await prisma.eBook.upsert({
      where: { slug: ebook.slug },
      update: {},
      create: {
        ...ebook,
        description: `Panduan lengkap tentang ${ebook.title}`,
        fileUrl: `https://media.jagoakademi.com/ebooks/${ebook.slug}.pdf`,
      },
    });
  }
  console.log(`✓ ${ebooks.length} e-books seeded`);

  // ─── Blog Posts ────────────────────────────────────────────────────────────
  const blogPosts = [
    {
      slug: "cara-belajar-digital-marketing",
      title: "Cara Belajar Digital Marketing dari Nol",
      excerpt: "Panduan lengkap untuk pemula yang ingin memulai karir di dunia digital marketing.",
      content: "<p>Digital marketing adalah salah satu keahlian yang paling dicari di era digital ini...</p>",
      category: "Marketing", status: "published", publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      slug: "tips-ui-ux-designer-pemula",
      title: "10 Tips untuk UI/UX Designer Pemula",
      excerpt: "Kumpulan tips praktis yang wajib diketahui oleh UI/UX designer yang baru memulai.",
      content: "<p>Menjadi UI/UX designer yang handal membutuhkan latihan dan pemahaman yang mendalam...</p>",
      category: "Desain", status: "published", publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      slug: "tren-teknologi-2024",
      title: "Tren Teknologi yang Wajib Dikuasai di 2024",
      excerpt: "Dari AI hingga Web3, ini adalah teknologi yang akan mendominasi industri tahun ini.",
      content: "<p>Tahun 2024 membawa banyak perubahan dalam dunia teknologi...</p>",
      category: "Teknologi", status: "published", publishedAt: new Date(),
      authorId: admin.id,
    },
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: post,
    });
  }
  console.log(`✓ ${blogPosts.length} blog posts seeded`);

  await syncSearchIndex();

  console.log("\n✅ Seeding complete!");
  console.log(`   Admin email: ${adminEmail} (password = your SEED_ADMIN_PASSWORD)`);
  console.log("   Change the admin password after first login. Demo trainer accounts have random passwords.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
