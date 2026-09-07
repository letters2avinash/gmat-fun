import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import type { ReviewResponse } from "@/lib/types";

// GET /api/test/review?attemptId=...
// Full per-question breakdown with correct answers and explanations —
// only ever returned once the attempt is completed, never mid-test.
export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("status, flagged")
    .eq("id", attemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (attempt.status !== "completed") {
    return NextResponse.json({ error: "attempt is still in progress" }, { status: 403 });
  }

  const { data: responses, error } = await supabase
    .from("attempt_responses")
    .select("question_id, selected_choice, is_correct, answered_at")
    .eq("attempt_id", attemptId)
    .order("answered_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const questionIds = (responses ?? []).map((r) => r.question_id);
  const { data: questions } = questionIds.length
    ? await supabase.from("questions").select("*").in("id", questionIds)
    : { data: [] };

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const flagged: string[] = attempt.flagged ?? [];

  const review: ReviewResponse[] = (responses ?? [])
    .map((r) => {
      const q = byId.get(r.question_id);
      if (!q) return null;
      return {
        questionId: q.id,
        section: q.section,
        topic: q.topic,
        prompt: q.prompt,
        choices: q.choices,
        selectedChoice: r.selected_choice,
        correctChoice: q.correct_choice,
        isCorrect: r.is_correct,
        explanation: q.explanation,
        flagged: flagged.includes(q.id),
      };
    })
    .filter((r): r is ReviewResponse => r !== null);

  return NextResponse.json({ review });
}
