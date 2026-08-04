"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Copy,
  GripVertical,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Type,
  AlignLeft,
  ToggleLeft,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Textarea,
  Badge,
  PageHeader,
  EmptyState,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionType =
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "short_answer"
  | "paragraph"
  | "true_false"
  | "linear_scale";

type Question = {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  answer: unknown;
  required: boolean;
  settings: Record<string, unknown> | null;
  sortOrder: number;
};

type Quiz = {
  id: string;
  lessonId: string;
  passMark: number;
  questions: Question[];
};

const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; icon: typeof CircleDot; description: string }
> = {
  multiple_choice: { label: "Pilihan Ganda", icon: CircleDot, description: "Satu jawaban dari beberapa opsi" },
  checkboxes: { label: "Kotak Centang", icon: CheckSquare, description: "Beberapa jawaban bisa dipilih" },
  dropdown: { label: "Dropdown", icon: ChevronDown, description: "Pilih satu dari daftar" },
  short_answer: { label: "Jawaban Singkat", icon: Type, description: "Input teks satu baris" },
  paragraph: { label: "Paragraf", icon: AlignLeft, description: "Teks panjang (essay)" },
  true_false: { label: "Benar / Salah", icon: ToggleLeft, description: "Dua pilihan saja" },
  linear_scale: { label: "Skala Linear", icon: SlidersHorizontal, description: "Skala numerik (misal 1-5)" },
};

const ALL_TYPES = Object.keys(QUESTION_TYPE_META) as QuestionType[];

// ── Defaults per type ────────────────────────────────────────────────────────

function getDefaultForType(type: QuestionType): {
  options: string[];
  answer: unknown;
  settings: Record<string, unknown> | null;
} {
  switch (type) {
    case "multiple_choice":
      return { options: ["Opsi 1", "Opsi 2"], answer: 0, settings: null };
    case "checkboxes":
      return { options: ["Opsi 1", "Opsi 2"], answer: [0], settings: null };
    case "dropdown":
      return { options: ["Opsi 1", "Opsi 2"], answer: 0, settings: null };
    case "short_answer":
      return { options: [], answer: "", settings: null };
    case "paragraph":
      return { options: [], answer: null, settings: null };
    case "true_false":
      return { options: ["Benar", "Salah"], answer: 0, settings: null };
    case "linear_scale":
      return { options: [], answer: null, settings: { min: 1, max: 5, minLabel: "", maxLabel: "" } };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QuizBuilderPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passMark, setPassMark] = useState(70);
  const [previewMode, setPreviewMode] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    try {
      const r = await fetch(`/api/trainer/lessons/${lessonId}/quiz`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        setQuiz(d.data);
        if (d.data?.passMark) setPassMark(d.data.passMark);
      } else {
        setError(d.error?.message ?? "Gagal memuat quiz.");
      }
    } catch {
      setError("Gagal memuat quiz.");
    } finally {
      setLoading(false);
    }
  }, [lessonId, router]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  // ── API helpers ──────────────────────────────────────────────────────────

  async function apiCall(url: string, method: string, body?: unknown) {
    const token = await getValidToken();
    if (!token) return null;
    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return r.json();
  }

  async function handleCreateQuiz() {
    const defaults = getDefaultForType("multiple_choice");
    const d = await apiCall(`/api/trainer/lessons/${lessonId}/quiz`, "POST", {
      passMark,
      questions: [{
        question: "Pertanyaan baru",
        type: "multiple_choice",
        ...defaults,
        required: true,
      }],
    });
    if (d?.success) loadQuiz();
    else alert(d?.error?.message ?? "Gagal membuat quiz.");
  }

  async function handleAddQuestion(type: QuestionType) {
    if (!quiz) return;
    const defaults = getDefaultForType(type);
    const d = await apiCall(`/api/trainer/quizzes/${quiz.id}/questions`, "POST", {
      question: "",
      type,
      ...defaults,
      required: true,
    });
    if (d?.success) {
      loadQuiz();
      setEditingId(d.data.id);
    } else {
      alert(d?.error?.message ?? "Gagal menambah pertanyaan.");
    }
  }

  async function handleUpdateQuestion(questionId: string, data: Partial<Question>) {
    const d = await apiCall(`/api/trainer/questions/${questionId}`, "PATCH", data);
    if (d?.success) loadQuiz();
    else alert(d?.error?.message ?? "Gagal mengubah pertanyaan.");
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Hapus pertanyaan ini?")) return;
    const d = await apiCall(`/api/trainer/questions/${questionId}`, "DELETE");
    if (d?.success) loadQuiz();
    else alert(d?.error?.message ?? "Gagal menghapus pertanyaan.");
  }

  async function handleDuplicateQuestion(q: Question) {
    if (!quiz) return;
    const d = await apiCall(`/api/trainer/quizzes/${quiz.id}/questions`, "POST", {
      question: q.question + " (salinan)",
      type: q.type,
      options: q.options,
      answer: q.answer,
      required: q.required,
      settings: q.settings,
    });
    if (d?.success) loadQuiz();
  }

  async function handleDeleteQuiz() {
    if (!confirm("Hapus seluruh quiz beserta semua pertanyaannya?")) return;
    if (!quiz) return;
    const d = await apiCall(`/api/trainer/quizzes/${quiz.id}`, "DELETE");
    if (d?.success) { setQuiz(null); loadQuiz(); }
    else alert(d?.error?.message ?? "Gagal menghapus quiz.");
  }

  async function handleUpdatePassMark() {
    if (!quiz) return;
    const d = await apiCall(`/api/trainer/quizzes/${quiz.id}`, "PATCH", { passMark });
    if (d?.success) alert("Batas lulus diperbarui.");
    else alert(d?.error?.message ?? "Gagal mengubah batas lulus.");
  }

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) return <div className="dash-container"><DashboardLoading /></div>;
  if (error) return <div className="dash-container"><DashboardError message={error} onRetry={loadQuiz} /></div>;

  // ── No quiz yet ──────────────────────────────────────────────────────────

  if (!quiz) {
    return (
      <div className="dash-container flex flex-col gap-8">
        <PageHeader
          breadcrumb={
            <span className="flex flex-wrap items-center gap-2">
              <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
              <span>/</span>
              <Link href={`/trainer-hub/kursus/${courseId}/kurikulum`} className="text-accent-cyan-strong hover:underline">Kurikulum</Link>
              <span>/</span>
              <span className="font-medium text-text-primary">Buat Quiz</span>
            </span>
          }
          title="Buat Quiz Baru"
        />
        <Card className="p-6 rounded-[var(--radius-card)] space-y-4">
          <Input
            label="Batas Lulus (%)"
            type="number"
            min={0} max={100}
            value={String(passMark)}
            onChange={(e) => setPassMark(parseInt(e.target.value) || 0)}
            hint="Persentase minimum jawaban benar agar siswa lulus."
          />
          <Button variant="cyan" onClick={handleCreateQuiz} leftIcon={<Plus size={16} />}>
            Buat Quiz
          </Button>
        </Card>
      </div>
    );
  }

  // ── Main quiz builder ──────────────────────────────────────────────────

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        breadcrumb={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span>/</span>
            <Link href={`/trainer-hub/kursus/${courseId}/kurikulum`} className="text-accent-cyan-strong hover:underline">Kurikulum</Link>
            <span>/</span>
            <span className="font-medium text-text-primary">Quiz Builder</span>
          </span>
        }
        title="Quiz Builder"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={previewMode ? "cyan" : "secondary"}
              onClick={() => setPreviewMode(!previewMode)}
              leftIcon={<Eye size={14} />}
            >
              {previewMode ? "Mode Edit" : "Preview"}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDeleteQuiz} className="text-red-500">
              <Trash2 size={14} className="mr-1" /> Hapus Quiz
            </Button>
          </div>
        }
      />

      {/* Pass mark */}
      <Card className="p-4 rounded-[var(--radius-card)] bg-surface-sunken">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Input
              label="Batas Lulus (%)"
              type="number" min={0} max={100}
              value={String(passMark)}
              onChange={(e) => setPassMark(parseInt(e.target.value) || 0)}
            />
          </div>
          <Button size="sm" variant="cyan" onClick={handleUpdatePassMark}>Simpan</Button>
          <p className="text-xs text-text-muted">
            {quiz.questions.length} pertanyaan · Siswa harus benar ≥ {passMark}%
          </p>
        </div>
      </Card>

      {/* Question list */}
      {quiz.questions.length === 0 && (
        <EmptyState icon={HelpCircle} title="Belum ada pertanyaan" description="Tambahkan pertanyaan pertama." />
      )}

      {quiz.questions.map((q, idx) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={idx}
          isEditing={editingId === q.id}
          previewMode={previewMode}
          onStartEdit={() => setEditingId(q.id)}
          onStopEdit={() => setEditingId(null)}
          onUpdate={(data) => handleUpdateQuestion(q.id, data)}
          onDelete={() => handleDeleteQuestion(q.id)}
          onDuplicate={() => handleDuplicateQuestion(q)}
        />
      ))}

      {/* Add question toolbar */}
      {!previewMode && (
        <Card className="p-4 rounded-[var(--radius-card)]">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Tambah Pertanyaan</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const meta = QUESTION_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddQuestion(type)}
                  className="flex items-center gap-2 rounded-xl border border-border-default bg-white px-3 py-2 text-xs font-medium text-text-primary transition-all hover:border-accent-cyan-strong hover:bg-surface-accent-soft hover:shadow-e1"
                  title={meta.description}
                >
                  <Icon size={14} className="text-accent-cyan-strong" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({
  question: q,
  index,
  isEditing,
  previewMode,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  index: number;
  isEditing: boolean;
  previewMode: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (data: Partial<Question>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [localQ, setLocalQ] = useState(q.question);
  const [localOpts, setLocalOpts] = useState<string[]>(q.options ?? []);
  const [localAnswer, setLocalAnswer] = useState<unknown>(q.answer);
  const [localType, setLocalType] = useState<QuestionType>(q.type);
  const [localRequired, setLocalRequired] = useState(q.required);
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>(q.settings ?? {});

  // Sync when parent data changes
  useEffect(() => {
    setLocalQ(q.question);
    setLocalOpts(q.options ?? []);
    setLocalAnswer(q.answer);
    setLocalType(q.type);
    setLocalRequired(q.required);
    setLocalSettings(q.settings ?? {});
  }, [q]);

  function handleTypeChange(newType: QuestionType) {
    const defaults = getDefaultForType(newType);
    setLocalType(newType);
    setLocalOpts(defaults.options);
    setLocalAnswer(defaults.answer);
    setLocalSettings(defaults.settings ?? {});
  }

  function handleSave() {
    onUpdate({
      question: localQ,
      type: localType,
      options: localOpts,
      answer: localAnswer,
      required: localRequired,
      settings: Object.keys(localSettings).length > 0 ? localSettings : null,
    });
    onStopEdit();
  }

  const meta = QUESTION_TYPE_META[q.type];
  const TypeIcon = meta?.icon ?? HelpCircle;

  // ── Preview mode ─────────────────────────────────────────────────────

  if (previewMode) {
    return (
      <Card className="p-5 rounded-[var(--radius-card)]">
        <p className="text-sm font-semibold text-text-primary mb-3">
          {index + 1}. {q.question || <span className="italic text-text-muted">Pertanyaan belum diisi</span>}
          {q.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        {renderPreview(q)}
      </Card>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <Card className="rounded-[var(--radius-card)] border-2 border-accent-cyan-strong/30 shadow-e2 overflow-hidden">
        {/* Type selector bar */}
        <div className="flex items-center gap-2 px-5 py-3 bg-surface-sunken border-b border-border-default">
          <GripVertical size={14} className="text-text-muted" />
          <span className="text-xs text-text-muted font-mono">#{index + 1}</span>
          <select
            value={localType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="rounded-lg border border-border-default bg-white px-2 py-1 text-xs font-medium"
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{QUESTION_TYPE_META[t].label}</option>
            ))}
          </select>
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={localRequired}
              onChange={(e) => setLocalRequired(e.target.checked)}
              className="rounded accent-accent-cyan-strong"
            />
            Wajib
          </label>
        </div>

        <div className="p-5 space-y-4">
          {/* Question text */}
          <Textarea
            label="Pertanyaan"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Tulis pertanyaan di sini..."
            rows={2}
          />

          {/* Type-specific editor */}
          {renderEditor(localType, localOpts, setLocalOpts, localAnswer, setLocalAnswer, localSettings, setLocalSettings)}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border-default">
            <div className="flex gap-2">
              <Button size="sm" variant="cyan" onClick={handleSave} leftIcon={<Save size={14} />}>
                Simpan
              </Button>
              <Button size="sm" variant="secondary" onClick={onStopEdit}>
                Batal
              </Button>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={onDuplicate} className="p-2 rounded-lg text-text-muted hover:text-accent-cyan-strong transition-colors" title="Duplikat">
                <Copy size={14} />
              </button>
              <button type="button" onClick={onDelete} className="p-2 rounded-lg text-text-muted hover:text-red-500 transition-colors" title="Hapus">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── Read-only card (click to edit) ───────────────────────────────────

  return (
    <Card
      className="rounded-[var(--radius-card)] cursor-pointer transition-all hover:border-accent-cyan-strong/30 hover:shadow-e2"
      onClick={onStartEdit}
    >
      <div className="flex items-start gap-3 px-5 py-4">
        <GripVertical size={14} className="mt-1 text-text-muted cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-muted font-mono">#{index + 1}</span>
            <Badge variant="neutral">
              <TypeIcon size={10} className="mr-1" />
              {meta?.label ?? q.type}
            </Badge>
            {q.required && <Badge variant="danger">Wajib</Badge>}
          </div>
          <p className="text-sm font-medium text-text-primary">
            {q.question || <span className="italic text-text-muted">Pertanyaan belum diisi</span>}
          </p>
          {(q.type === "multiple_choice" || q.type === "checkboxes" || q.type === "dropdown") && q.options.length > 0 && (
            <div className="mt-2 space-y-1">
              {q.options.slice(0, 4).map((opt, i) => {
                const isCorrect = q.type === "checkboxes"
                  ? Array.isArray(q.answer) && (q.answer as number[]).includes(i)
                  : q.answer === i;
                return (
                  <div key={i} className={`text-xs px-2 py-1 rounded ${isCorrect ? "bg-green-50 text-green-700" : "text-text-secondary"}`}>
                    {String.fromCharCode(65 + i)}. {opt} {isCorrect && <CheckCircle2 size={10} className="inline ml-1" />}
                  </div>
                );
              })}
              {q.options.length > 4 && <p className="text-xs text-text-muted">+{q.options.length - 4} lagi...</p>}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1.5 rounded-lg text-text-muted hover:text-accent-cyan-strong transition-colors">
            <Copy size={14} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Type-specific Editor ─────────────────────────────────────────────────────

function renderEditor(
  type: QuestionType,
  options: string[],
  setOptions: (o: string[]) => void,
  answer: unknown,
  setAnswer: (a: unknown) => void,
  settings: Record<string, unknown>,
  setSettings: (s: Record<string, unknown>) => void,
) {
  switch (type) {
    case "multiple_choice":
    case "dropdown":
      return (
        <OptionsEditor
          options={options}
          setOptions={setOptions}
          answer={answer as number}
          setAnswer={setAnswer}
          selectorType="radio"
          label={type === "dropdown" ? "Opsi Dropdown" : "Opsi Jawaban"}
        />
      );

    case "checkboxes":
      return (
        <OptionsEditor
          options={options}
          setOptions={setOptions}
          answer={answer as number[]}
          setAnswer={setAnswer}
          selectorType="checkbox"
          label="Opsi Jawaban (pilih semua yang benar)"
        />
      );

    case "true_false":
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-primary">Jawaban Benar</p>
          {["Benar", "Salah"].map((label, i) => (
            <label key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${answer === i ? "bg-green-50 border border-green-200" : "bg-surface-sunken"}`}>
              <input type="radio" name="tf-answer" checked={answer === i} onChange={() => setAnswer(i)} className="accent-green-600" />
              <span className="text-sm">{label}</span>
              {answer === i && <CheckCircle2 size={14} className="ml-auto text-green-500" />}
            </label>
          ))}
        </div>
      );

    case "short_answer":
      return (
        <div>
          <Input
            label="Jawaban Benar (exact match)"
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ketik jawaban yang benar"
            hint="Jawaban siswa harus persis sama (case-insensitive)"
          />
        </div>
      );

    case "paragraph":
      return (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-sunken p-4 text-center">
          <AlignLeft size={20} className="mx-auto mb-2 text-text-muted" />
          <p className="text-xs text-text-muted">
            Jawaban paragraf dinilai secara manual oleh trainer.
            <br />Tidak ada jawaban otomatis.
          </p>
        </div>
      );

    case "linear_scale":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nilai Minimum"
              type="number"
              value={String(settings.min ?? 1)}
              onChange={(e) => setSettings({ ...settings, min: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Nilai Maksimum"
              type="number"
              value={String(settings.max ?? 5)}
              onChange={(e) => setSettings({ ...settings, max: parseInt(e.target.value) || 5 })}
            />
            <Input
              label="Label Minimum"
              value={String(settings.minLabel ?? "")}
              onChange={(e) => setSettings({ ...settings, minLabel: e.target.value })}
              placeholder="Contoh: Sangat Tidak Setuju"
            />
            <Input
              label="Label Maksimum"
              value={String(settings.maxLabel ?? "")}
              onChange={(e) => setSettings({ ...settings, maxLabel: e.target.value })}
              placeholder="Contoh: Sangat Setuju"
            />
          </div>
          {/* Preview scale */}
          <div className="flex items-center justify-between gap-1 rounded-xl bg-surface-sunken p-3">
            <span className="text-xs text-text-muted">{String(settings.minLabel || settings.min || 1)}</span>
            {Array.from({ length: (Number(settings.max) || 5) - (Number(settings.min) || 1) + 1 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-full border-2 border-border-default bg-white" />
                <span className="text-[10px] text-text-muted">{(Number(settings.min) || 1) + i}</span>
              </div>
            ))}
            <span className="text-xs text-text-muted">{String(settings.maxLabel || settings.max || 5)}</span>
          </div>
        </div>
      );
  }
}

// ── Options Editor (shared by MC, Checkboxes, Dropdown) ──────────────────────

function OptionsEditor({
  options,
  setOptions,
  answer,
  setAnswer,
  selectorType,
  label,
}: {
  options: string[];
  setOptions: (o: string[]) => void;
  answer: number | number[];
  setAnswer: (a: unknown) => void;
  selectorType: "radio" | "checkbox";
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text-primary">{label}</p>
      {options.map((opt, i) => {
        const isCorrect = selectorType === "checkbox"
          ? Array.isArray(answer) && answer.includes(i)
          : answer === i;

        return (
          <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${isCorrect ? "bg-green-50 border border-green-200" : "bg-surface-sunken"}`}>
            <input
              type={selectorType}
              name="answer-selector"
              checked={isCorrect}
              onChange={() => {
                if (selectorType === "checkbox") {
                  const arr = Array.isArray(answer) ? [...answer] : [];
                  if (arr.includes(i)) setAnswer(arr.filter((x) => x !== i));
                  else setAnswer([...arr, i].sort());
                } else {
                  setAnswer(i);
                }
              }}
              className={selectorType === "checkbox" ? "accent-green-600 rounded" : "accent-green-600"}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const newOpts = [...options];
                newOpts[i] = e.target.value;
                setOptions(newOpts);
              }}
              placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  const newOpts = options.filter((_, j) => j !== i);
                  setOptions(newOpts);
                  // Fix answer indices
                  if (selectorType === "checkbox" && Array.isArray(answer)) {
                    setAnswer(answer.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
                  } else if (typeof answer === "number" && answer >= newOpts.length) {
                    setAnswer(0);
                  } else if (typeof answer === "number" && answer > i) {
                    setAnswer(answer - 1);
                  }
                }}
                className="p-1 rounded text-text-muted hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            {isCorrect && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
          </div>
        );
      })}
      {options.length < 6 && (
        <button
          type="button"
          onClick={() => setOptions([...options, ""])}
          className="flex items-center gap-1 text-xs text-accent-cyan-strong hover:underline pl-8"
        >
          <Plus size={12} /> Tambah opsi
        </button>
      )}
      <p className="text-xs text-text-muted pl-8">
        <CheckCircle2 size={10} className="inline mr-1 text-green-500" />
        {selectorType === "checkbox" ? "Centang opsi yang benar." : "Pilih jawaban yang benar."}
      </p>
    </div>
  );
}

// ── Preview renderer ─────────────────────────────────────────────────────────

function renderPreview(q: Question) {
  switch (q.type) {
    case "multiple_choice":
      return (
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input type="radio" name={`preview-${q.id}`} disabled className="accent-accent-cyan-strong" />
              {opt}
            </label>
          ))}
        </div>
      );

    case "checkboxes":
      return (
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input type="checkbox" disabled className="accent-accent-cyan-strong rounded" />
              {opt}
            </label>
          ))}
        </div>
      );

    case "dropdown":
      return (
        <select disabled className="rounded-xl border border-border-default bg-white px-3 py-2 text-sm w-full max-w-xs">
          <option>Pilih jawaban...</option>
          {q.options.map((opt, i) => (
            <option key={i}>{opt}</option>
          ))}
        </select>
      );

    case "short_answer":
      return <input type="text" disabled placeholder="Jawaban singkat..." className="w-full max-w-md border-b border-border-default bg-transparent py-2 text-sm outline-none" />;

    case "paragraph":
      return <textarea disabled placeholder="Jawaban panjang..." rows={3} className="w-full rounded-xl border border-border-default bg-surface-sunken px-3 py-2 text-sm" />;

    case "true_false":
      return (
        <div className="space-y-2">
          {["Benar", "Salah"].map((label, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input type="radio" name={`preview-${q.id}`} disabled className="accent-accent-cyan-strong" />
              {label}
            </label>
          ))}
        </div>
      );

    case "linear_scale": {
      const min = Number(q.settings?.min ?? 1);
      const max = Number(q.settings?.max ?? 5);
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-text-muted">{String(q.settings?.minLabel || min)}</span>
          {Array.from({ length: max - min + 1 }).map((_, i) => (
            <label key={i} className="flex flex-col items-center gap-1 cursor-pointer">
              <input type="radio" name={`preview-${q.id}`} disabled className="accent-accent-cyan-strong" />
              <span className="text-xs text-text-muted">{min + i}</span>
            </label>
          ))}
          <span className="text-xs text-text-muted">{String(q.settings?.maxLabel || max)}</span>
        </div>
      );
    }
  }
}
