import { NextRequest, NextResponse } from "next/server";
import {
  getFullTest,
  gradeAttempt,
  isExpired,
  remainingSec,
  requireSeriesUser,
  sanitizeAnswers,
  sanitizeTimes,
  toPublicTest,
} from "@/lib/series/server";
import {
  autoSubmitIfExpired,
  getAttemptForUser,
  saveProgress,
} from "@/lib/series/attempts";

type Params = { params: Promise<{ id: string }> };

// GET /api/series/attempts/[id]
// In progress: the test without answers, saved state, and seconds remaining.
// Submitted:   the test, the student's answers, and the per-question review.
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  let attempt = await getAttemptForUser(id, auth.email);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const test = getFullTest(attempt.test_id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  attempt = await autoSubmitIfExpired(attempt, test);

  if (attempt.status === "in_progress") {
    return NextResponse.json({
      attempt,
      test: toPublicTest(test),
      remainingSec: remainingSec(attempt, test),
    });
  }

  const { review } = gradeAttempt(test, sanitizeAnswers(attempt.answers), sanitizeTimes(attempt.times_ms));
  return NextResponse.json({
    attempt,
    test: toPublicTest(test),
    review,
    expired: isExpired(attempt, test),
  });
}

// PUT /api/series/attempts/[id]  { answers, times, flagged }
// Autosave while the test is running. Ignored once submitted.
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const attempt = await getAttemptForUser(id, auth.email);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const test = getFullTest(attempt.test_id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const settled = await autoSubmitIfExpired(attempt, test);
  if (settled.status === "submitted") {
    return NextResponse.json({ attempt: settled, expired: true });
  }

  const body = (await req.json().catch(() => ({}))) as {
    answers?: unknown;
    times?: unknown;
    flagged?: unknown;
  };
  await saveProgress(attempt, body);
  return NextResponse.json({ ok: true, remainingSec: remainingSec(attempt, test) });
}
