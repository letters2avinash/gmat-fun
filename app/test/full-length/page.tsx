"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import QuantVerbalPractice from "@/components/test/QuantVerbalPractice";
import DiPractice from "@/components/di/DiPractice";
import { SECTION_TIME_LIMITS_MIN } from "@/lib/scoring";

type Phase = "intro" | "quant" | "between-quant-verbal" | "verbal" | "between-verbal-di" | "di";

function Transition({ title, blurb, onContinue }: { title: string; blurb: string; onContinue: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">Section complete</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-ink/60 max-w-sm">{blurb}</p>
      <button
        onClick={onContinue}
        className="mt-8 rounded-xl2 bg-brand text-white font-semibold px-8 py-3.5 active:scale-[0.98] transition"
      >
        Continue
      </button>
    </div>
  );
}

export default function FullLengthPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [diAttemptId, setDiAttemptId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function start() {
    setLoadError(null);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent("/test/full-length")}`);
      return;
    }

    const res = await fetch("/api/test/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, mode: "full-length" }),
    });
    const data = await res.json();
    if (!res.ok || !data.attempt) {
      setLoadError(data.error || "Couldn't start the test. Please try again.");
      return;
    }
    setAttemptId(data.attempt.id);
    setPhase("quant");
  }

  if (phase === "quant" && attemptId) {
    return (
      <QuantVerbalPractice
        attemptId={attemptId}
        section="quant"
        timeLimitMinutes={SECTION_TIME_LIMITS_MIN.quant}
        onComplete={async () => {
          await fetch("/api/test/module-finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId, section: "quant" }),
          });
          setPhase("between-quant-verbal");
        }}
      />
    );
  }

  if (phase === "between-quant-verbal") {
    return (
      <Transition
        title="Quant done. On to Verbal."
        blurb="Your Quant score is locked in — no answers or scores are shown until the whole test is complete."
        onContinue={() => setPhase("verbal")}
      />
    );
  }

  if (phase === "verbal" && attemptId) {
    return (
      <QuantVerbalPractice
        attemptId={attemptId}
        section="verbal"
        timeLimitMinutes={SECTION_TIME_LIMITS_MIN.verbal}
        onComplete={async () => {
          const res = await fetch("/api/test/module-finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId, section: "verbal" }),
          });
          const data = await res.json();
          setDiAttemptId(data.diAttemptId ?? null);
          setPhase("between-verbal-di");
        }}
      />
    );
  }

  if (phase === "between-verbal-di") {
    return (
      <Transition
        title="Verbal done. Last section: Data Insights."
        blurb="Two-Part Analysis, Multi-Source Reasoning, Table Analysis, and Graphics Interpretation."
        onContinue={() => setPhase("di")}
      />
    );
  }

  if (phase === "di" && diAttemptId && attemptId) {
    return (
      <DiPractice
        attemptId={diAttemptId}
        timeLimitMinutes={SECTION_TIME_LIMITS_MIN.data_insights}
        onComplete={async () => {
          await fetch("/api/di/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId: diAttemptId }),
          });
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">Full-length</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-4">GMAT Focus simulation</h1>
        <p className="text-ink/60 mb-2">
          Three timed, adaptive sections — Quant (45 min), Verbal (45 min), Data Insights (45 min).
        </p>
        <p className="text-ink/60 mb-8">
          No answers or scores are revealed until you finish all three — exactly like the real exam.
          Each section ends with a Review & Edit screen where you can revisit and change up to 3 answers.
        </p>
        {loadError && <p className="text-danger text-sm mb-4">{loadError}</p>}
        <button
          onClick={start}
          className="w-full rounded-xl2 bg-brand text-white font-semibold py-3.5 active:scale-[0.98] transition"
        >
          Begin test
        </button>
      </div>
    </div>
  );
}
