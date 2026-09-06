"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/types";

// DEMO_USER_ID is a placeholder until auth (Supabase Auth) is wired in —
// swap for the real signed-in user id once login exists.
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export default function TestPage({
  mode,
}: {
  mode: "topic" | "sectional" | "full-length";
}) {
  const router = useRouter();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctChoice: string;
    explanation: string | null;
  } | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  const QUESTIONS_PER_TEST = mode === "topic" ? 10 : mode === "sectional" ? 20 : 40;

  const loadNextQuestion = useCallback(async (id: string) => {
    setLoading(true);
    setFeedback(null);
    setSelected(null);
    const res = await fetch(`/api/test/next-question?attemptId=${id}`);
    const data = await res.json();
    setQuestion(data.question);
    setStartedAt(Date.now());
    setLoading(false);
    if (data.done) {
      await finishTest(id);
    }
  }, []);

  useEffect(() => {
    async function start() {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          mode,
          section: mode === "full-length" ? undefined : "quant",
        }),
      });
      const data = await res.json();
      setAttemptId(data.attempt.id);
      loadNextQuestion(data.attempt.id);
    }
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function finishTest(id: string) {
    router.push(`/results/${id}`);
  }

  async function submitAnswer() {
    if (!attemptId || !question || !selected) return;
    const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);
    const res = await fetch("/api/test/submit-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId,
        questionId: question.id,
        selectedChoice: selected,
        timeTakenSeconds,
      }),
    });
    const data = await res.json();
    setFeedback(data);
  }

  async function next() {
    if (!attemptId) return;
    const newCount = answeredCount + 1;
    setAnsweredCount(newCount);
    if (newCount >= QUESTIONS_PER_TEST) {
      await finishTest(attemptId);
      return;
    }
    loadNextQuestion(attemptId);
  }

  if (loading || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/50">Loading question…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar — sticky top, thumb-reachable controls at bottom on mobile */}
      <div className="sticky top-0 bg-canvas/95 backdrop-blur px-4 py-3 border-b border-ink/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-sm font-medium">
          <span className="text-ink/60">
            Question {answeredCount + 1} / {QUESTIONS_PER_TEST}
          </span>
          <span className="text-brand">
            Difficulty {Math.round(question.difficulty)}/5
          </span>
        </div>
        <div className="max-w-2xl mx-auto mt-2 h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${(answeredCount / QUESTIONS_PER_TEST) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">
          {question.section.replace("_", " ")} · {question.topic}
        </p>
        <p className="text-lg leading-relaxed whitespace-pre-wrap">
          {question.prompt}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {question.choices.map((choice) => {
            const isSelected = selected === choice.key;
            const isCorrectChoice =
              feedback && choice.key === feedback.correctChoice;
            const isWrongSelected =
              feedback && isSelected && !feedback.isCorrect;

            return (
              <button
                key={choice.key}
                disabled={!!feedback}
                onClick={() => setSelected(choice.key)}
                className={[
                  "text-left rounded-xl2 border px-4 py-3.5 transition",
                  isCorrectChoice
                    ? "border-success bg-success/10"
                    : isWrongSelected
                    ? "border-danger bg-danger/10"
                    : isSelected
                    ? "border-brand bg-brand-light"
                    : "border-ink/10 bg-white",
                ].join(" ")}
              >
                <span className="font-semibold mr-2">{choice.key}.</span>
                {choice.text}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="mt-5 rounded-xl2 bg-white border border-ink/10 p-4 text-sm">
            <p className="font-semibold mb-1">
              {feedback.isCorrect ? "Correct" : "Not quite"}
            </p>
            {feedback.explanation && (
              <p className="text-ink/70">{feedback.explanation}</p>
            )}
          </div>
        )}
      </main>

      {/* Bottom action bar — thumb zone on mobile */}
      <div className="sticky bottom-0 bg-white border-t border-ink/10 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {!feedback ? (
            <button
              onClick={submitAnswer}
              disabled={!selected}
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
