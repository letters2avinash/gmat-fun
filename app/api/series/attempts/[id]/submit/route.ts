import { NextRequest, NextResponse } from "next/server";
import { getFullTest, gradeAttempt, sanitizeAnswers, sanitizeTimes, requireSeriesUser } from "@/lib/series/server";
import { finalizeAttempt, getAttemptForUser } from "@/lib/series/attempts";

// POST /api/series/attempts/[id]/submit  { answers, times, flagged, autoSubmitted? }
// Grades on the server. The answer key never leaves the server.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const attempt = await getAttemptForUser(id, auth.email);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const test = getFullTest(attempt.test_id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    answers?: unknown;
    times?: unknown;
    flagged?: unknown;
    autoSubmitted?: boolean;
  };

  const done = await finalizeAttempt(attempt, test, {
    answers: body.answers,
    times: body.times,
    flagged: body.flagged,
    autoSubmitted: !!body.autoSubmitted,
  });

  const { review, correct, total } = gradeAttempt(
    test,
    sanitizeAnswers(done.answers),
    sanitizeTimes(done.times_ms)
  );
  return NextResponse.json({
    attempt: done,
    correct,
    total,
    review,
  });
}
