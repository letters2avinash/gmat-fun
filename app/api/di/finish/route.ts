import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { sectionScoreFromTheta } from "@/lib/scoring";

// POST /api/di/finish  body: { attemptId }
// Scores the DI module from its ability estimate (60-90 GMAT Focus scale).
// When this attempt is the DI module of a full-length test
// (parent_test_attempt_id set), also propagates the score onto the parent
// test_attempts row so /api/test/finish can combine all three sections.
export async function POST(req: NextRequest) {
  const { attemptId } = await req.json();
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: attempt, error } = await supabase
    .from("di_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  const scaledScore = sectionScoreFromTheta(attempt.current_theta);
  const legacyScore = attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0;

  const { data: updated, error: updateError } = await supabase
    .from("di_attempts")
    .update({
      status: "completed",
      score: legacyScore,
      scaled_score: scaledScore,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (attempt.parent_test_attempt_id) {
    await supabase
      .from("test_attempts")
      .update({ di_score: scaledScore })
      .eq("id", attempt.parent_test_attempt_id);
  }

  return NextResponse.json({ attempt: updated });
}
