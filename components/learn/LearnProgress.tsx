"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

// Pulls the same accuracy signal AnalyticsTab uses (per-section correct/
// total from real attempt data) so "progress" here means something —
// not just lessons clicked open. Signed-out visitors see an invite to
// log in instead of a bar with no data behind it.
export default function LearnProgress({
  sectionKey,
}: {
  sectionKey: "quant" | "verbal" | "data_insights";
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "signed-out" } | { status: "ready"; total: number; pct: number | null }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabase();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setState({ status: "signed-out" });
        return;
      }

      if (sectionKey === "data_insights") {
        const { data } = await supabase
          .from("di_attempt_responses")
          .select("is_correct");
        const total = data?.length ?? 0;
        const correct = data?.filter((r) => r.is_correct).length ?? 0;
        if (!cancelled)
          setState({ status: "ready", total, pct: total ? Math.round((correct / total) * 100) : null });
        return;
      }

      const { data } = await supabase
        .from("attempt_responses")
        .select("is_correct, question:questions(section)")
        .not("is_correct", "is", null);

      const rows = (data ?? []).filter((r: any) => r.question?.section === sectionKey);
      const total = rows.length;
      const correct = rows.filter((r: any) => r.is_correct).length;
      if (!cancelled)
        setState({ status: "ready", total, pct: total ? Math.round((correct / total) * 100) : null });
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  if (state.status === "loading") return <div className="mt-4 h-2 rounded-full bg-ink/5 w-full" />;

  if (state.status === "signed-out") {
    return (
      <p className="mt-4 text-xs text-ink/40">
        <a href="/auth" className="text-brand font-semibold">
          Log in
        </a>{" "}
        to track your progress here.
      </p>
    );
  }

  if (state.pct === null) {
    return <p className="mt-4 text-xs text-ink/40">No attempts yet in this section.</p>;
  }

  return (
    <div className="mt-4">
      <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
        <div
          className={
            "h-full " +
            (state.pct >= 70 ? "bg-emerald-500" : state.pct >= 50 ? "bg-amber-500" : "bg-danger")
          }
          style={{ width: `${state.pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink/40">
        {state.pct}% accuracy across {state.total} answered questions
      </p>
    </div>
  );
}
