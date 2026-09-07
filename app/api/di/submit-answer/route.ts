import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { gradeDiItem, type DiSubmission } from "@/lib/di";
import { bFromDiDifficulty, nextTheta, MAX_EDITS_PER_MODULE } from "@/lib/scoring";
import type { DiType } from "@/lib/types";

// POST /api/di/submit-answer
// body: { attemptId, itemId, submission: DiSubmission, edit?: boolean }
// Grades server-side and records the response, but — same as the quant/
// verbal flow — never reveals correctness or the correct answer here.
// `edit: true` supports the end-of-module review screen (up to
// MAX_EDITS_PER_MODULE changes, doesn't affect item selection).
export async function POST(req: NextRequest) {
  const { attemptId, itemId, submission, edit } = (await req.json()) as {
    attemptId: string;
    itemId: string;
    submission: DiSubmission;
    edit?: boolean;
  };

  if (!attemptId || !itemId || !submission) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const [{ data: attempt }, { data: item }] = await Promise.all([
    supabase.from("di_attempts").select("*").eq("id", attemptId).single(),
    supabase.from("di_items").select("*").eq("id", itemId).single(),
  ]);

  if (!attempt || !item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const result = gradeDiItem(item.di_type as DiType, item.raw, submission);

  if (edit) {
    if ((attempt.edits_used ?? 0) >= MAX_EDITS_PER_MODULE) {
      return NextResponse.json({ error: "edit limit reached for this module" }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("di_attempt_responses")
      .select("id, is_correct")
      .eq("attempt_id", attemptId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "no existing answer to edit" }, { status: 400 });
    }

    await supabase
      .from("di_attempt_responses")
      .update({ submission, is_correct: result.isCorrect })
      .eq("id", existing.id);

    const correctDelta = (result.isCorrect ? 1 : 0) - (existing.is_correct ? 1 : 0);
    await supabase
      .from("di_attempts")
      .update({ correct: attempt.correct + correctDelta, edits_used: (attempt.edits_used ?? 0) + 1 })
      .eq("id", attemptId);

    return NextResponse.json({ recorded: true, edited: true });
  }

  const itemB = bFromDiDifficulty(item.difficulty);
  const updatedTheta = nextTheta(attempt.current_theta, itemB, result.isCorrect, attempt.total);

  await supabase.from("di_attempt_responses").insert({
    attempt_id: attemptId,
    item_id: itemId,
    submission,
    is_correct: result.isCorrect,
  });

  await supabase
    .from("di_attempts")
    .update({
      total: attempt.total + 1,
      correct: attempt.correct + (result.isCorrect ? 1 : 0),
      current_theta: updatedTheta,
    })
    .eq("id", attemptId);

  return NextResponse.json({ recorded: true });
}
