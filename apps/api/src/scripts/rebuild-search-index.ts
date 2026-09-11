/**
 * Rebuild the Meilisearch indices (courses, events, ebooks) from Postgres.
 *
 * Why this exists (BL-164): every write path keeps Meilisearch in sync
 * incrementally (indexCourse/indexEvent/indexEbook fire on create/update/
 * publish), but there was no way to reconstruct the indices from scratch if
 * Meilisearch's own data were ever lost — its data directory is not covered
 * by scripts/backup.sh, and Postgres (the source of truth for every field in
 * the index) is the only backed-up copy. This script is that recovery path:
 * point it at a healthy Postgres and a fresh/emptied Meilisearch and it
 * reconstructs all three indices, including the courses/events/ebooks index
 * settings (searchable/filterable/sortable attributes) that a brand-new
 * Meilisearch instance would otherwise be missing entirely.
 *
 * Usage: npx tsx src/scripts/rebuild-search-index.ts
 * (or: npm run search:reindex, from apps/api)
 *
 * Courses are indexed regardless of status, matching the existing live
 * behavior in services/course/courseService.ts (drafts are indexed too;
 * status filtering happens at query time). Events and ebooks use the same
 * publish-gated sync functions the write paths already use, so a
 * draft/cancelled row is correctly left out of (or removed from) the index.
 */

import { PrismaClient } from "@prisma/client";
import {
  indexCourse,
  ensureCourseIndexSettings,
  ensureEventIndexSettings,
  ensureEbookIndexSettings,
} from "../services/search/meilisearch.js";
import { syncEventSearchIndex, syncEbookSearchIndex } from "../jobs/processors/searchIndex.js";

const prisma = new PrismaClient();

async function reindexCourses(): Promise<number> {
  const courses = await prisma.course.findMany({
    include: { category: { select: { name: true } } },
  });
  for (const course of courses) {
    await indexCourse({
      ...course,
      price: course.price.toString(),
      avgRating: course.avgRating.toString(),
      categoryName: course.category?.name,
    });
  }
  return courses.length;
}

async function reindexEvents(): Promise<number> {
  const events = await prisma.event.findMany();
  for (const event of events) {
    await syncEventSearchIndex({
      ...event,
      price: event.price.toString(),
      salePrice: event.salePrice?.toString() ?? null,
    });
  }
  return events.length;
}

async function reindexEbooks(): Promise<number> {
  const ebooks = await prisma.eBook.findMany();
  for (const ebook of ebooks) {
    await syncEbookSearchIndex({
      ...ebook,
      price: ebook.price.toString(),
      salePrice: ebook.salePrice?.toString() ?? null,
    });
  }
  return ebooks.length;
}

async function main() {
  console.log("Rebuilding Meilisearch indices from Postgres...");

  await Promise.all([ensureCourseIndexSettings(), ensureEventIndexSettings(), ensureEbookIndexSettings()]);
  console.log("Index settings ensured (searchable/filterable/sortable attributes).");

  const courseCount = await reindexCourses();
  console.log(`Courses reindexed: ${courseCount}`);

  const eventCount = await reindexEvents();
  console.log(`Events reindexed: ${eventCount}`);

  const ebookCount = await reindexEbooks();
  console.log(`Ebooks reindexed: ${ebookCount}`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("rebuild-search-index failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
