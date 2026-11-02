"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DoubtsChat from "@/components/series/DoubtsChat";
import { fmtSec, seriesFetch } from "@/lib/series/client";
import type { Attempt, PublicTest, ReviewItem } from "@/lib/series/types";

type Result = {
  attempt: Attempt;
  test: PublicTest;
  review: ReviewItem[];
  expired?: boolean;
};

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    seriesFetch<Result>(`/api/series/attempts/${attemptId}`)
      .then((r) => {
        if (r.attempt.status !== "submitted") {
          setError("This attempt is still in progress.");
          return;
        }
        setData(r);
      })
      .catch((e: Error) => setError(e.message));
  }, [attemptId]);

  if (error) {
    return (
      <div className="rounded-xl2 border border-ink/10 bg-white p-5 text-sm">
        <p>{error}</p>
        <Link href="/" className="mt-3 inline-block text-brand hover:underline">Back to tests</Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-ink/60">Loading result…</p>;

  const { attempt, test, review } = data;
  const pct = Math.round(((attempt.correct ?? 0) / attempt.total) * 100);
  const bySec = (s: "CR" | "RC") => {
    const rows = review.filter((r) => r.section === s);
    return { correct: rows.filter((r) => r.ok).length, total: rows.length };
  };
  const cr = bySec("CR");
  const rc = bySec("RC");
  const openQ = open !== null ? test.questions.find((q) => q.n === open) ?? null : null;
  const openReview = open !== null ? review.find((r) => r.n === open) ?? null : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <section className="rounded-xl2 border border-ink/10 bg-white p-6">
          <p className="text-sm text-ink/60">{test.name}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-2">
            <p className="text-4xl font-semibold tracking-tight">
              {attempt.correct}/{attempt.total}
              <span className="ml-2 text-lg font-normal text-ink/50">{pct}%</span>
            </p>
            <p className="text-sm text-ink/70">
              CR {cr.correct}/{cr.total} · RC {rc.correct}/{rc.total}
            </p>
            <p className="text-sm text-ink/70">
              Time used {fmtSec(attempt.time_used_sec)} of {test.durationMinutes}m
              {attempt.auto_submitted ? " · submitted when time ran out" : ""}
            </p>
          </div>
        </section>

        {openQ && openReview ? (
          <section className="rounded-xl2 border border-ink/10 bg-white p-6">
            <p className="text-sm text-ink/60">
              Q{openQ.n} · {openQ.type} · {openReview.ok ? "Correct" : "Incorrect"}
            </p>
            {openQ.stimulus || (openQ.passageId && test.passages[openQ.passageId]) ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-brand">Show passage</summary>
                <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed">
                  {openQ.stimulus ?? test.passages[openQ.passageId!]?.text}
                </div>
              </details>
            ) : null}
            <p className="mt-4 whitespace-pre-line font-medium leading-relaxed">{openQ.stem}</p>
            <div className="mt-4 flex flex-col gap-2">
              {openQ.options.map((o) => {
                const isCorrect = o.key === openReview.correct;
                const isPicked = o.key === openReview.picked;
                return (
                  <div
                    key={o.key}
                    className={`flex gap-3 rounded-lg border px-3 py-2.5 text-[15px] ${
                      isCorrect ? "border-success bg-success/10" : isPicked ? "border-danger bg-danger/10" : "border-ink/10"
                    }`}
                  >
                    <span className="font-semibold">{o.key}.</span>
                    <span>{o.text}</span>
                    {isCorrect ? <span className="ml-auto text-xs text-success">Correct</span> : null}
                    {isPicked && !isCorrect ? <span className="ml-auto text-xs text-danger">Your answer</span> : null}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink/50">Time on this question: {fmtSec(Math.round(openReview.timeMs / 1000))}</p>
          </section>
        ) : null}

        <section className="rounded-xl2 border border-ink/10 bg-white p-4">
          <h2 className="px-2 pb-2 text-sm font-medium text-ink/70">Question by question</h2>
          <ul className="divide-y divide-ink/10">
            {review.map((r) => (
              <li key={r.n}>
                <button
                  onClick={() => setOpen(r.n)}
                  className={`flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left text-sm hover:bg-canvas ${
                    open === r.n ? "bg-brand-light" : ""
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.ok ? "bg-success" : r.picked ? "bg-danger" : "bg-ink/20"}`} />
                    <span className="font-medium">Q{r.n}</span>
                    <span className="text-ink/60">{r.type}</span>
                  </span>
                  <span className="whitespace-nowrap text-ink/60">
                    {r.picked ?? "–"} / {r.correct} · {fmtSec(Math.round(r.timeMs / 1000))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

      </div>

      <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
        {open !== null ? (
          <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl2 border border-ink/10 bg-white lg:h-full">
            <DoubtsChat key={open} attemptId={attempt.id} n={open} onClose={() => setOpen(null)} />
          </div>
        ) : (
          <div className="rounded-xl2 border border-dashed border-ink/20 bg-white p-5 text-sm text-ink/60">
            Pick a question on the left to review it and ask the doubts assistant about it.
          </div>
        )}
      </aside>
    </div>
  );
}
