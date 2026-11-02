// Client-safe type for the analytics payload. Mirrors computeAnalytics in analytics.ts.
export type AnalyticsData = {
  summary: {
    attempts: number;
    avgScorePct: number | null;
    avgTimeUsedSec: number | null;
    avgSecPerQuestion: number | null;
    autoSubmitted: number;
    unanswered: number;
  };
  questionAnalysis: {
    byType: { type: string; attempted: number; correct: number; pct: number | null; avgSec: number | null }[];
    bySection: { label: string; attempted: number; correct: number; pct: number | null; avgSec: number | null }[];
    topMissed: { testId: number; n: number; type: string; section: string; stem: string; attempted: number; missed: number }[];
  };
  timeAnalysis: {
    buckets: { label: string; attempted: number; pct: number | null }[];
    correctAvgSec: number | null;
    wrongAvgSec: number | null;
    pacing: { attemptId: string; testId: number; submittedAt: string | null; correct: number; total: number; timeUsedSec: number; autoSubmitted: boolean }[];
  };
};
