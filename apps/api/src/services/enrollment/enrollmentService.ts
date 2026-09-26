import { prisma } from "../../db/prisma.js";
import { AppError } from "../../types/index.js";
import { enqueueCertificate } from "../../jobs/queues.js";

export async function enrollInCourse(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "published") {
    throw new AppError(404, "Kursus tidak ditemukan.");
  }

  const existing = await prisma.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  if (existing) throw new AppError(409, "Anda sudah terdaftar di kursus ini.");

  // BL-54: this endpoint is the self-service path for FREE courses only. Paid
  // courses are granted by the two settlement paths that write the enrollment
  // themselves — the 100%-off coupon branch in routes/checkout.ts and the DOKU
  // webhook processor — both only after an order exists. Without this guard any
  // authenticated user could POST a paid course id here and receive it for free.
  //
  // Fail closed: a price we cannot parse is treated as paid, never as free.
  const effectivePrice = Number(course.salePrice ?? course.price);
  const isFree = Number.isFinite(effectivePrice) && effectivePrice <= 0;
  if (!isFree) {
    const paidOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: "paid",
        items: { some: { itemType: "course", itemId: courseId } },
      },
      select: { id: true },
    });
    if (!paidOrder) {
      throw new AppError(403, "Kursus ini berbayar. Selesaikan pembayaran terlebih dahulu.");
    }
  }

  return prisma.courseEnrollment.create({
    data: { courseId, userId },
    include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } },
  });
}

export async function getMyEnrollments(userId: string) {
  return prisma.courseEnrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          level: true,
          trainer: { select: { name: true } },
          _count: { select: { sections: true } },
        },
      },
      progress: { select: { isCompleted: true } },
    },
  });
}

export async function getEnrollment(userId: string, courseId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    include: {
      course: {
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true, type: true, duration: true, sortOrder: true, isPreview: true },
              },
            },
          },
        },
      },
      progress: true,
    },
  });
  if (!enrollment) throw new AppError(404, "Enrollment tidak ditemukan.");
  return enrollment;
}

export async function updateLessonProgress(
  userId: string,
  enrollmentId: string,
  lessonId: string,
  watchedPct: number
) {
  const enrollment = await prisma.courseEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.userId !== userId) {
    throw new AppError(404, "Enrollment tidak ditemukan.");
  }

  // Batch8 (progress inflation → free certificates): verify the lesson actually
  // belongs to this enrollment's course (lesson -> section -> courseId). Without
  // this, a student could POST progress for lessons of ANY course and inflate the
  // completion % of a short course they enrolled in, triggering a free certificate.
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: { section: { select: { courseId: true } } },
  });
  if (!lesson || lesson.section.courseId !== enrollment.courseId) {
    throw new AppError(404, "Lesson tidak ditemukan di kursus ini.");
  }

  const isCompleted = watchedPct >= 90;
  const completedAt = isCompleted ? new Date() : null;

  const progress = await prisma.courseLessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    update: { watchedPct, isCompleted, ...(isCompleted ? { completedAt } : {}) },
    create: { enrollmentId, lessonId, watchedPct, isCompleted, ...(isCompleted ? { completedAt } : {}) },
  });

  await recalculateCourseProgress(enrollmentId);
  return progress;
}

export async function recalculateCourseProgress(enrollmentId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        include: { sections: { include: { lessons: { select: { id: true } } } } },
      },
      progress: { select: { isCompleted: true, lessonId: true } },
    },
  });
  if (!enrollment) return;

  const courseLessonIds = new Set(
    enrollment.course.sections.flatMap((s) => s.lessons.map((l) => l.id)),
  );
  if (courseLessonIds.size === 0) return;

  // Find which of these lessons are quizzes
  const quizzes = await prisma.quiz.findMany({
    where: { lessonId: { in: Array.from(courseLessonIds) } },
    select: { lessonId: true },
  });
  const quizLessonIds = new Set(quizzes.map((q) => q.lessonId));

  let totalVideos = 0;
  let totalQuizzes = 0;
  let completedVideos = 0;
  let completedQuizzes = 0;

  for (const lessonId of courseLessonIds) {
    const isQuiz = quizLessonIds.has(lessonId);
    const prog = enrollment.progress.find((p) => p.lessonId === lessonId);
    const isCompleted = prog?.isCompleted ?? false;

    if (isQuiz) {
      totalQuizzes++;
      if (isCompleted) {
        completedQuizzes++;
      }
    } else {
      totalVideos++;
      if (isCompleted) {
        completedVideos++;
      }
    }
  }

  let videoPct = 100;
  let quizPct = 100;

  if (totalVideos > 0) {
    videoPct = (completedVideos / totalVideos) * 100;
  }
  if (totalQuizzes > 0) {
    quizPct = (completedQuizzes / totalQuizzes) * 100;
  }

  let progressPct = 0;
  if (totalVideos > 0 && totalQuizzes > 0) {
    progressPct = Math.round((videoPct * 0.7) + (quizPct * 0.3));
  } else if (totalVideos > 0) {
    progressPct = Math.round(videoPct);
  } else if (totalQuizzes > 0) {
    progressPct = Math.round(quizPct);
  }

  const isCompleted = progressPct >= 80;
  const justCompleted = isCompleted && !enrollment.isCompleted;

  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPct,
      isCompleted,
      ...(justCompleted ? { completedAt: new Date() } : {}),
    },
  });

  if (justCompleted) {
    await enqueueCertificate({ type: "issue", userId: enrollment.userId, courseId: enrollment.courseId });
  }
}
