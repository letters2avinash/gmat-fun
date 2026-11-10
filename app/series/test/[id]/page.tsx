"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmtClock, seriesFetch } from "@/lib/series/client";
import { sectionLabel, type Attempt, type PublicQuestion, type PublicTest } from "@/lib/series/types";

type Answers = Record<string, string | null>;
type Times = Record<string, number>;
type Phase = "gate" | "test" | "review";

const AUTOSAVE_MS = 15_000;
// GMAT Focus: up to three answers can be changed on the review screen of a section.
const EDIT_LIMIT = 3;

function changedCount(now: Answers, snap: Answers, total: number) {
  let c = 0;
  for (let n = 1; n <= total; n++) {
    if ((now[String(n)] ?? null) !== (snap[String(n)] ?? null)) c++;
  }
  return c;
}

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    // The browser refused (no user gesture, or unsupported). The test still works.
  }
}

function leaveFullscreen() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
  } catch {
    // Nothing to leave.
  }
}

export default function TestPlayer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("gate");
  const [test, setTest] = useState<PublicTest | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [current, setCurrent] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewSnapshot, setReviewSnapshot] = useState<Answers | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Refs read by timers and the unload path, so they never see stale state.
  const timesRef = useRef<Times>({});
  const activeRef = useRef<{ n: number; start: number } | null>(null);
  const answersRef = useRef<Answers>({});
  const flaggedRef = useRef<number[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    flaggedRef.current = flagged;
  }, [flagged]);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      leaveFullscreen();
    };
  }, []);

  // Adds time spent on the question being left to the running total.
  function flushActive(now = Date.now()) {
    const a = activeRef.current;
    if (!a) return;
    const key = String(a.n);
    timesRef.current[key] = (timesRef.current[key] ?? 0) + (now - a.start);
    activeRef.current = { n: a.n, start: now };
  }

  function startTiming(n: number) {
    activeRef.current = { n, start: Date.now() };
  }

  function stopTiming() {
    flushActive();
    activeRef.current = null;
  }

  // Forward only. There is no way back to an earlier question during the section.
  function next() {
    if (!test) return;
    if (current >= test.questions.length) {
      openReview();
      return;
    }
    flushActive();
    setCurrent(current + 1);
    activeRef.current = { n: current + 1, start: Date.now() };
  }

  function openReview() {
    stopTiming();
    setEditing(null);
    setReviewSnapshot({ ...answers });
    setNotice(null);
    setPhase("review");
  }

  function openEdit(n: number) {
    setEditing(n);
  }

  // Starts (or resumes) the attempt. Runs from the Begin click so full screen is allowed.
  async function begin() {
    setStarting(true);
    setError(null);
    await enterFullscreen();
    try {
      const started = await seriesFetch<{ attempt: Attempt }>("/api/series/attempts", {
        method: "POST",
        body: { testId: Number(id) },
      });
      const full = await seriesFetch<{ attempt: Attempt; test: PublicTest; remainingSec: number }>(
        `/api/series/attempts/${started.attempt.id}`
      );
      if (full.attempt.status === "submitted") {
        leaveFullscreen();
        router.replace(`/series/result/${full.attempt.id}`);
        return;
      }
      const saved = full.attempt.answers ?? {};
      const firstOpen = full.test.questions.find((q) => !saved[String(q.n)])?.n ?? 1;
      timesRef.current = { ...(full.attempt.times_ms ?? {}) };
      setTest(full.test);
      setAttemptId(full.attempt.id);
      setAnswers(saved);
      setFlagged(full.attempt.flagged ?? []);
      setRemaining(full.remainingSec);
      setCurrent(firstOpen);
      setPhase("test");
      startTiming(firstOpen);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  // Countdown runs from the start of the section, through review.
  const running = phase !== "gate" && remaining !== null;
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
    stopTiming();
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
      leaveFullscreen();
      router.push(`/series/result/${attemptId}`);
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(`Could not submit: ${(e as Error).message}. Your answers are saved; try again.`);
    }
  }

  // Time is up: skip review and submit what was saved.
  useEffect(() => {
    if (phase !== "gate" && remaining === 0 && !submittedRef.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function choose(n: number, letter: string) {
    if (submittedRef.current || !test) return;
    const cur = answersRef.current;
    const updated = { ...cur, [String(n)]: cur[String(n)] === letter ? null : letter };
    if (phase === "review" && reviewSnapshot) {
      if (changedCount(updated, reviewSnapshot, test.questions.length) > EDIT_LIMIT) {
        setNotice(`You can change up to ${EDIT_LIMIT} answers in this section.`);
        return;
      }
    }
    setNotice(null);
    setAnswers(updated);
  }

  function toggleFlag(n: number) {
    setFlagged((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  // ---- gate ---------------------------------------------------------------

  if (phase === "gate") {
    // Read from the URL: `test` is only loaded after "Begin section".
    const isQuant = Number(id) >= 100 && Number(id) < 200;
    const isDi = Number(id) >= 200;
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-canvas">
        <div className="mx-auto mt-12 max-w-xl rounded-xl2 border border-ink/10 bg-white p-8">
          <p className="text-sm text-ink/60">{isDi ? "GMAT Data Insights Section" : isQuant ? "GMAT Quantitative Section" : "GMAT Verbal Section"}</p>
          <h1 className="mt-1 text-2xl font-semibold">{isDi ? `Data Insights ${Number(id) - 200}` : isQuant ? `Quant ${Number(id) - 100}` : `Test ${id}`}</h1>
          <div className="mt-6 flex flex-col gap-3 text-[15px] leading-relaxed">
            <p>This section has {isDi ? 20 : isQuant ? 21 : 23} questions and 45 minutes.</p>
            <p>You can only move forward. You cannot return to an earlier question during the section.</p>
            <p>You can flag any question. Flagged and unanswered questions are shown again on the review screen.</p>
            <p>When you reach the last question, you review every question. You can change up to three answers before you submit.</p>
            <p>The section opens in full screen. Leaving full screen does not stop the timer.</p>
          </div>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <div className="mt-8 flex items-center justify-between">
            <Link href="/" className="text-sm text-brand hover:underline">Back to tests</Link>
            <button
              onClick={begin}
              disabled={starting}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {starting ? "Starting…" : "Begin section"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!test || remaining === null || !attemptId) {
    return <p className="p-6 text-sm text-ink/60">Loading test…</p>;
  }

  const total = test.questions.length;
  const answeredCount = test.questions.filter((x) => answers[String(x.n)]).length;
  const unanswered = total - answeredCount;
  const low = remaining <= 300;
  const editsUsed = reviewSnapshot ? changedCount(answers, reviewSnapshot, total) : 0;

  const header = (title: string, sub: string) => (
    <header className="flex items-center justify-between gap-4 border-b border-ink/10 bg-white px-5 py-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-ink/60">{sub}</p>
      </div>
      <span className={`font-mono text-xl tabular-nums ${low ? "text-danger" : "text-ink"}`}>{fmtClock(remaining)}</span>
    </header>
  );

  const fullscreenBanner = !isFull ? (
    <div className="flex items-center justify-between gap-3 bg-accent-light px-5 py-2 text-sm">
      <span>You left full screen. The timer is still running.</span>
      <button onClick={enterFullscreen} className="rounded-full border border-ink/20 bg-white px-3 py-1 text-xs">
        Return to full screen
      </button>
    </div>
  ) : null;

  const errorBanner = error ? <p className="bg-danger/5 px-5 py-2 text-sm text-danger">{error}</p> : null;

  // ---- test ------------------------------------------------------------

  if (phase === "test") {
    const q = test.questions.find((x) => x.n === current) ?? test.questions[0];
    const isQuantTest = test.id >= 100 && test.id < 200;
    const isDiTest = test.id >= 200;
    return (
      <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-canvas">
        {header(
          isDiTest ? "Data Insights" : isQuantTest ? "Quantitative Reasoning" : "Verbal Section",
          `Question ${current} of ${total} · ${answeredCount} answered`
        )}
        {fullscreenBanner}
        {errorBanner}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {hasSharedContent(test, q) ? (
            <QuestionPanel test={test} q={q} side="passage" />
          ) : null}
          <QuestionPanel
            test={test}
            q={q}
            side="question"
            answer={answers[String(q.n)] ?? null}
            isFlagged={flagged.includes(q.n)}
            onChoose={(l) => choose(q.n, l)}
            onFlag={() => toggleFlag(q.n)}
          />
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-ink/10 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            {!answers[String(current)] ? (
              <span className="text-sm text-ink/60">Select an answer to continue.</span>
            ) : null}
            <button
              onClick={next}
              disabled={!answers[String(current)]}
              className="rounded-full bg-ink px-6 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {current >= total ? "Review answers" : "Next"}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // ---- review ----------------------------------------------------------

  if (editing !== null) {
    const q = test.questions.find((x) => x.n === editing) ?? test.questions[0];
    return (
      <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-canvas">
        {header("Review", `Question ${editing} of ${total}`)}
        {fullscreenBanner}
        {errorBanner}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {hasSharedContent(test, q) ? (
            <QuestionPanel test={test} q={q} side="passage" />
          ) : null}
          <QuestionPanel
            test={test}
            q={q}
            side="question"
            answer={answers[String(q.n)] ?? null}
            isFlagged={flagged.includes(q.n)}
            onChoose={(l) => choose(q.n, l)}
            onFlag={() => toggleFlag(q.n)}
          />
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white px-5 py-3">
          <div className="text-sm">
            <p className="text-ink/70">Answer changes used: {editsUsed} of {EDIT_LIMIT}</p>
            {notice ? <p className="text-danger">{notice}</p> : null}
          </div>
          <button onClick={() => setEditing(null)} className="rounded-full bg-ink px-6 py-2 text-sm font-medium text-white">
            Back to review
          </button>
        </footer>
      </div>
    );
  }

  const flaggedCount = flagged.length;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-canvas">
      {header("Review", `${answeredCount} answered · ${unanswered} not answered · ${flaggedCount} flagged`)}
      {fullscreenBanner}
      {errorBanner}
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <h1 className="text-xl font-semibold">Review your answers</h1>
        <p className="mt-2 text-sm text-ink/70">
          Select any question to review or change its answer. You can change up to {EDIT_LIMIT} answers in this section. Once you submit, your answers are final.
        </p>
        <p className="mt-3 text-sm text-ink/70">Answer changes used: {editsUsed} of {EDIT_LIMIT}</p>
        {notice ? <p className="mt-2 text-sm text-danger">{notice}</p> : null}

        <div className="mt-6 grid grid-cols-6 gap-3 sm:grid-cols-8">
          {test.questions.map((x) => {
            const isAnswered = !!answers[String(x.n)];
            const isFlag = flagged.includes(x.n);
            return (
              <button
                key={x.n}
                onClick={() => openEdit(x.n)}
                className={`relative h-12 rounded-lg border text-sm font-medium ${
                  isAnswered ? "border-brand/40 bg-brand-light" : "border-ink/20 bg-white"
                }`}
              >
                {x.n}
                {isFlag ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" /> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink/60">
          Shaded: answered. Outlined: not answered. Dot: flagged.
        </p>

        <div className="mt-10 border-t border-ink/10 pt-6">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-ink/80">
                {unanswered > 0 ? `${unanswered} question${unanswered === 1 ? "" : "s"} not answered. ` : ""}
                Submit the section now?
              </span>
              <button
                disabled={submitting}
                onClick={() => submit(false)}
                className="rounded-full bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
              <button onClick={() => setConfirming(false)} className="rounded-full border border-ink/15 px-4 py-2">
                Keep reviewing
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white"
            >
              Submit section
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// Quant questions usually have no passage: the question then takes the full width.
function hasSharedContent(test: PublicTest, q: PublicQuestion): boolean {
  const passage = q.passageId ? test.passages[q.passageId] : null;
  return !!(passage?.text || q.stimulus || q.image);
}

// One side of the screen. The passage side shows the shared text; the question
// side shows the stem, options, and flag control.
function QuestionPanel({
  test,
  q,
  side,
  answer,
  isFlagged,
  onChoose,
  onFlag,
}: {
  test: PublicTest;
  q: PublicQuestion;
  side: "passage" | "question";
  answer?: string | null;
  isFlagged?: boolean;
  onChoose?: (letter: string) => void;
  onFlag?: () => void;
}) {
  if (side === "passage") {
    const passage = q.passageId ? test.passages[q.passageId] : null;
    const shared = passage?.text ?? q.stimulus;
    return (
      <section className="min-h-0 flex-1 overflow-y-auto border-b border-ink/10 bg-white p-6 md:border-b-0 md:border-r">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink/50">
          {sectionLabel(q.section)}
        </p>
        {shared ? <div className="whitespace-pre-line text-[15px] leading-relaxed">{shared}</div> : null}
        {q.image ? <img src={q.image} alt={`Figure for question ${q.n}`} className="mt-2 max-w-full" /> : null}
      </section>
    );
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink/60">Question {q.n}</p>
        {onFlag ? (
          <button
            onClick={onFlag}
            className={`rounded-full border px-3 py-1 text-xs ${
              isFlagged ? "border-accent bg-accent-light text-accent-dark" : "border-ink/15"
            }`}
          >
            {isFlagged ? "Flagged" : "Flag"}
          </button>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-line font-medium leading-relaxed">{q.stem}</p>
      {q.statements ? (
        <div className="mt-4 flex flex-col gap-3">
          {Object.entries(q.statements).map(([k, text]) => (
            <p key={k} className="whitespace-pre-line leading-relaxed">
              <span className="font-semibold">{k}</span> {text}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-2">
        {q.options.map((o) => {
          const sel = answer === o.key;
          return (
            <button
              key={o.key}
              onClick={() => onChoose?.(o.key)}
              className={`flex gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] transition ${
                sel ? "border-brand bg-brand-light" : "border-ink/10 bg-white hover:border-brand/40"
              }`}
            >
              <span className="font-semibold">{o.key}.</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
