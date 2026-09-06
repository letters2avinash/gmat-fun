import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// GET /api/test/next-question?attemptId=...
// Picks an unseen question near the attempt's current difficulty, scoped
// to the attempt's section (and topic, if topic mode). Full-length mode
// cycles through all three sections evenly.
export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }

  const { data: seen } = await supabase
    .from("attempt_responses")
    .select("question_id")
    .eq("attempt_id", attemptId);
  const seenIds = (seen ?? []).map((r) => r.question_id);

  let query = supabase
    .from("questions")
    .select("*")
    .gte("difficulty", Math.floor(attempt.current_difficulty) - 1)
    .lte("difficulty", Math.ceil(attempt.current_difficulty) + 1)
    .limit(10);

  if (attempt.section) query = query.eq("section", attempt.section);
  if (attempt.topic) query = query.eq("topic", attempt.topic);
  if (seenIds.length) query = query.not("id", "in", `(${seenIds.join(",")})`);

  const { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ question: null, done: true });
  }

  // Pick the candidate whose difficulty is closest to the target — keeps
  // the test adaptive rather than random within the tolerance band.
  const target = attempt.current_difficulty;
  const question = candidates.reduce((best, q) =>
    Math.abs(q.difficulty - target) < Math.abs(best.difficulty - target)
      ? q
      : best
  );

  // Don't leak the correct answer/explanation to the client before it answers.
  const { correct_choice, explanation, ...safeQuestion } = question;

  return NextResponse.json({ question: safeQuestion, done: false });
}
