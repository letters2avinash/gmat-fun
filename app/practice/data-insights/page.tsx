"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import { DI_TYPE_LABELS } from "@/lib/di";
import type { DiCategory, DiType } from "@/lib/types";
import DiPractice from "@/components/di/DiPractice";

const DI_TYPES: (DiType | "mixed")[] = [
  "mixed",
  "two_part_analysis",
  "multi_source_reasoning",
  "table_analysis",
  "graphics_interpretation",
];

export default function DataInsightsPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<"select" | "practice">("select");
  const [diType, setDiType] = useState<DiType | "mixed">("mixed");
  const [category, setCategory] = useState<DiCategory | "mixed">("mixed");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

    const res = await fetch("/api/di/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, diType, category }),
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
      <DiPractice
        attemptId={attemptId}
        timeLimitMinutes={20}
        onComplete={async () => {
          await fetch("/api/di/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId }),
          });
          router.push(`/results/di/${attemptId}`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">Data Insights</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Practice Data Insights</h1>
        <p className="text-ink/60 mb-8">
          Two-Part Analysis, Multi-Source Reasoning, Table Analysis, and Graphics
          Interpretation — 10 questions, adaptive difficulty.
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
