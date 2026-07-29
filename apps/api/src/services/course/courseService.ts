import { prisma } from "../../db/prisma.js";
import { searchCourses } from "../search/meilisearch.js";
import { enqueueSearchIndex } from "../../jobs/queues.js";
import { AppError } from "../../types/index.js";
import { logger } from "../../lib/logger.js";

export type CourseListFilter = {
  categorySlug?: string;
  level?: string;
  q?: string;
  featured?: boolean;
  status?: string;
  format?: "regular" | "private_class";
  free?: boolean;
  page?: number;
  limit?: number;
};

/**
 * A course counts as free only when the list price AND any sale price are zero.
 *
 * Why the conservative rule: checkout prices a course from `course.price` alone
 * (`routes/checkout.ts` — salePrice is not applied to courses), so a looser
 * "effective price = salePrice ?? price" rule would surface a course with
 * price=100000/salePrice=0 as GRATIS and then charge the buyer full price. Only
 * a course that is free under BOTH readings is safe to advertise as free.
 *
 * Wrapped in `AND` so it composes with the `OR` the text-search branch already
 * uses — two `OR` keys on one where object would overwrite each other.
 */
const FREE_COURSE_WHERE = {
  AND: [{ price: 0, OR: [{ salePrice: null }, { salePrice: 0 }] }],
} as const;

const COURSE_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDesc: true,
  price: true,
  salePrice: true,
  status: true,
  level: true,
  thumbnailUrl: true,
  totalDuration: true,
  totalLessons: true,
  totalEnrolled: true,
  avgRating: true,
  totalReviews: true,
  isFeatured: true,
  publishedAt: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  trainer: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function listCourses(filter: CourseListFilter = {}) {
  const { categorySlug, level, q, featured, status = "published", format, free, page = 1, limit = 20 } = filter;
  const skip = (page - 1) * limit;

  // BL-47: private classes must never pollute the general catalog. Without an
  // explicit format the list serves regular courses only; callers opt in to
  // private classes with format=private_class.
  const formatWhere = format ?? { not: "private_class" };

  // BL-52: free-ness is decided in SQL, not by the caller slicing a page of
  // results — a client-side filter over the first N rows silently hides every
  // free course ranked below the cut.
  const freeWhere = free ? FREE_COURSE_WHERE : {};

  if (q) {
    const hits = await searchCourses(q, { limit, offset: skip, filter: `status = "${status}"` });
    if (hits.length > 0) {
      const slugs = hits.map((h) => h.slug);
      // Format is not part of the search index, so the format constraint is
      // re-applied on the Prisma fetch (search hits outside the requested
      // format are dropped here).
      const courses = await prisma.course.findMany({
        where: { slug: { in: slugs }, status, format: formatWhere, ...freeWhere },
        select: COURSE_SELECT,
      });
      const ordered = slugs.map((s) => courses.find((c) => c.slug === s)).filter(Boolean);
      return { data: ordered, total: ordered.length, page, limit };
    }
    // Fallback to Prisma ILIKE search
    const where = {
      status,
      format: formatWhere,
      ...freeWhere,
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { shortDesc: { contains: q, mode: "insensitive" as const } },
      ],
    };
    const [data, total] = await Promise.all([
      prisma.course.findMany({ where, select: COURSE_SELECT, skip, take: limit, orderBy: { publishedAt: "desc" } }),
      prisma.course.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  const where: Record<string, unknown> = { status, format: formatWhere, ...freeWhere };
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  if (level) where.level = level;
  if (featured !== undefined) where.isFeatured = featured;

  const [data, total] = await Promise.all([
    prisma.course.findMany({ where, select: COURSE_SELECT, skip, take: limit, orderBy: { publishedAt: "desc" } }),
    prisma.course.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    select: {
      ...COURSE_SELECT,
      description: true,
      previewVideo: true,
      metaTitle: true,
      metaDesc: true,
      language: true,
      // BL-47: checkout must know the course format. waGroupLink and
      // onboardingContact stay OUT of every public select — they are only
      // revealed on the owner-scoped order detail after payment.
      format: true,
      sections: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              duration: true,
              isPreview: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  });
}

export type CreateCourseDto = {
  slug: string;
  title: string;
  description?: string;
  shortDesc?: string;
  price: number;
  salePrice?: number;
  categoryId?: string;
  level?: string;
  thumbnailUrl?: string;
  previewVideo?: string;
};

export async function createCourse(trainerId: string, dto: CreateCourseDto) {
  const course = await prisma.course.create({
    data: {
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      shortDesc: dto.shortDesc,
      price: dto.price,
      salePrice: dto.salePrice,
      categoryId: dto.categoryId,
      level: dto.level,
      thumbnailUrl: dto.thumbnailUrl,
      previewVideo: dto.previewVideo,
      trainerId,
      status: "draft",
    },
    include: { category: { select: { name: true, slug: true } } },
  });

  await enqueueSearchIndex({
    type: "index-course",
    course: {
      ...course,
      price: course.price.toString(),
      avgRating: course.avgRating.toString(),
      categoryName: course.category?.name,
    },
  });

  return course;
}

export type UpdateCourseDto = Partial<Omit<CreateCourseDto, "slug">>;

/**
 * Who is asking to update the course.
 *
 * Deliberately a required, non-optional discriminated union. An earlier shape
 * (`{ trainerId?: string }` with a `= {}` default) meant a caller that simply
 * forgot the argument got an UNSCOPED update — the IDOR would silently return
 * with `tsc` still green. Here, omitting the scope is a compile error, and
 * "update anything" has to be written out on purpose.
 */
export type UpdateCourseScope = { kind: "any" } | { kind: "trainer"; trainerId: string };

export async function updateCourse(id: string, dto: UpdateCourseDto, scope: UpdateCourseScope) {
  const data = {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.description !== undefined && { description: dto.description }),
    ...(dto.shortDesc !== undefined && { shortDesc: dto.shortDesc }),
    ...(dto.price !== undefined && { price: dto.price }),
    ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
    ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
    ...(dto.level !== undefined && { level: dto.level }),
    ...(dto.thumbnailUrl !== undefined && { thumbnailUrl: dto.thumbnailUrl }),
    ...(dto.previewVideo !== undefined && { previewVideo: dto.previewVideo }),
  };

  // IDOR guard. `prisma.course.update` keys on the id alone, so without an
  // ownership predicate any trainer could rewrite another trainer's course
  // (title, price, thumbnail).
  //
  // updateMany — not findFirst-then-update — so the ownership test and the write
  // are one statement: a separate probe would also turn a course deleted in the
  // gap into a Prisma P2025 (an unmapped 500) instead of a 404. Same atomic
  // pattern as `PATCH /api/trainer/courses/:courseId/status`.
  const where = scope.kind === "trainer" ? { id, trainerId: scope.trainerId } : { id };
  const { count } = await prisma.course.updateMany({ where, data });

  if (count === 0) {
    // 404, never 403: a 403 would confirm the id exists and belongs to someone
    // else. Published course ids are public anyway (GET /api/courses exposes
    // them), so what this really protects is the existence of draft/pending
    // courses. The message is byte-identical to the not-found case on purpose.
    if (scope.kind === "trainer") {
      // Denied attempts used to vanish entirely — no audit row, no log line —
      // which made exactly the attack this guard blocks invisible.
      logger.warn("course update denied: not owned by trainer", { courseId: id, trainerId: scope.trainerId });
    }
    throw new AppError(404, "Kursus tidak ditemukan.");
  }

  const course = await prisma.course.findUniqueOrThrow({
    where: { id },
    include: { category: { select: { name: true, slug: true } } },
  });

  await enqueueSearchIndex({
    type: "index-course",
    course: {
      ...course,
      price: course.price.toString(),
      avgRating: course.avgRating.toString(),
      categoryName: course.category?.name,
    },
  });

  return course;
}

export async function publishCourse(id: string) {
  const course = await prisma.course.update({
    where: { id },
    data: { status: "published", publishedAt: new Date() },
    include: { category: { select: { name: true, slug: true } } },
  });

  await enqueueSearchIndex({
    type: "index-course",
    course: {
      ...course,
      price: course.price.toString(),
      avgRating: course.avgRating.toString(),
      categoryName: course.category?.name,
    },
  });

  return course;
}

export async function deleteCourse(id: string) {
  await enqueueSearchIndex({ type: "delete-course", courseId: id });
  await prisma.course.delete({ where: { id } });
}
