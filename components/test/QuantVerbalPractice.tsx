"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SafeQuestion } from "@/lib/types";
import { useCountdown, formatClock } from "@/lib/useCountdown";
import QuestionNav from "./QuestionNav";
import { MAX_EDITS_PER_MODULE } from "@/lib/scoring";

const SECTION_LABEL: Record<"quant" | "verbal", string> = {
  quant: "Quantitative Reasoning",
  verbal: "Verbal Reasoning",
};

/**
 * Runs one GMAT Focus-style module: fetches questions one at a time near
 * the attempt's current ability estimate, never reveals correctness, and
 * ends with an end-of-module Review & Edit screen (like the real exam)
 * before handing off to the parent via onComplete. The parent decides
 * what "done" means — advance to the next module, or finish the attempt.
 */
export default function QuantVerbalPractice({
  attemptId,
  section,
  timeLimitMinutes,
  onComplete,
}: {
  attemptId: string;
  section: "quant" | "verbal";
  timeLimitMinutes: number;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "question" | "review" | "submitting">("loading");
  const [question, setQuestion] = useState<SafeQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [progress, setProgress] = useState({ answered: 0, target: 1 });
  const [loadError, setLoadError] = useState<string | null>(null);

  // Everything the student has seen this module, in order — kept client-
  // side so the review screen can re-show a question for editing without
  // another round-trip (and without ever fetching the answer key).
  const seenRef = useRef<SafeQuestion[]>([]);
  const answersRef = useRef<Record<string, string>>({});
  const flaggedRef = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((n) => n + 1);

  const [editsUsed, setEditsUsed] = useState(0);
  const [reviewOpenId, setReviewOpenId] = useState<string | null>(null);
  const [reviewChoice, setReviewChoice] = useState<string | null>(null);

  const finalize = useCallback(async () => {
    setPhase("submitting");
    onComplete();
  }, [onComplete]);

  const loadNext = useCallback(async () => {
    setPhase("loading");
    setSelected(null);
    const res = await fetch(`/api/test/next-question?attemptId=${attemptId}`);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error || "Couldn't load the next question.");
      return;
    }
    if (data.done || !data.question) {
      setPhase("review");
      return;
    }
    setQuestion(data.question);
    setFlagged(!!data.flagged);
    setProgress(data.progress ?? { answered: 0, target: 1 });
    seenRef.current = [...seenRef.current, data.question];
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
    if (!question || !selected) return;
    answersRef.current[question.id] = selected;
    await fetch("/api/test/submit-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, questionId: question.id, selectedChoice: selected }),
    });
    loadNext();
  }

  async function toggleFlag() {
    if (!question) return;
    const next = !flagged;
    setFlagged(next);
    if (next) flaggedRef.current.add(question.id);
    else flaggedRef.current.delete(question.id);
    await fetch("/api/test/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, questionId: question.id, flagged: next }),
    });
  }

  async function saveEdit() {
    if (!reviewOpenId || !reviewChoice) return;
    if (reviewChoice !== answersRef.current[reviewOpenId]) {
      const res = await fetch("/api/test/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, questionId: reviewOpenId, selectedChoice: reviewChoice, edit: true }),
      });
      if (res.ok) {
        answersRef.current[reviewOpenId] = reviewChoice;
        setEditsUsed((n) => n + 1);
        rerender();
      }
    }
    setReviewOpenId(null);
    setReviewChoice(null);
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
    const openQuestion = reviewOpenId ? seenRef.current.find((q) => q.id === reviewOpenId) : null;
    const navItems = seenRef.current.map((q) => ({
      id: q.id,
      answered: !!answersRef.current[q.id],
      flagged: flaggedRef.current.has(q.id),
    }));

    if (openQuestion) {
      return (
        <div className="min-h-screen flex flex-col">
          <div className="sticky top-0 bg-canvas/95 backdrop-blur px-4 py-3 border-b border-ink/10">
            <div className="max-w-2xl mx-auto flex items-center justify-between text-sm font-medium">
              <span className="text-ink/60">Review & Edit</span>
              <span className="text-brand">{editsUsed} / {MAX_EDITS_PER_MODULE} edits used</span>
            </div>
          </div>
          <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{openQuestion.prompt}</p>
            <div className="mt-6 flex flex-col gap-3">
              {openQuestion.choices.map((choice) => (
                <button
                  key={choice.key}
                  onClick={() => setReviewChoice(choice.key)}
                  className={[
                    "text-left rounded-xl2 border px-4 py-3.5 transition",
                    (reviewChoice ?? answersRef.current[openQuestion.id]) === choice.key
                      ? "border-brand bg-brand-light"
                      : "border-ink/10 bg-white",
                  ].join(" ")}
                >
                  <span className="font-semibold mr-2">{choice.key}.</span>
                  {choice.text}
                </button>
              ))}
            </div>
          </main>
          <div className="sticky bottom-0 bg-white border-t border-ink/10 px-4 py-4 flex gap-3">
            <div className="max-w-2xl mx-auto w-full flex gap-3">
              <button
                onClick={() => {
                  setReviewOpenId(null);
                  setReviewChoice(null);
                }}
                className="flex-1 rounded-xl2 bg-white border border-ink/10 font-semibold py-3.5"
              >
                Back to review
              </button>
              <button
                onClick={saveEdit}
                disabled={
                  editsUsed >= MAX_EDITS_PER_MODULE ||
                  !reviewChoice ||
                  reviewChoice === answersRef.current[openQuestion.id]
                }
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
            {SECTION_LABEL[section]} · Review & Edit
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

  if (!question) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 bg-canvas/95 backdrop-blur px-4 py-3 border-b border-ink/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-sm font-medium">
          <span className="text-ink/60">
            {SECTION_LABEL[section]} · Question {progress.answered + 1} / {progress.target}
          </span>
          <span className={timeLeft < 300 ? "text-danger font-semibold" : "text-brand"}>
            {formatClock(timeLeft)}
          </span>
        </div>
        <div className="max-w-2xl mx-auto mt-2 h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${(progress.answered / progress.target) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {question.topic}
          </p>
          <button
            onClick={toggleFlag}
            className={["text-xs font-semibold rounded-lg px-2.5 py-1 border", flagged ? "border-accent bg-accent/10 text-accent" : "border-ink/10 text-ink/50"].join(" ")}
          >
            {flagged ? "🚩 Flagged" : "Flag for review"}
          </button>
        </div>
        <p className="text-lg leading-relaxed whitespace-pre-wrap">{question.prompt}</p>

        <div className="mt-6 flex flex-col gap-3">
          {question.choices.map((choice) => (
            <button
              key={choice.key}
              onClick={() => setSelected(choice.key)}
              className={[
                "text-left rounded-xl2 border px-4 py-3.5 transition",
                selected === choice.key ? "border-brand bg-brand-light" : "border-ink/10 bg-white",
              ].join(" ")}
            >
              <span className="font-semibold mr-2">{choice.key}.</span>
              {choice.text}
            </button>
          ))}
        </div>
      </main>

      <div className="sticky bottom-0 bg-white border-t border-ink/10 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={submit}
            disabled={!selected}
            className="w-full rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
