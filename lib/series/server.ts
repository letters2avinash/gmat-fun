// SERVER ONLY. Holds the answer key. Never import from a client component.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";
import rawTests from "@/data/series/tests.json";
import { canonicalDi, diAnswerCorrect, isDiPartAnswer } from "@/lib/series/di-answer";
import rawQaTests from "@/data/series/qa_tests.json";
import rawDiTests from "@/data/series/di_tests.json";
import type {
  Attempt,
  PublicQuestion,
  PublicTest,
  ReviewItem,
} from "@/lib/series/types";

export const SERIES = "sazzag";
export const QUESTIONS_PER_TEST = 23;
// Grace period so a slow network at the final second does not lose answers.
export const EXPIRY_GRACE_SEC = 30;

type RawQuestion = PublicQuestion & { answer: string; diAnswer?: unknown };
export type FullTest = Omit<PublicTest, "questions"> & { questions: RawQuestion[] };

const TESTS: FullTest[] = [
  ...(rawTests as unknown as { tests: FullTest[] }).tests,
  ...(rawQaTests as unknown as { tests: FullTest[] }).tests,
  // Data Insights tests: all question types are playable, so they are always on.
  ...(rawDiTests as unknown as { tests: FullTest[] }).tests,
];

export function getFullTest(id: number): FullTest | null {
  return TESTS.find((t) => t.id === id) ?? null;
}

export function listFullTests(): FullTest[] {
  return TESTS;
}

// Strip answers before anything leaves the server during a live test.
export function toPublicTest(t: FullTest): PublicTest {
  return {
    id: t.id,
    name: t.name,
    durationMinutes: t.durationMinutes,
    passages: t.passages,
    questions: t.questions.map(publicQuestion),
  };
}

// Strip every answer-bearing field before a question leaves the server.
// Data Insights questions carry extra answer data (rows, dropdown keys, diAnswer).
function publicQuestion(q: RawQuestion): PublicQuestion {
  const {
    answer: _answer,
    diAnswer: _diAnswer,
    tpaMap: _tpaMap,
    gt: _gt,
    rows: _rows,
    answerSource: _answerSource,
    answerStatus: _answerStatus,
    answerNote: _answerNote,
    ...rest
  } = q as RawQuestion & Record<string, unknown>;
  return rest as unknown as PublicQuestion;
}

// ---- auth ----------------------------------------------------------------

export async function requireSeriesUser(
  req: NextRequest
): Promise<{ email: string } | { response: NextResponse }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }

  // Verify the token with Supabase Auth. Never trust a userId from the body.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await anon.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) {
    return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }

  const admin = createServerSupabase();
  const { data: row } = await admin
    .from("series_access")
    .select("email")
    .eq("email", email)
    .eq("series", SERIES)
    .maybeSingle();
  if (!row) {
    return {
      response: NextResponse.json(
        { error: "This account does not have access to the test series." },
        { status: 403 }
      ),
    };
  }
  return { email };
}

// ---- answers and grading ---------------------------------------------------

const LETTERS = new Set(["A", "B", "C", "D", "E"]);

export function sanitizeAnswers(input: unknown): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > QUESTIONS_PER_TEST) continue;
    out[String(n)] =
      typeof v === "string" && (LETTERS.has(v) || isDiPartAnswer(v)) ? v : null;
  }
  return out;
}

export function sanitizeTimes(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > QUESTIONS_PER_TEST) continue;
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[String(n)] = Math.min(Math.round(v), 60 * 60 * 1000);
    }
  }
  return out;
}

export function sanitizeFlagged(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<number>();
  for (const v of input) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && n <= QUESTIONS_PER_TEST) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function gradeAttempt(
  test: FullTest,
  answers: Record<string, string | null>,
  times: Record<string, number>
): { correct: number; total: number; review: ReviewItem[] } {
  let correct = 0;
  const review: ReviewItem[] = test.questions.map((q) => {
    const picked = answers[String(q.n)] ?? null;
    const ok =
      picked !== null &&
      (q.diAnswer !== undefined
        ? diAnswerCorrect(picked, canonicalDi(q.diAnswer))
        : picked === q.answer);
    if (ok) correct++;
    return {
      n: q.n,
      type: q.type,
      section: q.section,
      picked,
      correct: q.answer,
      ok,
      timeMs: times[String(q.n)] ?? 0,
    };
  });
  return { correct, total: test.questions.length, review };
}

export function isExpired(attempt: Attempt, test: FullTest, nowMs = Date.now()): boolean {
  const started = new Date(attempt.started_at).getTime();
  const limitSec = test.durationMinutes * 60 + EXPIRY_GRACE_SEC;
  return (nowMs - started) / 1000 > limitSec;
}

export function timeUsedSec(attempt: Attempt, test: FullTest, nowMs = Date.now()): number {
  const started = new Date(attempt.started_at).getTime();
  const elapsed = Math.max(0, Math.round((nowMs - started) / 1000));
  return Math.min(elapsed, test.durationMinutes * 60);
}

export function remainingSec(attempt: Attempt, test: FullTest, nowMs = Date.now()): number {
  return Math.max(0, test.durationMinutes * 60 - timeUsedSec(attempt, test, nowMs));
}

// ---- admin -----------------------------------------------------------------

// Same as requireSeriesUser, plus the is_admin flag on the access row.
export async function requireSeriesAdmin(
  req: NextRequest
): Promise<{ email: string } | { response: NextResponse }> {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth;
  const admin = createServerSupabase();
  const { data } = await admin
    .from("series_access")
    .select("is_admin")
    .eq("email", auth.email)
    .maybeSingle();
  if (!data?.is_admin) {
    return { response: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  }
  return auth;
}
