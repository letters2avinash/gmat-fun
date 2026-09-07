"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

interface TopicStat {
  key: string;
  section: string;
  total: number;
  correct: number;
}

const SECTION_LABEL: Record<string, string> = {
  quant: "Quant",
  verbal: "Verbal",
  data_insights: "Data Insights",
};

export default function AnalyticsTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [sectionStats, setSectionStats] = useState<
    Record<string, { total: number; correct: number }>
  >({});
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    (async () => {
      const [{ data: responses }, { data: diResponses }] = await Promise.all([
        supabase
          .from("attempt_responses")
          .select("is_correct, question:questions(section, topic)")
          .not("is_correct", "is", null),
        supabase
          .from("di_attempt_responses")
          .select("is_correct, item:di_items(category, di_type)"),
      ]);

      const bySection: Record<string, { total: number; correct: number }> = {};
      const byTopic: Record<string, TopicStat> = {};

      for (const r of (responses ?? []) as any[]) {
        const q = r.question;
        if (!q) continue;
        const section = q.section as string;
        const topic = q.topic as string;

        bySection[section] ??= { total: 0, correct: 0 };
        bySection[section].total++;
        if (r.is_correct) bySection[section].correct++;

        const key = `${section}:${topic}`;
        byTopic[key] ??= { key: topic, section, total: 0, correct: 0 };
        byTopic[key].total++;
        if (r.is_correct) byTopic[key].correct++;
      }

      for (const r of (diResponses ?? []) as any[]) {
        const item = r.item;
        if (!item) continue;

        bySection["data_insights"] ??= { total: 0, correct: 0 };
        bySection["data_insights"].total++;
        if (r.is_correct) bySection["data_insights"].correct++;

        const key = `data_insights:${item.di_type}`;
        byTopic[key] ??= {
          key: String(item.di_type).replace(/_/g, " "),
          section: "data_insights",
          total: 0,
          correct: 0,
        };
        byTopic[key].total++;
        if (r.is_correct) byTopic[key].correct++;
      }

      setSectionStats(bySection);
      setTopicStats(
        Object.values(byTopic).sort((a, b) => a.correct / a.total - b.correct / b.total)
      );
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="text-sm text-ink/50">Crunching your numbers…</p>;

  const totalAnswered = Object.values(sectionStats).reduce((sum, s) => sum + s.total, 0);

  if (totalAnswered === 0) {
    return (
      <div className="rounded-xl2 border border-ink/10 p-8 text-center">
        <p className="text-ink/60">
          No answered questions yet — analytics will show up once you complete a
          test or practice set.
        </p>
      </div>
    );
  }

  const weakest = topicStats.filter((t) => t.total >= 3).slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-bold text-lg mb-3">By section</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(["quant", "verbal", "data_insights"] as const).map((s) => {
            const stat = sectionStats[s];
            const pct = stat ? Math.round((stat.correct / stat.total) * 100) : null;
            return (
              <div key={s} className="rounded-xl2 border border-ink/10 p-4">
                <div className="text-xs font-semibold text-ink/50 uppercase tracking-wide">
                  {SECTION_LABEL[s]}
                </div>
                <div className="mt-1 text-2xl font-extrabold">
                  {pct !== null ? `${pct}%` : "—"}
                </div>
                <div className="text-xs text-ink/40 mt-0.5">
                  {stat ? `${stat.correct}/${stat.total} correct` : "No attempts yet"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {weakest.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-1">Focus on next</h2>
          <p className="text-sm text-ink/60 mb-3">
            Your lowest-accuracy topics with at least 3 questions answered.
          </p>
          <div className="flex flex-col gap-2">
            {weakest.map((t) => (
              <div
                key={t.key + t.section}
                className="flex items-center justify-between rounded-xl2 border border-ink/10 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-sm capitalize">{t.key}</div>
                  <div className="text-xs text-ink/50">
                    {SECTION_LABEL[t.section] ?? t.section}
                  </div>
                </div>
                <div className="font-bold text-danger">
                  {Math.round((t.correct / t.total) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-bold text-lg mb-3">By topic</h2>
        <div className="flex flex-col gap-1.5">
          {topicStats.map((t) => {
            const pct = Math.round((t.correct / t.total) * 100);
            return (
              <div key={t.key + t.section} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm capitalize truncate">{t.key}</div>
                <div className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
                  <div
                    className={
                      "h-full " +
                      (pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-danger")
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right text-sm font-semibold">{pct}%</div>
                <div className="w-16 shrink-0 text-right text-xs text-ink/40">
                  {t.correct}/{t.total}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
