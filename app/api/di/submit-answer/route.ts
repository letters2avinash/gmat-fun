import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { gradeDiItem, type DiSubmission } from "@/lib/di";
import type { DiType } from "@/lib/types";

// POST /api/di/submit-answer
// body: { attemptId, itemId, submission: DiSubmission }
export async function POST(req: NextRequest) {
  const { attemptId, itemId, submission } = (await req.json()) as {
    attemptId: string;
    itemId: string;
    submission: DiSubmission;
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
    })
    .eq("id", attemptId);

  return NextResponse.json(result);
}
