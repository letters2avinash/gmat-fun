"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import QuantVerbalPractice from "@/components/test/QuantVerbalPractice";

const QUESTION_TYPES: { key: string; label: string }[] = [
  { key: "problem_solving", label: "Problem Solving" },
  { key: "data_sufficiency", label: "Data Sufficiency" },
];

export default function QuantPracticePage() {
  const router = useRouter();

  const [phase, setPhase] = useState<"select" | "practice">("select");
  const [questionType, setQuestionType] = useState<string>("problem_solving");
  const [topic, setTopic] = useState<string>("mixed");
  const [topics, setTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTopics = useCallback(async (qType: string) => {
    setLoadingTopics(true);
    const res = await fetch(`/api/test/topics?section=quant&questionType=${encodeURIComponent(qType)}`);
    const data = await res.json();
    setTopics(data.topics ?? []);
    setTopic("mixed");
    setLoadingTopics(false);
  }, []);

  useEffect(() => {
    loadTopics(questionType);
  }, [questionType, loadTopics]);

  async function start() {
    setLoadError(null);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent("/practice/quant")}`);
      return;
    }

    const res = await fetch("/api/test/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        mode: "topic",
        section: "quant",
        questionType,
        topic: topic === "mixed" ? undefined : topic,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.attempt) {
      setLoadError(data.error || "Couldn't start practice. Please try again.");
      return;
    }
    setAttemptId(data.attempt.id);
    setPhase("practice");
  }

  if (phase === "practice" && attemptId) {
    return (
      <QuantVerbalPractice
        attemptId={attemptId}
        section="quant"
        timeLimitMinutes={20}
        onComplete={async () => {
          await fetch("/api/test/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId }),
          });
          router.push(`/results/${attemptId}`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">Quantitative Reasoning</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Practice Quant</h1>
        <p className="text-ink/60 mb-8">Pick a question type and topic — adaptive difficulty, 10 questions.</p>

        <p className="text-sm font-semibold mb-2">Question type</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setQuestionType(t.key)}
              className={[
                "text-left rounded-xl2 border px-4 py-3 font-medium transition",
                questionType === t.key ? "border-brand bg-brand-light text-brand" : "border-ink/10 bg-white",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold mb-2">Topic</p>
        {loadingTopics ? (
          <p className="text-ink/50 text-sm mb-8">Loading topics…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8 max-h-72 overflow-y-auto pr-1">
            <button
              onClick={() => setTopic("mixed")}
              className={[
                "text-left rounded-xl2 border px-4 py-2.5 text-sm font-medium transition",
                topic === "mixed" ? "border-brand bg-brand-light text-brand" : "border-ink/10 bg-white",
              ].join(" ")}
            >
              Mixed (all topics)
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={[
                  "text-left rounded-xl2 border px-4 py-2.5 text-sm font-medium transition",
                  topic === t ? "border-brand bg-brand-light text-brand" : "border-ink/10 bg-white",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        )}

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
