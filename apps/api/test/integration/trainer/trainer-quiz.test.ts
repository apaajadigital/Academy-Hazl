import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * modules/trainer/quiz.ts — 11.6% statements, 0% branches before this file.
 *
 * The per-type answer validation is the interesting part and was entirely
 * unexercised: `validateAnswer` is a seven-way switch reached only through the
 * routes, so every branch of it was dead as far as the suite was concerned. A
 * quiz whose stored answer has the wrong SHAPE for its type does not fail
 * loudly — it grades every student attempt wrong, silently.
 *
 * The other property under test is the ownership chain, which is four hops long
 * here: question → quiz → lesson → section → course → trainerId. Every write
 * endpoint must walk it, because question and quiz ids are guessable.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    courseLesson: { findUnique: vi.fn() },
    quiz: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    quizQuestion: {
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

const LESSON_ID = "lesson-1";
const QUIZ_ID = "quiz-1";
const QUESTION_ID = "question-1";

function asRole(roles: string[], id = "trainer-1") {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = { id, email: "u@test.com", roles };
    next();
  });
}

/** The lesson exists but hangs off a course owned by someone else. */
function ownedByAnotherTrainer() {
  vi.mocked(prisma.courseLesson.findUnique).mockResolvedValue({
    id: LESSON_ID,
    section: { courseId: "course-1", course: { trainerId: "trainer-999" } },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  asRole(["trainer"]);
  vi.mocked(prisma.courseLesson.findUnique).mockResolvedValue({
    id: LESSON_ID,
    section: { courseId: "course-1", course: { trainerId: "trainer-1" } },
  } as never);
  vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null as never);
  vi.mocked(prisma.quiz.create).mockResolvedValue({ id: QUIZ_ID, questions: [] } as never);
  vi.mocked(prisma.quiz.update).mockResolvedValue({ id: QUIZ_ID } as never);
  vi.mocked(prisma.quiz.delete).mockResolvedValue({} as never);
  vi.mocked(prisma.quizQuestion.findUnique).mockResolvedValue({
    id: QUESTION_ID,
    type: "multiple_choice",
    answer: 0,
    options: ["a", "b"],
    quiz: { lessonId: LESSON_ID },
  } as never);
  vi.mocked(prisma.quizQuestion.aggregate).mockResolvedValue({ _max: { sortOrder: null } } as never);
  vi.mocked(prisma.quizQuestion.create).mockResolvedValue({ id: QUESTION_ID } as never);
  vi.mocked(prisma.quizQuestion.update).mockResolvedValue({ id: QUESTION_ID } as never);
  vi.mocked(prisma.quizQuestion.delete).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
});

const mc = { question: "1+1?", type: "multiple_choice", options: ["1", "2"], answer: 1 };

describe("GET /api/trainer/lessons/:lessonId/quiz", () => {
  it("refuses a non-trainer", async () => {
    asRole(["student"]);
    const res = await request(app).get(`/api/trainer/lessons/${LESSON_ID}/quiz`);
    expect(res.status).toBe(403);
  });

  it("404s a lesson owned by a different trainer", async () => {
    ownedByAnotherTrainer();
    const res = await request(app).get(`/api/trainer/lessons/${LESSON_ID}/quiz`);
    expect(res.status).toBe(404);
    expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
  });

  it("404s a lesson that does not exist", async () => {
    vi.mocked(prisma.courseLesson.findUnique).mockResolvedValue(null as never);
    const res = await request(app).get(`/api/trainer/lessons/${LESSON_ID}/quiz`);
    expect(res.status).toBe(404);
  });

  it("returns questions in author order", async () => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: QUIZ_ID,
      passMark: 70,
      questions: [{ id: QUESTION_ID }],
    } as never);

    const res = await request(app).get(`/api/trainer/lessons/${LESSON_ID}/quiz`);

    expect(res.status).toBe(200);
    expect(prisma.quiz.findUnique).toHaveBeenCalledWith({
      where: { lessonId: LESSON_ID },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
  });

  it("returns null rather than 404 when the lesson simply has no quiz yet", async () => {
    const res = await request(app).get(`/api/trainer/lessons/${LESSON_ID}/quiz`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe("POST /api/trainer/lessons/:lessonId/quiz", () => {
  it("creates the quiz with questions numbered in submission order", async () => {
    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({ passMark: 80, questions: [mc, { ...mc, question: "2+2?" }] });

    expect(res.status).toBe(201);
    const arg = vi.mocked(prisma.quiz.create).mock.calls[0]![0] as unknown as {
      data: { passMark: number; questions: { create: Array<{ sortOrder: number }> } };
    };
    expect(arg.data.passMark).toBe(80);
    expect(arg.data.questions.create.map((q) => q.sortOrder)).toEqual([0, 1]);
  });

  it("defaults passMark to 70", async () => {
    await request(app).post(`/api/trainer/lessons/${LESSON_ID}/quiz`).send({ questions: [mc] });

    expect(prisma.quiz.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passMark: 70 }) }),
    );
  });

  it("409s when the lesson already has a quiz", async () => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ id: QUIZ_ID } as never);

    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({ questions: [mc] });

    expect(res.status).toBe(409);
    expect(prisma.quiz.create).not.toHaveBeenCalled();
  });

  it("rejects a quiz with no questions", async () => {
    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({ questions: [] });

    expect(res.status).toBe(400);
  });

  it("rejects more than 50 questions", async () => {
    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({ questions: Array.from({ length: 51 }, () => mc) });

    expect(res.status).toBe(400);
  });

  it("rejects a passMark above 100", async () => {
    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({ passMark: 101, questions: [mc] });

    expect(res.status).toBe(400);
  });

  it("404s for a lesson owned by another trainer, before writing anything", async () => {
    ownedByAnotherTrainer();

    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({ questions: [mc] });

    expect(res.status).toBe(404);
    expect(prisma.quiz.create).not.toHaveBeenCalled();
  });

  it("validates linear_scale settings when they are supplied", async () => {
    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({
        questions: [
          {
            question: "Seberapa puas?",
            type: "linear_scale",
            answer: null,
            // max 11 is out of the documented 2..10 range.
            settings: { min: 1, max: 11 },
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(prisma.quiz.create).not.toHaveBeenCalled();
  });

  it("accepts linear_scale settings inside the documented range", async () => {
    const res = await request(app)
      .post(`/api/trainer/lessons/${LESSON_ID}/quiz`)
      .send({
        questions: [
          {
            question: "Seberapa puas?",
            type: "linear_scale",
            answer: null,
            settings: { min: 1, max: 5, minLabel: "Buruk", maxLabel: "Baik" },
          },
        ],
      });

    expect(res.status).toBe(201);
  });
});

/**
 * The answer SHAPE per question type. A mismatch here does not crash: it stores
 * a quiz that grades every attempt wrong. Each type is asserted in both
 * directions so the switch cannot silently collapse to a default.
 */
describe("answer validation per question type", () => {
  const post = (question: Record<string, unknown>) =>
    request(app).post(`/api/trainer/lessons/${LESSON_ID}/quiz`).send({ questions: [question] });

  const cases: Array<{ type: string; ok: unknown[]; bad: unknown[] }> = [
    { type: "multiple_choice", ok: [0, 3], bad: ["1", -1, 1.5, null] },
    { type: "dropdown", ok: [0, 2], bad: ["a", -1, null] },
    { type: "true_false", ok: [0, 1], bad: [2, -1, "true", null] },
    { type: "checkboxes", ok: [[0], [0, 2], []], bad: [0, ["a"], [-1], [1.5]] },
    { type: "short_answer", ok: ["jakarta", ["jakarta", "jkt"], []], bad: [0, [1], null] },
    { type: "paragraph", ok: [null], bad: [0, "text", []] },
    { type: "linear_scale", ok: [null, 3], bad: ["3", 2.5, []] },
  ];

  for (const c of cases) {
    for (const [i, answer] of c.ok.entries()) {
      it(`accepts ${c.type} answer #${i}`, async () => {
        const res = await post({ question: "Q", type: c.type, options: [], answer });
        expect(res.status).toBe(201);
      });
    }
    for (const [i, answer] of c.bad.entries()) {
      it(`rejects ${c.type} answer #${i}`, async () => {
        const res = await post({ question: "Q", type: c.type, options: [], answer });
        expect(res.status).toBe(400);
        expect(prisma.quiz.create).not.toHaveBeenCalled();
      });
    }
  }

  it("rejects a type outside the seven documented ones", async () => {
    const res = await post({ question: "Q", type: "essay_graded_by_ai", answer: 0 });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/trainer/quizzes/:quizId", () => {
  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ lessonId: LESSON_ID } as never);
  });

  it("updates the pass mark", async () => {
    const res = await request(app).patch(`/api/trainer/quizzes/${QUIZ_ID}`).send({ passMark: 90 });

    expect(res.status).toBe(200);
    expect(prisma.quiz.update).toHaveBeenCalledWith({
      where: { id: QUIZ_ID },
      data: { passMark: 90 },
    });
  });

  it("404s an unknown quiz", async () => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null as never);
    const res = await request(app).patch(`/api/trainer/quizzes/${QUIZ_ID}`).send({ passMark: 90 });
    expect(res.status).toBe(404);
    expect(prisma.quiz.update).not.toHaveBeenCalled();
  });

  it("walks the chain to the course owner and 404s a foreign quiz", async () => {
    ownedByAnotherTrainer();
    const res = await request(app).patch(`/api/trainer/quizzes/${QUIZ_ID}`).send({ passMark: 90 });
    expect(res.status).toBe(404);
    expect(prisma.quiz.update).not.toHaveBeenCalled();
  });

  it("rejects a pass mark outside 0..100", async () => {
    const res = await request(app).patch(`/api/trainer/quizzes/${QUIZ_ID}`).send({ passMark: -1 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/trainer/quizzes/:quizId", () => {
  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ lessonId: LESSON_ID } as never);
  });

  it("deletes a quiz the trainer owns", async () => {
    const res = await request(app).delete(`/api/trainer/quizzes/${QUIZ_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true });
    expect(prisma.quiz.delete).toHaveBeenCalledWith({ where: { id: QUIZ_ID } });
  });

  it("404s a foreign quiz without deleting", async () => {
    ownedByAnotherTrainer();
    const res = await request(app).delete(`/api/trainer/quizzes/${QUIZ_ID}`);
    expect(res.status).toBe(404);
    expect(prisma.quiz.delete).not.toHaveBeenCalled();
  });
});

describe("POST /api/trainer/quizzes/:quizId/questions", () => {
  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ lessonId: LESSON_ID } as never);
  });

  it("appends after the current last question", async () => {
    vi.mocked(prisma.quizQuestion.aggregate).mockResolvedValue({
      _max: { sortOrder: 6 },
    } as never);

    const res = await request(app).post(`/api/trainer/quizzes/${QUIZ_ID}/questions`).send(mc);

    expect(res.status).toBe(201);
    expect(prisma.quizQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 7 }) }),
    );
  });

  it("starts at 0 for the first question", async () => {
    await request(app).post(`/api/trainer/quizzes/${QUIZ_ID}/questions`).send(mc);

    expect(prisma.quizQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 0 }) }),
    );
  });

  it("rejects an answer that does not match the type", async () => {
    const res = await request(app)
      .post(`/api/trainer/quizzes/${QUIZ_ID}/questions`)
      .send({ question: "Q", type: "true_false", answer: 7 });

    expect(res.status).toBe(400);
    expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
  });

  it("404s a foreign quiz", async () => {
    ownedByAnotherTrainer();
    const res = await request(app).post(`/api/trainer/quizzes/${QUIZ_ID}/questions`).send(mc);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trainer/questions/:questionId", () => {
  it("applies only the fields that were sent", async () => {
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ question: "Pertanyaan baru" });

    expect(res.status).toBe(200);
    // A partial update must not blank out type/options/answer by writing undefined.
    expect(prisma.quizQuestion.update).toHaveBeenCalledWith({
      where: { id: QUESTION_ID },
      data: { question: "Pertanyaan baru" },
    });
  });

  it("validates the NEW answer against the EXISTING type when only the answer changes", async () => {
    // Stored type is multiple_choice; a string answer is invalid for it.
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ answer: "dua" });

    expect(res.status).toBe(400);
    expect(prisma.quizQuestion.update).not.toHaveBeenCalled();
  });

  it("validates the EXISTING answer against the NEW type when only the type changes", async () => {
    // Stored answer is 0, which is not a valid paragraph answer (must be null).
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ type: "paragraph" });

    expect(res.status).toBe(400);
  });

  it("accepts a coherent type + answer change made together", async () => {
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ type: "short_answer", answer: "jakarta" });

    expect(res.status).toBe(200);
    expect(prisma.quizQuestion.update).toHaveBeenCalledWith({
      where: { id: QUESTION_ID },
      data: { type: "short_answer", answer: "jakarta" },
    });
  });

  it("skips answer validation entirely when neither type nor answer is touched", async () => {
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ required: false });

    expect(res.status).toBe(200);
    expect(prisma.quizQuestion.update).toHaveBeenCalledWith({
      where: { id: QUESTION_ID },
      data: { required: false },
    });
  });

  it("404s an unknown question", async () => {
    vi.mocked(prisma.quizQuestion.findUnique).mockResolvedValue(null as never);
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ question: "X" });
    expect(res.status).toBe(404);
  });

  it("404s a question whose course belongs to another trainer", async () => {
    ownedByAnotherTrainer();
    const res = await request(app)
      .patch(`/api/trainer/questions/${QUESTION_ID}`)
      .send({ question: "X" });
    expect(res.status).toBe(404);
    expect(prisma.quizQuestion.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/trainer/questions/:questionId", () => {
  it("deletes a question the trainer owns", async () => {
    const res = await request(app).delete(`/api/trainer/questions/${QUESTION_ID}`);

    expect(res.status).toBe(200);
    expect(prisma.quizQuestion.delete).toHaveBeenCalledWith({ where: { id: QUESTION_ID } });
  });

  it("404s an unknown question", async () => {
    vi.mocked(prisma.quizQuestion.findUnique).mockResolvedValue(null as never);
    const res = await request(app).delete(`/api/trainer/questions/${QUESTION_ID}`);
    expect(res.status).toBe(404);
    expect(prisma.quizQuestion.delete).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/trainer/quizzes/:quizId/reorder", () => {
  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ lessonId: LESSON_ID } as never);
  });

  it("writes each new position scoped to the quiz", async () => {
    const res = await request(app)
      .patch(`/api/trainer/quizzes/${QUIZ_ID}/reorder`)
      .send({ questionIds: ["q-b", "q-a"] });

    expect(res.status).toBe(200);
    expect(prisma.quizQuestion.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "q-b", quizId: QUIZ_ID },
      data: { sortOrder: 0 },
    });
    expect(prisma.quizQuestion.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "q-a", quizId: QUIZ_ID },
      data: { sortOrder: 1 },
    });
  });

  it("rejects an empty list", async () => {
    const res = await request(app)
      .patch(`/api/trainer/quizzes/${QUIZ_ID}/reorder`)
      .send({ questionIds: [] });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("404s a foreign quiz", async () => {
    ownedByAnotherTrainer();
    const res = await request(app)
      .patch(`/api/trainer/quizzes/${QUIZ_ID}/reorder`)
      .send({ questionIds: ["q-a"] });
    expect(res.status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
