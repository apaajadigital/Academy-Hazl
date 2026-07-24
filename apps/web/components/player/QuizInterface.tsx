"use client";

import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui";
import { submitQuiz } from "../../lib/api/enrollment";

type Question = {
  id: string;
  question: string;
  options: string[];
  sortOrder: number;
};

type QuizResult = {
  score: number;
  isPassed: boolean;
  passMark: number;
  correct: number;
  total: number;
};

type Props = {
  lessonId: string;
  passMark: number;
  questions: Question[];
  token: string;
  onPassed?: () => void;
};

export default function QuizInterface({ lessonId, passMark, questions, token, onPassed }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!allAnswered) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitQuiz(lessonId, answers, token);
      setResult(res);
      if (res.isPassed) onPassed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="text-center space-y-6 py-8">
        <div
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white ${result.isPassed ? "bg-green-600" : "bg-red-600"}`}
        >
          {Math.round(result.score)}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            {result.isPassed ? (
              <CircleCheck aria-hidden="true" className="w-5 h-5 text-green-600" />
            ) : (
              <CircleX aria-hidden="true" className="w-5 h-5 text-red-600" />
            )}
            <h3 className={`text-xl font-bold ${result.isPassed ? "text-green-700" : "text-red-700"}`}>
              {result.isPassed ? "Selamat, Anda Lulus!" : "Belum Lulus"}
            </h3>
          </div>
          <p className="text-text-secondary text-sm">
            {result.correct} dari {result.total} jawaban benar · Nilai minimum {result.passMark}
          </p>
        </div>

        {!result.isPassed && (
          <Button type="button" variant="cyan" onClick={reset}>
            Coba Lagi
          </Button>
        )}
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const answeredPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Kuis</h2>
          <span className="text-xs text-text-secondary">Nilai minimum: {passMark}</span>
        </div>
        {/* Answered-progress bar (derived from the existing `answers` state — no
            new logic; mirrors the Stitch quiz progress affordance). */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-text-secondary uppercase tracking-wider">Progres</span>
            <span className="text-accent-cyan-strong font-bold">
              {answeredCount}/{questions.length} terjawab
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all duration-500 ease-out"
              style={{ width: `${answeredPct}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-red-600/10 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id} className="space-y-3">
          <p className="font-medium text-text-primary">
            <span className="text-accent-cyan-strong mr-2">{idx + 1}.</span>
            {q.question}
          </p>
          {/* Finding #8b: expose the option set as a radiogroup labelled by the
              question so screen readers tie the choices to their prompt. */}
          <div className="space-y-3" role="radiogroup" aria-label={`${idx + 1}. ${q.question}`}>
            {(q.options as string[]).map((opt, optIdx) => {
              const selected = answers[q.id] === optIdx;
              return (
                <label
                  key={optIdx}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all ${
                    selected
                      ? "border-2 border-accent-cyan-strong bg-surface-accent-soft text-text-primary font-semibold"
                      : "border border-border-default hover:border-accent-cyan-strong hover:bg-surface-sunken text-text-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={optIdx}
                    checked={selected}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                    className="sr-only"
                  />
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? "border-accent-cyan-strong bg-accent-cyan-strong" : "border-border-strong"
                    }`}
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <span className="text-sm">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="cyan"
        onClick={handleSubmit}
        disabled={!allAnswered || loading}
        loading={loading}
        className="w-full"
      >
        {loading ? "Mengirim…" : "Kirim Jawaban"}
      </Button>
    </div>
  );
}
