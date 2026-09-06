import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { estimateScore } from "@/lib/adaptive";

// POST /api/test/finish  body: { attemptId }
export async function POST(req: NextRequest) {
  const { attemptId } = await req.json();
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: responses, error } = await supabase
    .from("attempt_responses")
    .select("difficulty_at_time, is_correct")
    .eq("attempt_id", attemptId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const score = estimateScore(
    (responses ?? []).map((r) => ({
      difficulty: r.difficulty_at_time,
      correct: r.is_correct,
    }))
  );

  const { data: attempt, error: updateError } = await supabase
    .from("test_attempts")
    .update({ status: "completed", score, completed_at: new Date().toISOString() })
    .eq("id", attemptId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ attempt });
}
