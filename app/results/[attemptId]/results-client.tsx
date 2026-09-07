"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReviewResponse, TestAttempt } from "@/lib/types";

interface DiReviewRow {
  itemId: string;
  diTypeLabel: string;
  isCorrect: boolean;
  flagged: boolean;
  grade: { isCorrect: boolean; parts: { key: string; isCorrect: boolean; correctAnswer: string }[] };
}

export default function ResultsClient({ attemptId }: { attemptId: string }) {
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [review, setReview] = useState<ReviewResponse[]>([]);
  const [diReview, setDiReview] = useState<DiReviewRow[]>([]);

  useEffect(() => {
    async function load() {
      // Idempotent — finalizes scoring if this is the first visit, no-ops otherwise.
      const finishRes = await fetch("/api/test/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const finishData = await finishRes.json();
      const finalAttempt: TestAttempt | undefined = finishData.attempt;
      setAttempt(finalAttempt ?? null);

      const reviewRes = await fetch(`/api/test/review?attemptId=${attemptId}`);
      const reviewData = await reviewRes.json();
      setReview(reviewData.review ?? []);

      if (finalAttempt?.di_attempt_id) {
        const diReviewRes = await fetch(`/api/di/review?attemptId=${finalAttempt.di_attempt_id}`);
        const diReviewData = await diReviewRes.json();
        setDiReview(diReviewData.review ?? []);
      }
    }
    load();
  }, [attemptId]);

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/50">Scoring your test…</p>
      </div>
    );
  }

  const isFullLength = attempt.mode === "full-length";
  const headline = isFullLength ? attempt.total_score : attempt.score;
  const headlineLabel = isFullLength ? "Total Score (205–805)" : "Scaled score (60–90)";

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="max-w-2xl w-full text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Test complete</p>
        <p className="mt-3 text-6xl font-extrabold">{headline}</p>
        <p className="mt-1 text-ink/60">{headlineLabel}</p>

        {isFullLength && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl2 bg-white border border-ink/10 p-4">
              <p className="text-2xl font-bold">{attempt.quant_score ?? "—"}</p>
              <p className="text-xs text-ink/50 mt-1">Quant</p>
            </div>
            <div className="rounded-xl2 bg-white border border-ink/10 p-4">
              <p className="text-2xl font-bold">{attempt.verbal_score ?? "—"}</p>
              <p className="text-xs text-ink/50 mt-1">Verbal</p>
            </div>
            <div className="rounded-xl2 bg-white border border-ink/10 p-4">
              <p className="text-2xl font-bold">{attempt.di_score ?? "—"}</p>
              <p className="text-xs text-ink/50 mt-1">Data Insights</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/" className="rounded-xl2 bg-white border border-ink/10 px-6 py-3 font-semibold">
            Back home
          </Link>
          <Link
            href={attempt.mode === "full-length" ? "/test/full-length" : `/test/${attempt.mode}`}
            className="rounded-xl2 bg-brand text-white px-6 py-3 font-semibold"
          >
            Take another
          </Link>
        </div>
      </div>

      {(review.length > 0 || diReview.length > 0) && (
        <div className="max-w-2xl w-full mt-12 text-left">
          <h2 className="text-lg font-bold mb-4">Review</h2>
          <div className="flex flex-col gap-3">
            {review.map((r, i) => (
              <div key={r.questionId} className="rounded-xl2 bg-white border border-ink/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold capitalize">
                    Q{i + 1} · {r.section.replace("_", " ")} · {r.topic} {r.flagged && "🚩"}
                  </span>
                  <span
                    className={[
                      "text-xs font-semibold rounded-full px-2.5 py-1",
                      r.isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                    ].join(" ")}
                  >
                    {r.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="text-sm text-ink/70 whitespace-pre-wrap">{r.prompt}</p>
                <p className="text-sm mt-2">
                  Your answer: <span className="font-semibold">{r.selectedChoice ?? "—"}</span> · Correct:{" "}
                  <span className="font-semibold">{r.correctChoice}</span>
                </p>
                {r.explanation && <p className="text-sm text-ink/60 mt-2">{r.explanation}</p>}
              </div>
            ))}
            {diReview.map((r, i) => (
              <div key={r.itemId} className="rounded-xl2 bg-white border border-ink/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">
                    DI {i + 1} · {r.diTypeLabel} {r.flagged && "🚩"}
                  </span>
                  <span
                    className={[
                      "text-xs font-semibold rounded-full px-2.5 py-1",
                      r.isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                    ].join(" ")}
                  >
                    {r.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <ul className="text-sm text-ink/70 flex flex-col gap-1">
                  {r.grade.parts.map((p) => (
                    <li key={p.key} className={p.isCorrect ? "" : "text-danger"}>
                      {p.isCorrect ? "✓" : "✗"} Correct answer: {p.correctAnswer}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
