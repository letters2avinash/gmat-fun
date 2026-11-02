import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getFullTest, gradeAttempt, requireSeriesAdmin, sanitizeAnswers, sanitizeTimes } from "@/lib/series/server";

// GET /api/series/admin/attempts/[id] — one attempt in full, with the chat transcript.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeriesAdmin(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const admin = createServerSupabase();
  const { data: attempt } = await admin
    .from("series_attempts")
    .select("id,email,test_id,status,started_at,submitted_at,answers,times_ms,correct,total,time_used_sec,auto_submitted")
    .eq("id", id)
    .maybeSingle();
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const test = getFullTest(attempt.test_id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const { review } = gradeAttempt(test, sanitizeAnswers(attempt.answers), sanitizeTimes(attempt.times_ms));
  const { data: chat } = await admin
    .from("series_chat_messages")
    .select("n,role,content,created_at")
    .eq("attempt_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      email: attempt.email,
      testId: attempt.test_id,
      testName: test.name,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      correct: attempt.correct,
      total: attempt.total,
      timeUsedSec: attempt.time_used_sec,
      autoSubmitted: attempt.auto_submitted,
    },
    questions: test.questions.map((q) => ({
      n: q.n,
      section: q.section,
      type: q.type,
      stem: q.stem,
      options: q.options,
      stimulus: q.stimulus ?? (q.passageId ? test.passages[q.passageId]?.text ?? null : null),
      answer: q.answer,
    })),
    review,
    chat: chat ?? [],
  });
}
