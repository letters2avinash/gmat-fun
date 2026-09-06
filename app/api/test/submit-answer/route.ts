import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { nextDifficulty } from "@/lib/adaptive";

// POST /api/test/submit-answer
// body: { attemptId, questionId, selectedChoice, timeTakenSeconds }
export async function POST(req: NextRequest) {
  const { attemptId, questionId, selectedChoice, timeTakenSeconds } =
    await req.json();

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

  const { count } = await supabase
    .from("attempt_responses")
    .select("*", { count: "exact", head: true })
    .eq("attempt_id", attemptId);
  const questionsAnswered = count ?? 0;

  const updatedDifficulty = nextDifficulty(
    attempt.current_difficulty,
    isCorrect,
    questionsAnswered
  );

  await supabase.from("attempt_responses").insert({
    attempt_id: attemptId,
    question_id: questionId,
    selected_choice: selectedChoice,
    is_correct: isCorrect,
    difficulty_at_time: attempt.current_difficulty,
    time_taken_seconds: timeTakenSeconds ?? null,
  });

  await supabase
    .from("test_attempts")
    .update({ current_difficulty: updatedDifficulty })
    .eq("id", attemptId);

  return NextResponse.json({
    isCorrect,
    correctChoice: question.correct_choice,
    explanation: question.explanation,
    newDifficulty: updatedDifficulty,
  });
}
