// SERVER ONLY. Aggregates submitted attempts into question and time analytics.
import { getFullTest, gradeAttempt, sanitizeAnswers, sanitizeTimes } from "@/lib/series/server";
import { scaledScore } from "@/lib/series/scoring";

export type AttemptRow = {
  id: string;
  test_id: number;
  answers: unknown;
  times_ms: unknown;
  time_used_sec: number | null;
  auto_submitted: boolean | null;
  submitted_at: string | null;
};

type Agg = { attempted: number; correct: number; timeMs: number; timed: number };
const blank = (): Agg => ({ attempted: 0, correct: 0, timeMs: 0, timed: 0 });
const pct = (a: Agg) => (a.attempted ? Math.round((a.correct / a.attempted) * 100) : null);
const avgSec = (a: Agg) => (a.timed ? Math.round(a.timeMs / a.timed / 100) / 10 : null);

export function computeAnalytics(attempts: AttemptRow[]) {
  const byType = new Map<string, Agg>();
  const bySection = { CR: blank(), RC: blank(), QA: blank(), DI: blank() };
  const overall = blank();
  const timing = { under30s: blank(), s30to90: blank(), s90to180: blank(), over180s: blank() };
  const correctTime = blank();
  const wrongTime = blank();
  let unanswered = 0;
  const missMap = new Map<string, { testId: number; n: number; type: string; section: "CR" | "RC" | "QA" | "DI"; stem: string; attempted: number; missed: number; attemptId: string }>();
  const pacing: {
    attemptId: string;
    testId: number;
    submittedAt: string | null;
    correct: number;
    total: number;
    timeUsedSec: number;
    autoSubmitted: boolean;
  }[] = [];

  for (const a of attempts) {
    const test = getFullTest(a.test_id);
    if (!test) continue;
    const answers = sanitizeAnswers(a.answers);
    const times = sanitizeTimes(a.times_ms);
    const { review, correct, total } = gradeAttempt(test, answers, times);

    pacing.push({
      attemptId: a.id,
      testId: a.test_id,
      submittedAt: a.submitted_at,
      correct,
      total,
      timeUsedSec: a.time_used_sec ?? 0,
      autoSubmitted: !!a.auto_submitted,
    });

    for (const r of review) {
      const t = byType.get(r.type) ?? blank();
      const sec = bySection[r.section];
      const bucket =
        r.timeMs === 0 ? null :
        r.timeMs < 30_000 ? timing.under30s :
        r.timeMs < 90_000 ? timing.s30to90 :
        r.timeMs < 180_000 ? timing.s90to180 : timing.over180s;

      const answered = r.picked !== null;
      if (!answered) unanswered++;
      const addTo = (g: Agg) => {
        g.attempted++;
        if (r.ok) g.correct++;
        if (r.timeMs > 0) { g.timeMs += r.timeMs; g.timed++; }
      };
      addTo(t);
      addTo(sec);
      addTo(overall);
      if (bucket) addTo(bucket);
      if (answered) addTo(r.ok ? correctTime : wrongTime);
      byType.set(r.type, t);

      const key = `${a.test_id}-${r.n}`;
      const m = missMap.get(key) ?? {
        testId: a.test_id,
        n: r.n,
        type: r.type,
        section: r.section,
        stem: test.questions.find((q) => q.n === r.n)?.stem.slice(0, 140) ?? "",
        attempted: 0,
        missed: 0,
        attemptId: a.id,
      };
      m.attempted++;
      if (!r.ok) m.missed++;
      m.attemptId = a.id; // latest attempt wins (attempts are in submit order)
      missMap.set(key, m);
    }
  }

  const typeRows = [...byType.entries()]
    .map(([type, g]) => ({ type, attempted: g.attempted, correct: g.correct, pct: pct(g), avgSec: avgSec(g) }))
    .sort((x, y) => (x.pct ?? 0) - (y.pct ?? 0));

  const bucketRow = (label: string, g: Agg) => ({ label, attempted: g.attempted, pct: pct(g) });

  const topMissed = [...missMap.values()]
    .filter((m) => m.missed > 0)
    .sort((x, y) => y.missed / y.attempted - x.missed / x.attempted || y.missed - x.missed)
    .slice(0, 20);

  return {
    summary: {
      attempts: attempts.length,
      avgScorePct: pct(overall),
      avgScore: pacing.length
        ? Math.round(pacing.reduce((s, p) => s + scaledScore(p.correct, p.total), 0) / pacing.length)
        : null,
      avgTimeUsedSec: pacing.length
        ? Math.round(pacing.reduce((s, p) => s + p.timeUsedSec, 0) / pacing.length)
        : null,
      avgSecPerQuestion: avgSec(overall),
      autoSubmitted: pacing.filter((p) => p.autoSubmitted).length,
      unanswered,
    },
    questionAnalysis: {
      byType: typeRows,
      bySection: [
        { label: "Critical Reasoning", ...bySection.CR, pct: pct(bySection.CR), avgSec: avgSec(bySection.CR) },
        { label: "Reading Comprehension", ...bySection.RC, pct: pct(bySection.RC), avgSec: avgSec(bySection.RC) },
        { label: "Quantitative Aptitude", ...bySection.QA, pct: pct(bySection.QA), avgSec: avgSec(bySection.QA) },
      ],
      topMissed,
    },
    timeAnalysis: {
      buckets: [
        bucketRow("Under 30s", timing.under30s),
        bucketRow("30–90s", timing.s30to90),
        bucketRow("90–180s", timing.s90to180),
        bucketRow("Over 180s", timing.over180s),
      ],
      correctAvgSec: avgSec(correctTime),
      wrongAvgSec: avgSec(wrongTime),
      pacing,
    },
  };
}

export type AnalyticsData = ReturnType<typeof computeAnalytics>;
