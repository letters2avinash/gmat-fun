"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmtClock, seriesFetch } from "@/lib/series/client";
import type { Attempt, PublicTest } from "@/lib/series/types";

type Answers = Record<string, string | null>;
type Times = Record<string, number>;

const AUTOSAVE_MS = 15_000;

export default function TestPlayer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [test, setTest] = useState<PublicTest | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [current, setCurrent] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs read by timers and the unload path, so they never see stale state.
  const timesRef = useRef<Times>({});
  const activeRef = useRef<{ n: number; start: number } | null>(null);
  const answersRef = useRef<Answers>({});
  const flaggedRef = useRef<number[]>([]);
  const submittedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    flaggedRef.current = flagged;
  }, [flagged]);

  // Adds time spent on the question being left to the running total.
  function flushActive(now = Date.now()) {
    const a = activeRef.current;
    if (!a) return;
    const key = String(a.n);
    timesRef.current[key] = (timesRef.current[key] ?? 0) + (now - a.start);
    activeRef.current = { n: a.n, start: now };
  }

  function goTo(n: number) {
    flushActive();
    activeRef.current = { n, start: Date.now() };
    setCurrent(n);
  }

  // Start or resume the attempt, then load the test (no answers included).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const started = await seriesFetch<{ attempt: Attempt }>("/api/series/attempts", {
          method: "POST",
          body: { testId: Number(id) },
        });
        const full = await seriesFetch<{ attempt: Attempt; test: PublicTest; remainingSec: number }>(
          `/api/series/attempts/${started.attempt.id}`
        );
        if (full.attempt.status === "submitted") {
          router.replace(`/result/${full.attempt.id}`);
          return;
        }
        timesRef.current = { ...(full.attempt.times_ms ?? {}) };
        setTest(full.test);
        setAttemptId(full.attempt.id);
        setAnswers(full.attempt.answers ?? {});
        setFlagged(full.attempt.flagged ?? []);
        setRemaining(full.remainingSec);
        activeRef.current = { n: 1, start: Date.now() };
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id, router]);

  // Countdown.
  const running = remaining !== null && test !== null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setRemaining((r) => (r === null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(t);
  }, [running]);

  async function save() {
    if (!attemptId || submittedRef.current) return;
    flushActive();
    try {
      await seriesFetch(`/api/series/attempts/${attemptId}`, {
        method: "PUT",
        body: { answers: answersRef.current, times: timesRef.current, flagged: flaggedRef.current },
      });
    } catch {
      // Autosave is best-effort; the next tick or the final submit retries.
    }
  }

  // Autosave on an interval, and once more when the tab is hidden.
  useEffect(() => {
    if (!attemptId) return;
    const t = setInterval(save, AUTOSAVE_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onHide);
    };
    // save reads only refs, so it is safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  async function submit(auto: boolean) {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    flushActive();
    try {
      await seriesFetch(`/api/series/attempts/${attemptId}/submit`, {
        method: "POST",
        body: {
          answers: answersRef.current,
          times: timesRef.current,
          flagged: flaggedRef.current,
          autoSubmitted: auto,
        },
      });
      router.push(`/result/${attemptId}`);
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(`Could not submit: ${(e as Error).message}. Your answers are saved; try again.`);
    }
  }

  // Time is up: submit what was saved.
  useEffect(() => {
    if (remaining === 0 && !submittedRef.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function choose(n: number, letter: string) {
    if (submittedRef.current) return;
    setAnswers((prev) => ({ ...prev, [String(n)]: prev[String(n)] === letter ? null : letter }));
  }

  function toggleFlag(n: number) {
    setFlagged((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  if (error && !test) {
    return (
      <div className="rounded-xl2 border border-danger/30 bg-danger/5 p-5 text-sm">
        <p className="text-danger">{error}</p>
        <Link href="/" className="mt-3 inline-block text-brand hover:underline">Back to tests</Link>
      </div>
    );
  }
  if (!test || remaining === null || !attemptId) {
    return <p className="text-sm text-ink/60">Loading test…</p>;
  }

  const q = test.questions.find((x) => x.n === current) ?? test.questions[0];
  const passage = q.passageId ? test.passages[q.passageId] : null;
  const shared = passage?.text ?? q.stimulus;
  const answeredCount = test.questions.filter((x) => answers[String(x.n)]).length;
  const unanswered = test.questions.length - answeredCount;
  const low = remaining <= 300;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-ink/10 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-medium">{test.name}</p>
          <p className="text-xs text-ink/60">{answeredCount}/{test.questions.length} answered · {flagged.length} flagged</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-lg tabular-nums ${low ? "text-danger" : "text-ink"}`}>
            {fmtClock(remaining)}
          </span>
          {confirming ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink/70">
                {unanswered > 0 ? `${unanswered} unanswered. ` : ""}Submit now?
              </span>
              <button
                disabled={submitting}
                onClick={() => submit(false)}
                className="rounded-full bg-brand px-3 py-1.5 font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
              <button onClick={() => setConfirming(false)} className="rounded-full border border-ink/15 px-3 py-1.5">
                Keep going
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white"
            >
              Submit test
            </button>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl2 border border-ink/10 bg-white p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink/50">
            {q.section === "CR" ? "Critical Reasoning" : "Reading Comprehension"}
          </p>
          {shared ? (
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-line pr-1 text-[15px] leading-relaxed">
              {shared}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl2 border border-ink/10 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-ink/60">Question {q.n} of {test.questions.length} · {q.type}</p>
            <button
              onClick={() => toggleFlag(q.n)}
              className={`rounded-full border px-3 py-1 text-xs ${flagged.includes(q.n) ? "border-accent bg-accent-light text-accent-dark" : "border-ink/15"}`}
            >
              {flagged.includes(q.n) ? "Flagged" : "Flag"}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-line font-medium leading-relaxed">{q.stem}</p>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o) => {
              const sel = answers[String(q.n)] === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => choose(q.n, o.key)}
                  className={`flex gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] transition ${
                    sel ? "border-brand bg-brand-light" : "border-ink/10 hover:border-brand/40"
                  }`}
                >
                  <span className="font-semibold">{o.key}.</span>
                  <span>{o.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              disabled={current <= 1}
              onClick={() => goTo(current - 1)}
              className="rounded-full border border-ink/15 px-4 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={current >= test.questions.length}
              onClick={() => goTo(current + 1)}
              className="rounded-full border border-ink/15 px-4 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      <nav className="grid grid-cols-8 gap-2 sm:grid-cols-12">
        {test.questions.map((x) => {
          const isAnswered = !!answers[String(x.n)];
          const isFlag = flagged.includes(x.n);
          const isCur = x.n === current;
          return (
            <button
              key={x.n}
              onClick={() => goTo(x.n)}
              className={`relative h-9 rounded-lg border text-sm font-medium ${
                isCur ? "border-ink bg-ink text-white" : isAnswered ? "border-brand/40 bg-brand-light" : "border-ink/15 bg-white"
              }`}
            >
              {x.n}
              {isFlag ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" /> : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
