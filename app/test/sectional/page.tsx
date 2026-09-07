"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import QuantVerbalPractice from "@/components/test/QuantVerbalPractice";
import { SECTION_TIME_LIMITS_MIN } from "@/lib/scoring";

const SECTIONS = [
  { key: "quant" as const, title: "Quantitative Reasoning", blurb: "21 questions, 45 minutes, fully adaptive." },
  { key: "verbal" as const, title: "Verbal Reasoning", blurb: "23 questions, 45 minutes, fully adaptive." },
  { key: "data_insights" as const, title: "Data Insights", blurb: "Two-Part, Multi-Source, Table, Graphics." },
];

export default function SectionalPage() {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [section, setSection] = useState<"quant" | "verbal" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function choose(key: "quant" | "verbal" | "data_insights") {
    if (key === "data_insights") {
      router.push("/practice/data-insights");
      return;
    }

    setLoadError(null);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent("/test/sectional")}`);
      return;
    }

    const res = await fetch("/api/test/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, mode: "sectional", section: key }),
    });
    const data = await res.json();
    if (!res.ok || !data.attempt) {
      setLoadError(data.error || "Couldn't start the section. Please try again.");
      return;
    }
    setSection(key);
    setAttemptId(data.attempt.id);
  }

  if (attemptId && section) {
    return (
      <QuantVerbalPractice
        attemptId={attemptId}
        section={section}
        timeLimitMinutes={SECTION_TIME_LIMITS_MIN[section]}
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
      <div className="max-w-lg w-full text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">Sectional</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-8">Pick a section</h1>
        {loadError && <p className="text-danger text-sm mb-4">{loadError}</p>}
        <div className="grid gap-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => choose(s.key)}
              className="text-left rounded-xl2 bg-white border border-ink/10 p-6 hover:border-brand/40 hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg">{s.title}</h3>
              <p className="mt-1 text-sm text-ink/60">{s.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
