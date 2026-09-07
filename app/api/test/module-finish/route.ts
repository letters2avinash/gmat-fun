import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { sectionScoreFromTheta, startingTheta } from "@/lib/scoring";

// POST /api/test/module-finish  body: { attemptId, section: 'quant' | 'verbal' }
//
// Called only for full-length attempts, once a module's questions are all
// answered and the student has confirmed the end-of-module review screen.
// Scores that module and advances the attempt to the next one — quant ->
// verbal -> data_insights (which hands off to a freshly-created di_attempts
// row, since DI content lives outside the `questions` table).
export async function POST(req: NextRequest) {
  const { attemptId, section } = (await req.json()) as {
    attemptId: string;
    section: "quant" | "verbal";
  };

  if (!attemptId || !section) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (section === "quant") {
    const quantScore = sectionScoreFromTheta(attempt.quant_theta);
    const { data: updated, error } = await supabase
      .from("test_attempts")
      .update({ quant_score: quantScore, current_section: "verbal" })
      .eq("id", attemptId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attempt: updated, nextSection: "verbal" });
  }

  // section === "verbal": score it, then spin up the DI module.
  const verbalScore = sectionScoreFromTheta(attempt.verbal_theta);

  const { data: diAttempt, error: diError } = await supabase
    .from("di_attempts")
    .insert({
      user_id: attempt.user_id,
      di_type: "mixed",
      category: "mixed",
      status: "in_progress",
      current_theta: startingTheta(),
      parent_test_attempt_id: attemptId,
    })
    .select()
    .single();

  if (diError || !diAttempt) {
    return NextResponse.json({ error: diError?.message ?? "could not start DI module" }, { status: 500 });
  }

  const { data: updated, error } = await supabase
    .from("test_attempts")
    .update({ verbal_score: verbalScore, current_section: "data_insights", di_attempt_id: diAttempt.id })
    .eq("id", attemptId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attempt: updated, nextSection: "data_insights", diAttemptId: diAttempt.id });
}
