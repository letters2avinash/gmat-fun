"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import { DI_TYPE_LABELS, type DiSubmission, type SafeDiItem, type DiGradeResult } from "@/lib/di";
import type { DiCategory, DiType } from "@/lib/types";
import Tpa from "@/components/di/Tpa";
import Msr from "@/components/di/Msr";
import TableAnalysisQuestion from "@/components/di/TableAnalysis";
import Gi from "@/components/di/Gi";

const QUESTIONS_PER_SET = 10;

const DI_TYPES: (DiType | "mixed")[] = [
  "mixed",
  "two_part_analysis",
  "multi_source_reasoning",
  "table_analysis",
  "graphics_interpretation",
];

function isComplete(item: SafeDiItem, submission: any): boolean {
  if (!submission) return false;
  switch (item.data.di_type) {
    case "two_part_analysis":
      return !!submission.col1 && !!submission.col2;
    case "multi_source_reasoning":
      return item.data.questions.every(({ key, q }) => {
        if (q.type === "yesno_grid") {
          const arr = submission[key];
          return Array.isArray(arr) && q.rows.every((_, i) => typeof arr[i] === "boolean");
        }
        return typeof submission[key] === "string" && submission[key].length > 0;
      });
    case "table_analysis":
      return item.data.statements.every((s) => !!submission[s.key]);
    case "graphics_interpretation":
      return item.data.statements.every((s) => !!submission[s.key]);
  }
}

export default function DataInsightsPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<"select" | "practice" | "results">("select");
  const [diType, setDiType] = useState<DiType | "mixed">("mixed");
  const [category, setCategory] = useState<DiCategory | "mixed">("mixed");

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [item, setItem] = useState<SafeDiItem | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [feedback, setFeedback] = useState<DiGradeResult | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const loadNext = useCallback(async (id: string) => {
    setLoading(true);
    setFeedback(null);
    setSubmission(null);
    const res = await fetch(`/api/di/next-question?attemptId=${id}`);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error || "Couldn't load the next question.");
      setLoading(false);
      return;
    }
    setItem(data.item);
    setLoading(false);
    return data.done;
  }, []);

  async function start() {
    setLoadError(null);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent("/practice/data-insights")}`);
      return;
    }

    setPhase("practice");
    setLoading(true);
    const res = await fetch("/api/di/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, diType, category }),
    });
    const data = await res.json();
    if (!res.ok || !data.attempt) {
      setLoadError(data.error || "Couldn't start practice. Please try again.");
      setLoading(false);
      return;
    }
    setAttemptId(data.attempt.id);
    setAnsweredCount(0);
    setCorrectCount(0);
    await loadNext(data.attempt.id);
  }

  async function submitAnswer() {
    if (!attemptId || !item) return;
    const diSubmission = { di_type: item.data.di_type, answer: submission } as DiSubmission;
    const res = await fetch("/api/di/submit-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, itemId: item.id, submission: diSubmission }),
    });
    const data: DiGradeResult = await res.json();
    setFeedback(data);
    if (data.isCorrect) setCorrectCount((c) => c + 1);
  }

  async function finish(id: string) {
    const res = await fetch("/api/di/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: id }),
    });
    const data = await res.json();
    setFinalScore(data.attempt?.score ?? null);
    setPhase("results");
  }

  async function next() {
    if (!attemptId) return;
    const newCount = answeredCount + 1;
    setAnsweredCount(newCount);
    if (newCount >= QUESTIONS_PER_SET) {
      await finish(attemptId);
      return;
    }
    const done = await loadNext(attemptId);
    if (done) await finish(attemptId);
  }

  if (phase === "select") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">
            Data Insights
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Practice Data Insights</h1>
          <p className="text-ink/60 mb-8">
            Two-Part Analysis, Multi-Source Reasoning, Table Analysis, and Graphics
            Interpretation — {QUESTIONS_PER_SET} questions per set.
          </p>

          <p className="text-sm font-semibold mb-2">Question type</p>
          <div className="grid grid-cols-1 gap-2 mb-6">
            {DI_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setDiType(t)}
                className={[
                  "text-left rounded-xl2 border px-4 py-3 font-medium transition",
                  diType === t ? "border-brand bg-brand-light text-brand" : "border-ink/10 bg-white",
                ].join(" ")}
              >
                {t === "mixed" ? "Mixed (all types)" : DI_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold mb-2">Category</p>
          <div className="grid grid-cols-3 gap-2 mb-8">
            {(["mixed", "math", "non-math"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={[
                  "rounded-xl2 border px-3 py-2.5 text-sm font-medium capitalize transition",
                  category === c ? "border-brand bg-brand-light text-brand" : "border-ink/10 bg-white",
                ].join(" ")}
              >
                {c === "mixed" ? "Both" : c}
              </button>
            ))}
          </div>

          {loadError && <p className="text-danger text-sm mb-4">{loadError}</p>}

          <button
            onClick={start}
            className="w-full rounded-xl2 bg-brand text-white font-semibold py-3.5 active:scale-[0.98] transition"
          >
            Start practice
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Set complete</p>
        <p className="mt-3 text-6xl font-extrabold">{finalScore}%</p>
        <p className="mt-1 text-ink/60">
          {correctCount} / {answeredCount} correct
        </p>
        <div className="mt-8 flex gap-3">
          <a href="/" className="rounded-xl2 bg-white border border-ink/10 px-6 py-3 font-semibold">
            Back home
          </a>
          <button
            onClick={() => {
              setPhase("select");
              setAttemptId(null);
              setItem(null);
            }}
            className="rounded-xl2 bg-brand text-white px-6 py-3 font-semibold"
          >
            Practice again
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-danger font-medium">{loadError}</p>
        <button onClick={() => setPhase("select")} className="text-brand font-semibold text-sm">
          Back to setup
        </button>
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/50">Loading question…</p>
      </div>
    );
  }

  const complete = isComplete(item, submission);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 bg-canvas/95 backdrop-blur px-4 py-3 border-b border-ink/10 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm font-medium">
          <span className="text-ink/60">
            Question {answeredCount + 1} / {QUESTIONS_PER_SET}
          </span>
          <span className="text-brand">{DI_TYPE_LABELS[item.di_type]}</span>
        </div>
        <div className="max-w-3xl mx-auto mt-2 h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${(answeredCount / QUESTIONS_PER_SET) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        {item.data.di_type === "two_part_analysis" && (
          <Tpa
            data={item.data}
            submission={submission}
            onChange={setSubmission}
            feedback={feedback}
            disabled={!!feedback}
          />
        )}
        {item.data.di_type === "multi_source_reasoning" && (
          <Msr
            data={item.data}
            submission={submission}
            onChange={setSubmission}
            feedback={feedback}
            disabled={!!feedback}
          />
        )}
        {item.data.di_type === "table_analysis" && (
          <TableAnalysisQuestion
            data={item.data}
            submission={submission}
            onChange={setSubmission}
            feedback={feedback}
            disabled={!!feedback}
          />
        )}
        {item.data.di_type === "graphics_interpretation" && (
          <Gi
            data={item.data}
            submission={submission}
            onChange={setSubmission}
            feedback={feedback}
            disabled={!!feedback}
          />
        )}

        {feedback && (
          <div className="mt-5 rounded-xl2 bg-white border border-ink/10 p-4 text-sm">
            <p className="font-semibold mb-1">{feedback.isCorrect ? "All correct" : "Not quite"}</p>
            <p className="text-ink/60">
              {feedback.parts.filter((p) => p.isCorrect).length} / {feedback.parts.length} parts correct
            </p>
          </div>
        )}
      </main>

      <div className="sticky bottom-0 bg-white border-t border-ink/10 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {!feedback ? (
            <button
              onClick={submitAnswer}
              disabled={!complete}
              className="w-full rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={next}
              className="w-full rounded-xl2 bg-accent text-white font-semibold py-3.5 active:scale-[0.98] transition"
            >
              Next question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
