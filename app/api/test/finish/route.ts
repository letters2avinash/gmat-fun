import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { sectionScoreFromTheta, totalScoreFromSections } from "@/lib/scoring";

// POST /api/test/finish  body: { attemptId }
//
// topic/sectional: scores the single section from its ability estimate.
// full-length: quant_score/verbal_score were already set by module-finish
// and di_score by /api/di/finish (which propagates onto the parent row) —
// this just combines them into the real 205-805 Total Score.
export async function POST(req: NextRequest) {
  const { attemptId } = await req.json();
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };

  if (attempt.mode === "full-length") {
    const sectionScores = [attempt.quant_score, attempt.verbal_score, attempt.di_score].filter(
      (s): s is number => typeof s === "number"
    );
    update.total_score = totalScoreFromSections(sectionScores);
    update.score = update.total_score;
  } else {
    const sectionScore = sectionScoreFromTheta(attempt.current_theta);
    if (attempt.section === "quant") update.quant_score = sectionScore;
    if (attempt.section === "verbal") update.verbal_score = sectionScore;
    if (attempt.section === "data_insights") update.di_score = sectionScore;
    update.score = sectionScore;
  }

  const { data: updated, error: updateError } = await supabase
    .from("test_attempts")
    .update(update)
    .eq("id", attemptId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ attempt: updated });
}
