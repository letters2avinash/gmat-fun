import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { bFromTierDifficulty, nextTheta, MAX_EDITS_PER_MODULE } from "@/lib/scoring";
import type { Section } from "@/lib/types";

// POST /api/test/submit-answer
// body: { attemptId, questionId, selectedChoice, timeTakenSeconds?, edit?: boolean }
//
// Grades server-side and records the response, but — unlike a real GMAT,
// which never shows this at all — the correctness/explanation are only
// ever revealed later, in the post-module review. This route only ever
// returns an acknowledgment.
//
// `edit: true` is for the end-of-module review screen, where a student
// can change up to MAX_EDITS_PER_MODULE previously-given answers. An edit
// updates what's scored but does NOT feed back into the adaptive engine —
// the question sequence you were already served is fixed, exactly like
// the real GMAT Focus "Review & Edit" feature.
export async function POST(req: NextRequest) {
  const { attemptId, questionId, selectedChoice, timeTakenSeconds, edit } = await req.json();

  if (!attemptId || !questionId || !selectedChoice) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const [{ data: attempt }, { data: question }] = await Promise.all([
    supabase.from("test_attempts").select("*").eq("id", attemptId).single(),
    supabase.from("questions").select("*").eq("id", questionId).single(),
  ]);

  if (!attempt || !question) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isCorrect = selectedChoice === question.correct_choice;
  const section: Section = question.section;
  const isFullLength = attempt.mode === "full-length";
  const editsField = section === "quant" ? "quant_edits_used" : "verbal_edits_used";

  if (edit) {
    const { data: existing } = await supabase
      .from("attempt_responses")
      .select("id")
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "no existing answer to edit" }, { status: 400 });
    }

    const editsUsed = isFullLength ? attempt[editsField] : attempt.quant_edits_used; // topic/sectional only ever touch one section
    if (editsUsed >= MAX_EDITS_PER_MODULE) {
      return NextResponse.json({ error: "edit limit reached for this module" }, { status: 400 });
    }

    await supabase
      .from("attempt_responses")
      .update({ selected_choice: selectedChoice, is_correct: isCorrect })
      .eq("id", existing.id);

    const editUpdate: Record<string, number> = isFullLength
      ? { [editsField]: editsUsed + 1 }
      : { quant_edits_used: editsUsed + 1 };
    await supabase.from("test_attempts").update(editUpdate).eq("id", attemptId);

    return NextResponse.json({ recorded: true, edited: true });
  }

  const answeredField = section === "quant" ? "quant_answered" : "verbal_answered";
  const thetaField = section === "quant" ? "quant_theta" : "verbal_theta";
  const currentTheta = isFullLength ? attempt[thetaField] : attempt.current_theta;

  const { count } = await supabase
    .from("attempt_responses")
    .select("*", { count: "exact", head: true })
    .eq("attempt_id", attemptId);
  const answeredSoFar = isFullLength ? attempt[answeredField] : count ?? 0;

  const itemB = bFromTierDifficulty(question.difficulty);
  const updatedTheta = nextTheta(currentTheta, itemB, isCorrect, answeredSoFar);

  await supabase.from("attempt_responses").insert({
    attempt_id: attemptId,
    question_id: questionId,
    selected_choice: selectedChoice,
    is_correct: isCorrect,
    difficulty_at_time: question.difficulty,
    time_taken_seconds: timeTakenSeconds ?? null,
  });

  const update: Record<string, number> = isFullLength
    ? { [thetaField]: updatedTheta, [answeredField]: answeredSoFar + 1 }
    : { current_theta: updatedTheta };
  await supabase.from("test_attempts").update(update).eq("id", attemptId);

  return NextResponse.json({ recorded: true });
}
