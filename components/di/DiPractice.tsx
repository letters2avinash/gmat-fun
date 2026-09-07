"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DI_TYPE_LABELS, type DiSubmission, type SafeDiItem } from "@/lib/di";
import { useCountdown, formatClock } from "@/lib/useCountdown";
import { MAX_EDITS_PER_MODULE } from "@/lib/scoring";
import QuestionNav from "@/components/test/QuestionNav";
import Tpa from "./Tpa";
import Msr from "./Msr";
import TableAnalysisQuestion from "./TableAnalysis";
import Gi from "./Gi";

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

function Renderer({
  item,
  submission,
  onChange,
}: {
  item: SafeDiItem;
  submission: any;
  onChange: (s: any) => void;
}) {
  if (item.data.di_type === "two_part_analysis")
    return <Tpa data={item.data} submission={submission} onChange={onChange} feedback={null} disabled={false} />;
  if (item.data.di_type === "multi_source_reasoning")
    return <Msr data={item.data} submission={submission} onChange={onChange} feedback={null} disabled={false} />;
  if (item.data.di_type === "table_analysis")
    return (
      <TableAnalysisQuestion data={item.data} submission={submission} onChange={onChange} feedback={null} disabled={false} />
    );
  return <Gi data={item.data} submission={submission} onChange={onChange} feedback={null} disabled={false} />;
}

/**
 * Runs one Data Insights module (standalone practice, or the DI module of
 * a full-length test) with the same hide-the-answer + timed + Review & Edit
 * shape as the quant/verbal flow — see components/test/QuantVerbalPractice.
 */
export default function DiPractice({
  attemptId,
  timeLimitMinutes,
  onComplete,
}: {
  attemptId: string;
  timeLimitMinutes: number;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "question" | "review" | "submitting">("loading");
  const [item, setItem] = useState<SafeDiItem | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [flagged, setFlagged] = useState(false);
  const [progress, setProgress] = useState({ answered: 0, target: 1 });
  const [loadError, setLoadError] = useState<string | null>(null);

  const seenRef = useRef<SafeDiItem[]>([]);
  const answersRef = useRef<Record<string, any>>({});
  const flaggedRef = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((n) => n + 1);

  const [editsUsed, setEditsUsed] = useState(0);
  const [reviewOpenId, setReviewOpenId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<any>(null);

  const finalize = useCallback(async () => {
    setPhase("submitting");
    onComplete();
  }, [onComplete]);

  const loadNext = useCallback(async () => {
    setPhase("loading");
    setSubmission(null);
    const res = await fetch(`/api/di/next-question?attemptId=${attemptId}`);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error || "Couldn't load the next question.");
      return;
    }
    if (data.done || !data.item) {
      setPhase("review");
      return;
    }
    setItem(data.item);
    setFlagged(!!data.flagged);
    setProgress(data.progress ?? { answered: 0, target: 1 });
    seenRef.current = [...seenRef.current, data.item];
    setPhase("question");
  }, [attemptId]);

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeLeft = useCountdown(timeLimitMinutes * 60, () => {
    finalize();
  });

  async function submit() {
    if (!item || !isComplete(item, submission)) return;
    answersRef.current[item.id] = submission;
    const diSubmission = { di_type: item.data.di_type, answer: submission } as DiSubmission;
    await fetch("/api/di/submit-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, itemId: item.id, submission: diSubmission }),
    });
    loadNext();
  }

  async function toggleFlag() {
    if (!item) return;
    const next = !flagged;
    setFlagged(next);
    if (next) flaggedRef.current.add(item.id);
    else flaggedRef.current.delete(item.id);
    await fetch("/api/di/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, itemId: item.id, flagged: next }),
    });
  }

  async function saveEdit() {
    if (!reviewOpenId) return;
    const openItem = seenRef.current.find((q) => q.id === reviewOpenId);
    if (!openItem) return;
    const changed = JSON.stringify(reviewDraft) !== JSON.stringify(answersRef.current[reviewOpenId]);
    if (changed && isComplete(openItem, reviewDraft)) {
      const diSubmission = { di_type: openItem.data.di_type, answer: reviewDraft } as DiSubmission;
      const res = await fetch("/api/di/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, itemId: reviewOpenId, submission: diSubmission, edit: true }),
      });
      if (res.ok) {
        answersRef.current[reviewOpenId] = reviewDraft;
        setEditsUsed((n) => n + 1);
        rerender();
      }
    }
    setReviewOpenId(null);
    setReviewDraft(null);
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-danger font-medium">{loadError}</p>
      </div>
    );
  }

  if (phase === "loading" || phase === "submitting") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/50">{phase === "submitting" ? "Submitting section…" : "Loading question…"}</p>
      </div>
    );
  }

  if (phase === "review") {
    const openItem = reviewOpenId ? seenRef.current.find((q) => q.id === reviewOpenId) : null;
    const navItems = seenRef.current.map((q) => ({
      id: q.id,
      answered: !!answersRef.current[q.id],
      flagged: flaggedRef.current.has(q.id),
    }));

    if (openItem) {
      return (
        <div className="min-h-screen flex flex-col">
          <div className="sticky top-0 bg-canvas/95 backdrop-blur px-4 py-3 border-b border-ink/10 z-10">
            <div className="max-w-3xl mx-auto flex items-center justify-between text-sm font-medium">
              <span className="text-ink/60">Review & Edit</span>
              <span className="text-brand">{editsUsed} / {MAX_EDITS_PER_MODULE} edits used</span>
            </div>
          </div>
          <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
            <Renderer
              item={openItem}
              submission={reviewDraft ?? answersRef.current[openItem.id]}
              onChange={setReviewDraft}
            />
          </main>
          <div className="sticky bottom-0 bg-white border-t border-ink/10 px-4 py-4">
            <div className="max-w-3xl mx-auto w-full flex gap-3">
              <button
                onClick={() => {
                  setReviewOpenId(null);
                  setReviewDraft(null);
                }}
                className="flex-1 rounded-xl2 bg-white border border-ink/10 font-semibold py-3.5"
              >
                Back to review
              </button>
              <button
                onClick={saveEdit}
                disabled={editsUsed >= MAX_EDITS_PER_MODULE || reviewDraft == null}
                className="flex-1 rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40"
              >
                Save change
              </button>
            </div>
          </div>
        </div>
      );
    }

    const unanswered = navItems.filter((n) => !n.answered).length;

    return (
      <div className="min-h-screen flex flex-col items-center px-6 py-16">
        <div className="max-w-lg w-full">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">
            Data Insights · Review & Edit
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Check your answers</h1>
          <p className="text-ink/60 mb-6">
            Tap a question to change your answer — you can edit up to {MAX_EDITS_PER_MODULE} answers
            before submitting this section. {unanswered > 0 && `${unanswered} question(s) unanswered.`}
          </p>
          <QuestionNav items={navItems} onSelect={setReviewOpenId} />
          <button
            onClick={finalize}
            className="mt-8 w-full rounded-xl2 bg-brand text-white font-semibold py-3.5 active:scale-[0.98] transition"
          >
            Submit section
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const complete = isComplete(item, submission);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 bg-canvas/95 backdrop-blur px-4 py-3 border-b border-ink/10 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm font-medium">
          <span className="text-ink/60">
            Data Insights · Question {progress.answered + 1} / {progress.target}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFlag}
              className={["text-xs font-semibold rounded-lg px-2.5 py-1 border", flagged ? "border-accent bg-accent/10 text-accent" : "border-ink/10 text-ink/50"].join(" ")}
            >
              {flagged ? "🚩 Flagged" : "Flag for review"}
            </button>
            <span className={timeLeft < 300 ? "text-danger font-semibold" : "text-brand"}>
              {formatClock(timeLeft)}
            </span>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-2 h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${(progress.answered / progress.target) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">
          {DI_TYPE_LABELS[item.di_type]}
        </p>
        <Renderer item={item} submission={submission} onChange={setSubmission} />
      </main>

      <div className="sticky bottom-0 bg-white border-t border-ink/10 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={submit}
            disabled={!complete}
            className="w-full rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
