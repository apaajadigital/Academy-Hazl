import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * modules/trainer/curriculum.ts — 12.5% statements, 0% branches before this file.
 *
 * Two properties matter more than the CRUD itself and are asserted throughout:
 *
 * 1. **Ownership.** Every endpoint resolves the course behind the section or
 *    lesson and re-checks `trainerId`. A section id is guessable; without that
 *    second lookup one trainer could rewrite another's curriculum.
 * 2. **Counter integrity.** `Course.totalLessons` / `totalDuration` are
 *    RE-AGGREGATED from the lesson rows after every mutation, never incremented
 *    in place. A drifting counter is what makes progress percentages lie — the
 *    student roster divides by exactly this number.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findFirst: vi.fn(), update: vi.fn() },
    courseSection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    courseLesson: {
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "trainer-1", email: "trainer@test.com", roles: ["trainer"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { authenticate } = await import("../../../src/middleware/authenticate.js");

const SECTION_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_ID = "22222222-2222-4222-8222-222222222222";

function asRole(roles: string[], id = "trainer-1") {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = { id, email: "u@test.com", roles };
    next();
  });
}

/** The trainer does not own the course behind whatever id was addressed. */
function notOwned() {
  vi.mocked(prisma.course.findFirst).mockResolvedValue(null as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  asRole(["trainer"]);
  vi.mocked(prisma.course.findFirst).mockResolvedValue({ id: "course-1" } as never);
  vi.mocked(prisma.course.update).mockResolvedValue({} as never);
  vi.mocked(prisma.courseSection.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseSection.findUnique).mockResolvedValue({
    id: SECTION_ID,
    courseId: "course-1",
  } as never);
  vi.mocked(prisma.courseSection.aggregate).mockResolvedValue({ _max: { sortOrder: null } } as never);
  vi.mocked(prisma.courseSection.create).mockResolvedValue({ id: SECTION_ID } as never);
  vi.mocked(prisma.courseSection.update).mockResolvedValue({ id: SECTION_ID } as never);
  vi.mocked(prisma.courseSection.delete).mockResolvedValue({} as never);
  vi.mocked(prisma.courseLesson.findUnique).mockResolvedValue({
    id: LESSON_ID,
    section: { courseId: "course-1" },
  } as never);
  vi.mocked(prisma.courseLesson.aggregate).mockResolvedValue({
    _max: { sortOrder: null },
    _count: { id: 3 },
    _sum: { duration: 900 },
  } as never);
  vi.mocked(prisma.courseLesson.create).mockResolvedValue({ id: LESSON_ID } as never);
  vi.mocked(prisma.courseLesson.update).mockResolvedValue({ id: LESSON_ID } as never);
  vi.mocked(prisma.courseLesson.delete).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
});

describe("GET /api/trainer/courses/:courseId/curriculum", () => {
  it("refuses a non-trainer", async () => {
    asRole(["student"]);
    const res = await request(app).get("/api/trainer/courses/course-1/curriculum");
    expect(res.status).toBe(403);
  });

  it("404s a course the trainer does not own", async () => {
    notOwned();
    const res = await request(app).get("/api/trainer/courses/course-1/curriculum");
    expect(res.status).toBe(404);
    expect(prisma.courseSection.findMany).not.toHaveBeenCalled();
  });

  it("returns sections and lessons in author-defined order", async () => {
    vi.mocked(prisma.courseSection.findMany).mockResolvedValue([
      { id: SECTION_ID, title: "Bab 1", lessons: [] },
    ] as never);

    const res = await request(app).get("/api/trainer/courses/course-1/curriculum");

    expect(res.status).toBe(200);
    expect(prisma.courseSection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: "course-1" },
        orderBy: { sortOrder: "asc" },
      }),
    );
    expect(res.body.data[0].title).toBe("Bab 1");
  });
});

describe("Section CRUD", () => {
  it("appends a new section after the current last one", async () => {
    vi.mocked(prisma.courseSection.aggregate).mockResolvedValue({
      _max: { sortOrder: 4 },
    } as never);

    const res = await request(app)
      .post("/api/trainer/courses/course-1/sections")
      .send({ title: "Bab Baru" });

    expect(res.status).toBe(201);
    expect(prisma.courseSection.create).toHaveBeenCalledWith({
      data: { courseId: "course-1", title: "Bab Baru", sortOrder: 5 },
    });
  });

  it("starts at sortOrder 0 for the very first section", async () => {
    await request(app).post("/api/trainer/courses/course-1/sections").send({ title: "Bab 1" });

    expect(prisma.courseSection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 0 }) }),
    );
  });

  it("rejects an empty title at the schema boundary", async () => {
    const res = await request(app)
      .post("/api/trainer/courses/course-1/sections")
      .send({ title: "" });

    expect(res.status).toBe(400);
    expect(prisma.courseSection.create).not.toHaveBeenCalled();
  });

  it("404s creating a section on a course the trainer does not own", async () => {
    notOwned();
    const res = await request(app)
      .post("/api/trainer/courses/course-1/sections")
      .send({ title: "Bab" });
    expect(res.status).toBe(404);
    expect(prisma.courseSection.create).not.toHaveBeenCalled();
  });

  it("renames a section the trainer owns", async () => {
    const res = await request(app)
      .patch(`/api/trainer/sections/${SECTION_ID}`)
      .send({ title: "Judul Baru" });

    expect(res.status).toBe(200);
    expect(prisma.courseSection.update).toHaveBeenCalledWith({
      where: { id: SECTION_ID },
      data: { title: "Judul Baru" },
    });
  });

  it("404s renaming a section that does not exist", async () => {
    vi.mocked(prisma.courseSection.findUnique).mockResolvedValue(null as never);
    const res = await request(app)
      .patch(`/api/trainer/sections/${SECTION_ID}`)
      .send({ title: "X" });
    expect(res.status).toBe(404);
    expect(prisma.courseSection.update).not.toHaveBeenCalled();
  });

  it("re-checks ownership of the course BEHIND the section, not just the section id", async () => {
    notOwned();

    const res = await request(app)
      .patch(`/api/trainer/sections/${SECTION_ID}`)
      .send({ title: "X" });

    expect(res.status).toBe(404);
    // The section was found, the course behind it was not the caller's.
    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: { id: "course-1", trainerId: "trainer-1" },
      select: { id: true },
    });
    expect(prisma.courseSection.update).not.toHaveBeenCalled();
  });

  it("deletes a section the trainer owns", async () => {
    const res = await request(app).delete(`/api/trainer/sections/${SECTION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true });
    expect(prisma.courseSection.delete).toHaveBeenCalledWith({ where: { id: SECTION_ID } });
  });

  it("refuses to delete a section belonging to someone else's course", async () => {
    notOwned();
    const res = await request(app).delete(`/api/trainer/sections/${SECTION_ID}`);
    expect(res.status).toBe(404);
    expect(prisma.courseSection.delete).not.toHaveBeenCalled();
  });
});

describe("Lesson CRUD", () => {
  const validLesson = { title: "Pelajaran 1", type: "video", duration: 300 };

  it("appends the lesson and re-aggregates the course counters", async () => {
    vi.mocked(prisma.courseLesson.aggregate)
      // maxOrder lookup
      .mockResolvedValueOnce({ _max: { sortOrder: 1 } } as never)
      // course stats re-aggregation
      .mockResolvedValueOnce({ _count: { id: 3 }, _sum: { duration: 900 } } as never);

    const res = await request(app)
      .post(`/api/trainer/sections/${SECTION_ID}/lessons`)
      .send(validLesson);

    expect(res.status).toBe(201);
    expect(prisma.courseLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 2 }) }),
    );
    // Counters come from a COUNT over the rows, not from `increment`.
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: { totalLessons: 3, totalDuration: 900 },
    });
  });

  it("treats a null duration sum as zero rather than writing null", async () => {
    vi.mocked(prisma.courseLesson.aggregate)
      .mockResolvedValueOnce({ _max: { sortOrder: null } } as never)
      .mockResolvedValueOnce({ _count: { id: 0 }, _sum: { duration: null } } as never);

    await request(app).post(`/api/trainer/sections/${SECTION_ID}/lessons`).send(validLesson);

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: { totalLessons: 0, totalDuration: 0 },
    });
  });

  it("normalises omitted content fields to null", async () => {
    await request(app)
      .post(`/api/trainer/sections/${SECTION_ID}/lessons`)
      .send({ title: "P", type: "text" });

    expect(prisma.courseLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentUrl: null,
          contentText: null,
          duration: 0,
          isPreview: false,
        }),
      }),
    );
  });

  it("rejects an unknown lesson type", async () => {
    const res = await request(app)
      .post(`/api/trainer/sections/${SECTION_ID}/lessons`)
      .send({ title: "P", type: "webinar" });

    expect(res.status).toBe(400);
    expect(prisma.courseLesson.create).not.toHaveBeenCalled();
  });

  it("rejects a contentUrl that is not a URL", async () => {
    const res = await request(app)
      .post(`/api/trainer/sections/${SECTION_ID}/lessons`)
      .send({ title: "P", type: "video", contentUrl: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("404s adding a lesson to a section that does not exist", async () => {
    vi.mocked(prisma.courseSection.findUnique).mockResolvedValue(null as never);
    const res = await request(app)
      .post(`/api/trainer/sections/${SECTION_ID}/lessons`)
      .send(validLesson);
    expect(res.status).toBe(404);
  });

  it("updates a lesson without touching counters when duration is unchanged", async () => {
    const res = await request(app)
      .patch(`/api/trainer/lessons/${LESSON_ID}`)
      .send({ title: "Judul Baru" });

    expect(res.status).toBe(200);
    // No duration in the payload → no re-aggregation, no course write.
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it("re-aggregates totalDuration when the duration changes", async () => {
    vi.mocked(prisma.courseLesson.aggregate).mockResolvedValue({
      _sum: { duration: 1200 },
    } as never);

    const res = await request(app)
      .patch(`/api/trainer/lessons/${LESSON_ID}`)
      .send({ duration: 600 });

    expect(res.status).toBe(200);
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: { totalDuration: 1200 },
    });
  });

  it("re-aggregates even when the new duration is 0 — a falsy value is still a change", async () => {
    vi.mocked(prisma.courseLesson.aggregate).mockResolvedValue({
      _sum: { duration: 0 },
    } as never);

    await request(app).patch(`/api/trainer/lessons/${LESSON_ID}`).send({ duration: 0 });

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: { totalDuration: 0 },
    });
  });

  it("404s updating a lesson that does not exist", async () => {
    vi.mocked(prisma.courseLesson.findUnique).mockResolvedValue(null as never);
    const res = await request(app).patch(`/api/trainer/lessons/${LESSON_ID}`).send({ title: "X" });
    expect(res.status).toBe(404);
    expect(prisma.courseLesson.update).not.toHaveBeenCalled();
  });

  it("re-checks ownership through the lesson's section", async () => {
    notOwned();
    const res = await request(app).patch(`/api/trainer/lessons/${LESSON_ID}`).send({ title: "X" });
    expect(res.status).toBe(404);
    expect(prisma.courseLesson.update).not.toHaveBeenCalled();
  });

  it("deletes a lesson and re-aggregates both counters downward", async () => {
    vi.mocked(prisma.courseLesson.aggregate).mockResolvedValue({
      _count: { id: 2 },
      _sum: { duration: 600 },
    } as never);

    const res = await request(app).delete(`/api/trainer/lessons/${LESSON_ID}`);

    expect(res.status).toBe(200);
    expect(prisma.courseLesson.delete).toHaveBeenCalledWith({ where: { id: LESSON_ID } });
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: { totalLessons: 2, totalDuration: 600 },
    });
  });

  it("404s deleting a lesson that does not exist", async () => {
    vi.mocked(prisma.courseLesson.findUnique).mockResolvedValue(null as never);
    const res = await request(app).delete(`/api/trainer/lessons/${LESSON_ID}`);
    expect(res.status).toBe(404);
    expect(prisma.courseLesson.delete).not.toHaveBeenCalled();
  });
});

describe("Reorder", () => {
  it("writes each section's new position scoped to the course", async () => {
    const other = "33333333-3333-4333-8333-333333333333";

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/reorder-sections")
      .send({ sectionIds: [other, SECTION_ID] });

    expect(res.status).toBe(200);
    // courseId in the predicate is what stops a foreign section id from being
    // dragged into this course's ordering.
    expect(prisma.courseSection.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: other, courseId: "course-1" },
      data: { sortOrder: 0 },
    });
    expect(prisma.courseSection.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: SECTION_ID, courseId: "course-1" },
      data: { sortOrder: 1 },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects a non-uuid section id", async () => {
    const res = await request(app)
      .patch("/api/trainer/courses/course-1/reorder-sections")
      .send({ sectionIds: ["not-a-uuid"] });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty reorder list", async () => {
    const res = await request(app)
      .patch("/api/trainer/courses/course-1/reorder-sections")
      .send({ sectionIds: [] });

    expect(res.status).toBe(400);
  });

  it("404s reordering sections of a course the trainer does not own", async () => {
    notOwned();
    const res = await request(app)
      .patch("/api/trainer/courses/course-1/reorder-sections")
      .send({ sectionIds: [SECTION_ID] });
    expect(res.status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("writes each lesson's new position scoped to the section", async () => {
    const other = "44444444-4444-4444-8444-444444444444";

    const res = await request(app)
      .patch(`/api/trainer/sections/${SECTION_ID}/reorder-lessons`)
      .send({ lessonIds: [other, LESSON_ID] });

    expect(res.status).toBe(200);
    expect(prisma.courseLesson.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: other, sectionId: SECTION_ID },
      data: { sortOrder: 0 },
    });
    expect(prisma.courseLesson.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: LESSON_ID, sectionId: SECTION_ID },
      data: { sortOrder: 1 },
    });
  });

  it("404s reordering lessons of a section that does not exist", async () => {
    vi.mocked(prisma.courseSection.findUnique).mockResolvedValue(null as never);
    const res = await request(app)
      .patch(`/api/trainer/sections/${SECTION_ID}/reorder-lessons`)
      .send({ lessonIds: [LESSON_ID] });
    expect(res.status).toBe(404);
  });

  it("refuses a non-trainer on every reorder route", async () => {
    asRole(["student"]);

    const sections = await request(app)
      .patch("/api/trainer/courses/course-1/reorder-sections")
      .send({ sectionIds: [SECTION_ID] });
    const lessons = await request(app)
      .patch(`/api/trainer/sections/${SECTION_ID}/reorder-lessons`)
      .send({ lessonIds: [LESSON_ID] });

    expect(sections.status).toBe(403);
    expect(lessons.status).toBe(403);
  });
});
