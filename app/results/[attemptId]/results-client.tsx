"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TestAttempt } from "@/lib/types";

export default function ResultsPage({ attemptId }: { attemptId: string }) {
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);

  useEffect(() => {
    async function finish() {
      const res = await fetch("/api/test/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      setAttempt(data.attempt);
    }
    finish();
  }, [attemptId]);

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/50">Scoring your test…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">
        Test complete
      </p>
      <p className="mt-3 text-6xl font-extrabold">{attempt.score}</p>
      <p className="mt-1 text-ink/60">Estimated score</p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-xl2 bg-white border border-ink/10 px-6 py-3 font-semibold"
        >
          Back home
        </Link>
        <Link
          href={`/test/${attempt.mode}`}
          className="rounded-xl2 bg-brand text-white px-6 py-3 font-semibold"
        >
          Take another
        </Link>
      </div>
    </div>
  );
}
