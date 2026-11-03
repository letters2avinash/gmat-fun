"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fmtSec, seriesFetch } from "@/lib/series/client";
import { scaledScore } from "@/lib/series/scoring";

type ChatMsg = { n: number; role: "user" | "assistant"; content: string; created_at: string };

type Detail = {
  attempt: {
    id: string;
    email: string;
    testName: string;
    submittedAt: string | null;
    correct: number | null;
    total: number;
    timeUsedSec: number | null;
    autoSubmitted: boolean;
  };
  questions: {
    n: number;
    section: "CR" | "RC";
    type: string;
    stem: string;
    options: { key: string; text: string }[];
    stimulus: string | null;
    answer: string;
  }[];
  review: { n: number; picked: string | null; correct: string; ok: boolean; timeMs: number }[];
  chat: ChatMsg[];
};

export default function AdminAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seriesFetch<Detail>(`/api/series/admin/attempts/${attemptId}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [attemptId]);

  if (error) {
    return <div className="rounded-xl2 border border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</div>;
  }
  if (!data) return <p className="text-sm text-ink/60">Loading attempt…</p>;

  const { attempt, questions, review, chat } = data;
  const reviewByN = new Map(review.map((r) => [r.n, r]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/series/admin" className="text-sm text-brand hover:underline">← All students</Link>
        <h1 className="mt-2 text-2xl font-semibold">{attempt.testName}</h1>
        <p className="text-sm text-ink/60">
          {attempt.email} · Verbal {scaledScore(attempt.correct, attempt.total)} / 90 · time used {fmtSec(attempt.timeUsedSec)}
          {attempt.autoSubmitted ? " · time ran out" : ""}
        </p>
      </div>

      {questions.map((q) => {
        const r = reviewByN.get(q.n);
        const msgs = chat.filter((m) => m.n === q.n);
        return (
          <section key={q.n} className="rounded-xl2 border border-ink/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="font-medium">
                Q{q.n} · {q.type} · {q.section === "CR" ? "Critical Reasoning" : "Reading Comprehension"}
              </p>
              <p className="text-ink/60">
                {r?.ok ? "Correct" : r?.picked ? "Incorrect" : "Unanswered"} · picked {r?.picked ?? "–"} / answer {q.answer} · {fmtSec(Math.round((r?.timeMs ?? 0) / 1000))}
              </p>
            </div>
            {q.stimulus ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-brand">Show passage</summary>
                <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed">{q.stimulus}</div>
              </details>
            ) : null}
            <p className="mt-3 whitespace-pre-line font-medium leading-relaxed">{q.stem}</p>
            <div className="mt-3 flex flex-col gap-1.5 text-[15px]">
              {q.options.map((o) => (
                <p key={o.key} className={o.key === q.answer ? "text-success" : o.key === r?.picked ? "text-danger" : ""}>
                  <span className="font-semibold">{o.key}.</span> {o.text}
                </p>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-canvas p-4">
              <p className="mb-2 text-sm font-medium text-ink/70">
                Doubts chat {msgs.length ? "" : "· none for this question"}
              </p>
              <div className="flex flex-col gap-2 text-[15px]">
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[90%] whitespace-pre-line rounded-xl2 px-3 py-2 leading-relaxed ${
                      m.role === "user" ? "ml-auto bg-brand text-white" : "border border-ink/10 bg-white"
                    }`}
                  >
                    <p className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
                      {m.role === "user" ? "Student" : "Assistant"} · {new Date(m.created_at).toLocaleString()}
                    </p>
                    {m.content}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
