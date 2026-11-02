"use client";

import Link from "next/link";
import { fmtSec } from "@/lib/series/client";
import type { AnalyticsData } from "@/lib/series/analytics-types";

// Renders the question and time analytics. Used for the student's own view
// and for the teacher's view of any student.
export default function AnalyticsView({ data }: { data: AnalyticsData }) {
  const { summary, questionAnalysis: qa, timeAnalysis: ta } = data;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Average score" value={summary.avgScorePct !== null ? `${summary.avgScorePct}%` : "—"} />
        <Stat label="Avg time per question" value={fmtSec(summary.avgSecPerQuestion)} />
        <Stat label="Avg time used per test" value={fmtSec(summary.avgTimeUsedSec)} />
        <Stat label="Time ran out" value={String(summary.autoSubmitted)} sub={`${summary.unanswered} unanswered`} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Question analysis</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Card title="By section">
            {qa.bySection.map((s) => (
              <Bar key={s.label} label={s.label} pct={s.pct} sub={`${s.correct}/${s.attempted} · avg ${fmtSec(s.avgSec)}`} />
            ))}
          </Card>
          <Card title="By question type (weakest first)">
            {qa.byType.map((t) => (
              <Bar key={t.type} label={t.type} pct={t.pct} sub={`${t.correct}/${t.attempted} · avg ${fmtSec(t.avgSec)}`} />
            ))}
          </Card>
        </div>

        <div className="mt-4 rounded-xl2 border border-ink/10 bg-white p-4">
          <p className="px-2 pb-2 text-sm font-medium text-ink/70">Most-missed questions</p>
          {qa.topMissed.length === 0 ? (
            <p className="px-2 text-sm text-ink/60">No misses yet.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {qa.topMissed.map((m) => (
                <li key={`${m.testId}-${m.n}`}>
                  <Link
                    href={`/series/result/${m.attemptId}?q=${m.n}`}
                    className="block rounded-lg px-2 py-2.5 text-sm hover:bg-canvas"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-brand">Test {m.testId} · Q{m.n} · {m.type}</span>
                      <span className="whitespace-nowrap text-ink/60">missed {m.missed} of {m.attempted}</span>
                    </div>
                    <p className="mt-1 truncate text-ink/60">{m.stem}…</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Time analysis</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Card title="Accuracy by time spent on a question">
            {ta.buckets.map((b) => (
              <Bar key={b.label} label={b.label} pct={b.pct} sub={`${b.attempted} questions`} />
            ))}
            <p className="pt-2 text-sm text-ink/70">
              Correct answers took {fmtSec(ta.correctAvgSec)} on average; wrong ones took {fmtSec(ta.wrongAvgSec)}.
            </p>
          </Card>
          <Card title="Pacing per test">
            <ul className="divide-y divide-ink/10 text-sm">
              {ta.pacing.map((p) => (
                <li key={p.attemptId} className="flex items-center justify-between gap-3 py-2">
                  <span>Test {p.testId}</span>
                  <span className="text-ink/60">
                    {p.correct}/{p.total} · {fmtSec(p.timeUsedSec)} of 45m
                    {p.autoSubmitted ? " · time ran out" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-white p-4">
      <p className="text-xs text-ink/60">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub ? <p className="text-xs text-ink/50">{sub}</p> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-white p-4">
      <p className="px-1 pb-3 text-sm font-medium text-ink/70">{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Bar({ label, pct, sub }: { label: string; pct: number | null; sub: string }) {
  const v = pct ?? 0;
  const color = v >= 70 ? "bg-success" : v >= 50 ? "bg-accent" : "bg-danger";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-ink/60">{pct !== null ? `${pct}%` : "—"}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink/50">{sub}</p>
    </div>
  );
}
