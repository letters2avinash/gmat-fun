"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { seriesFetch, fmtSec } from "@/lib/series/client";
import type { Attempt, TestListItem } from "@/lib/series/types";
import { scaledScore } from "@/lib/series/scoring";
import SeriesTips from "@/components/series/SeriesTips";
import SatisfactionPrompt from "@/components/series/SatisfactionPrompt";

export default function SeriesHub() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    createBrowserSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setSignedIn(!!data.session);
        setReady(true);
      });
  }, []);

  if (!ready) return <p className="text-sm text-ink/60">Loading…</p>;
  return signedIn ? <Tests /> : <Login onSignedIn={() => setSignedIn(true)} />;
}

function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await createBrowserSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError("That email and password did not work.");
      return;
    }
    onSignedIn();
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-xl2 border border-ink/10 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-ink/60">Use the email and password you were given.</p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-ink/15 px-3 py-2"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-ink/15 px-3 py-2"
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Tests() {
  const [tests, setTests] = useState<TestListItem[] | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      seriesFetch<{ tests: TestListItem[] }>("/api/series/tests"),
      seriesFetch<{ attempts: Attempt[] }>("/api/series/attempts"),
    ])
      .then(([t, a]) => {
        setTests(t.tests);
        setAttempts(a.attempts);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl2 border border-danger/30 bg-danger/5 p-5 text-sm">
        <p className="text-danger">{error}</p>
        <p className="mt-2 text-ink/70">If this keeps happening, ask for access to be checked.</p>
      </div>
    );
  }
  if (!tests) return <p className="text-sm text-ink/60">Loading tests…</p>;

  const recent = attempts.slice(0, 5);
  const done = tests.filter((t) => t.attempts > 0).length;

  return (
    <div className="flex flex-col gap-8">
      <SeriesTips />
      <SatisfactionPrompt />
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Verbal tests</h1>
            <p className="text-sm text-ink/60">
              {tests.length} tests · 23 questions each · 45 minutes · {done} started
            </p>
          </div>
          <Link href="/analytics" className="rounded-full border border-ink/15 px-4 py-1.5 text-sm hover:bg-ink/5">
            View analytics
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tests.map((t) => (
            <Link
              key={t.id}
              href={`/test/${t.id}`}
              className="flex flex-col justify-between rounded-xl2 border border-ink/10 bg-white p-4 hover:border-brand/50"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Test {t.id}</p>
                <p className="mt-1 font-medium">
                  {t.attempts > 0 ? `${scaledScore(t.bestScore, t.questionCount)} / 90 best` : "Not attempted"}
                </p>
              </div>
              <p className="mt-3 text-xs text-ink/60">
                {t.lastStatus === "in_progress"
                  ? "In progress — resume"
                  : t.attempts > 0
                  ? `${t.attempts} submitted`
                  : "Start"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {recent.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Recent attempts</h2>
          <ul className="mt-3 divide-y divide-ink/10 rounded-xl2 border border-ink/10 bg-white">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  Test {a.test_id} ·{" "}
                  {a.status === "submitted"
                    ? `${scaledScore(a.correct, a.total)} / 90 · ${fmtSec(a.time_used_sec)}${a.auto_submitted ? " · time ran out" : ""}`
                    : "in progress"}
                </span>
                {a.status === "submitted" ? (
                  <Link href={`/series/result/${a.id}`} className="text-brand hover:underline">
                    Review
                  </Link>
                ) : (
                  <Link href={`/test/${a.test_id}`} className="text-brand hover:underline">
                    Resume
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
