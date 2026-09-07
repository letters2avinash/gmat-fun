"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DiAttempt } from "@/lib/types";

interface ReviewRow {
  itemId: string;
  diTypeLabel: string;
  isCorrect: boolean;
  flagged: boolean;
  grade: { isCorrect: boolean; parts: { key: string; isCorrect: boolean; correctAnswer: string }[] };
}

export default function DiResultsClient({ attemptId }: { attemptId: string }) {
  const [attempt, setAttempt] = useState<DiAttempt | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);

  useEffect(() => {
    async function load() {
      const [attemptRes, reviewRes] = await Promise.all([
        fetch(`/api/di/attempt?attemptId=${attemptId}`),
        fetch(`/api/di/review?attemptId=${attemptId}`),
      ]);
      const attemptData = await attemptRes.json();
      const reviewData = await reviewRes.json();
      setAttempt(attemptData.attempt ?? null);
      setReview(reviewData.review ?? []);
    }
    load();
  }, [attemptId]);

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/50">Scoring your set…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="max-w-2xl w-full text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Set complete</p>
        <p className="mt-3 text-6xl font-extrabold">{attempt.scaled_score}</p>
        <p className="mt-1 text-ink/60">
          Data Insights scaled score (60–90) · {attempt.correct} / {attempt.total} correct
        </p>

        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/" className="rounded-xl2 bg-white border border-ink/10 px-6 py-3 font-semibold">
            Back home
          </Link>
          <Link
            href="/practice/data-insights"
            className="rounded-xl2 bg-brand text-white px-6 py-3 font-semibold"
          >
            Practice again
          </Link>
        </div>
      </div>

      {review.length > 0 && (
        <div className="max-w-2xl w-full mt-12 text-left">
          <h2 className="text-lg font-bold mb-4">Review</h2>
          <div className="flex flex-col gap-3">
            {review.map((r, i) => (
              <div key={r.itemId} className="rounded-xl2 bg-white border border-ink/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">
                    Q{i + 1} · {r.diTypeLabel} {r.flagged && "🚩"}
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
