"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AnalyticsView from "@/components/series/AnalyticsView";
import { fmtSec, seriesFetch } from "@/lib/series/client";
import type { AnalyticsData } from "@/lib/series/analytics-types";
import { scaledScore } from "@/lib/series/scoring";

type Student = {
  email: string;
  isAdmin: boolean;
  startedAttempts: number;
  submittedAttempts: number;
  avgScorePct: number | null;
  lastActive: string | null;
};

type StudentDetail = {
  email: string;
  attempts: {
    id: string;
    testId: number;
    testName: string;
    status: "in_progress" | "submitted";
    startedAt: string;
    submittedAt: string | null;
    correct: number | null;
    total: number;
    timeUsedSec: number | null;
    autoSubmitted: boolean;
    chatMessages: number;
    questionsDiscussed: number;
  }[];
  analytics: AnalyticsData;
};

export default function AdminPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seriesFetch<{ students: Student[] }>("/api/series/admin/students")
      .then((r) => setStudents(r.students))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    seriesFetch<StudentDetail>(`/api/series/admin/students/${encodeURIComponent(selected)}`)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [selected]);

  if (error) {
    return <div className="rounded-xl2 border border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</div>;
  }
  if (!students) return <p className="text-sm text-ink/60">Loading students…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-sm text-ink/60">Progress for everyone on the access list.</p>
      </div>

      <section className="rounded-xl2 border border-ink/10 bg-white p-2">
        <table className="w-full text-sm">
          <thead className="text-left text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Started</th>
              <th className="px-3 py-2 font-medium">Submitted</th>
              <th className="px-3 py-2 font-medium">Avg score</th>
              <th className="px-3 py-2 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {students.map((s) => (
              <tr
                key={s.email}
                onClick={() => setSelected(s.email)}
                className={`cursor-pointer hover:bg-canvas ${selected === s.email ? "bg-brand-light" : ""}`}
              >
                <td className="px-3 py-2.5 font-medium">
                  {s.email}
                  {s.isAdmin ? <span className="ml-2 text-xs text-ink/50">(admin)</span> : null}
                </td>
                <td className="px-3 py-2.5">{s.startedAttempts}</td>
                <td className="px-3 py-2.5">{s.submittedAttempts}</td>
                <td className="px-3 py-2.5">{s.avgScorePct !== null ? `${s.avgScorePct}%` : "—"}</td>
                <td className="px-3 py-2.5 text-ink/60">{s.lastActive ? new Date(s.lastActive).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && !detail ? <p className="text-sm text-ink/60">Loading {selected}…</p> : null}

      {detail ? (
        <>
          <section>
            <h2 className="text-lg font-semibold">Tests taken by {detail.email}</h2>
            <div className="mt-3 rounded-xl2 border border-ink/10 bg-white p-2">
              {detail.attempts.length === 0 ? (
                <p className="px-3 py-3 text-sm text-ink/60">No attempts yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-ink/60">
                    <tr>
                      <th className="px-3 py-2 font-medium">Test</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">Time used</th>
                      <th className="px-3 py-2 font-medium">Doubts chats</th>
                      <th className="px-3 py-2 font-medium">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {detail.attempts.map((a) => (
                      <tr key={a.id} className="hover:bg-canvas">
                        <td className="px-3 py-2.5 font-medium">
                          {a.status === "submitted" ? (
                            <Link href={`/series/admin/attempt/${a.id}`} className="text-brand hover:underline">{a.testName}</Link>
                          ) : (
                            a.testName
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {a.status === "submitted" ? (a.autoSubmitted ? "Time ran out" : "Submitted") : "In progress"}
                        </td>
                        <td className="px-3 py-2.5">{a.correct !== null ? `${scaledScore(a.correct, a.total)} / 90` : "—"}</td>
                        <td className="px-3 py-2.5">{fmtSec(a.timeUsedSec)}</td>
                        <td className="px-3 py-2.5">
                          {a.chatMessages ? `${a.questionsDiscussed} questions · ${a.chatMessages} msgs` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-ink/60">{new Date(a.startedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {detail.analytics.summary.attempts > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Analytics</h2>
              <AnalyticsView data={detail.analytics} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
