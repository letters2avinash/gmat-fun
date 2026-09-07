"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";

interface Row {
  id: string;
  kind: "test" | "di";
  mode: string;
  section: string | null;
  topic: string | null;
  status: string;
  score: number | null;
  started_at: string;
  href: string;
}

const SECTION_LABEL: Record<string, string> = {
  quant: "Quant",
  verbal: "Verbal",
  data_insights: "Data Insights",
};

export default function AttemptsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    (async () => {
      const [{ data: tests }, { data: dis }] = await Promise.all([
        supabase
          .from("test_attempts")
          .select("id, mode, section, topic, status, total_score, score, started_at")
          .eq("user_id", userId)
          .order("started_at", { ascending: false }),
        supabase
          .from("di_attempts")
          .select(
            "id, di_type, category, status, scaled_score, score, started_at, parent_test_attempt_id"
          )
          .eq("user_id", userId)
          .is("parent_test_attempt_id", null)
          .order("started_at", { ascending: false }),
      ]);

      const testRows: Row[] = (tests ?? []).map((t: any) => ({
        id: t.id,
        kind: "test" as const,
        mode: t.mode,
        section: t.section,
        topic: t.topic,
        status: t.status,
        score: t.mode === "full-length" ? t.total_score : t.score,
        started_at: t.started_at,
        href: `/results/${t.id}`,
      }));

      const diRows: Row[] = (dis ?? []).map((d: any) => ({
        id: d.id,
        kind: "di" as const,
        mode: "data-insights",
        section: "data_insights",
        topic: d.di_type === "mixed" ? "Mixed" : String(d.di_type).replace(/_/g, " "),
        status: d.status,
        score: d.scaled_score ?? d.score,
        started_at: d.started_at,
        href: `/results/di/${d.id}`,
      }));

      setRows(
        [...testRows, ...diRows].sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )
      );
    })();
  }, [userId]);

  if (rows === null) {
    return <p className="text-sm text-ink/50">Loading your attempts…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl2 border border-ink/10 p-8 text-center">
        <p className="text-ink/60">No attempts yet.</p>
        <Link
          href="/test/full-length"
          className="mt-3 inline-block text-brand font-semibold text-sm"
        >
          Start your first test →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <Link
          key={`${r.kind}-${r.id}`}
          href={r.href}
          className="flex items-center justify-between gap-3 rounded-xl2 border border-ink/10 px-4 py-3.5 hover:border-brand/40 transition"
        >
          <div>
            <div className="font-semibold text-sm capitalize">
              {r.mode.replace(/-/g, " ")}
              {r.section && r.mode !== "full-length"
                ? ` · ${SECTION_LABEL[r.section] ?? r.section}`
                : ""}
              {r.topic ? ` · ${r.topic}` : ""}
            </div>
            <div className="text-xs text-ink/50 mt-0.5">
              {new Date(r.started_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {r.status === "completed" ? (
              <span className="font-bold text-brand">{r.score ?? "—"}</span>
            ) : (
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                {r.status === "in_progress" ? "In progress" : "Abandoned"}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
