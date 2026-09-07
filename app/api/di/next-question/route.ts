import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { toSafeDiItem } from "@/lib/di";
import { diDifficultyFromTheta, SECTION_QUESTION_COUNTS } from "@/lib/scoring";

const STANDALONE_SET_SIZE = 10;

// GET /api/di/next-question?attemptId=...
// Picks a not-yet-seen di_items row near the attempt's current ability
// estimate (theta -> Easy/Medium/Hard), matching the attempt's di_type/
// category (or any, if "mixed"), and strips every correct-answer field
// before returning it. A full-length test's DI module (parent_test_
// attempt_id set) always runs the real GMAT Focus count (20); standalone
// practice runs a shorter 10-question set.
export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: attempt, error: attemptError } = await supabase
    .from("di_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }

  const target = attempt.parent_test_attempt_id
    ? SECTION_QUESTION_COUNTS.data_insights
    : STANDALONE_SET_SIZE;

  if (attempt.total >= target) {
    return NextResponse.json({ item: null, done: true });
  }

  const { data: seen } = await supabase
    .from("di_attempt_responses")
    .select("item_id")
    .eq("attempt_id", attemptId);
  const seenIds = (seen ?? []).map((r) => r.item_id);

  const targetDifficulty = diDifficultyFromTheta(attempt.current_theta);

  let query = supabase.from("di_items").select("*").eq("difficulty", targetDifficulty).limit(50);
  if (attempt.di_type && attempt.di_type !== "mixed") query = query.eq("di_type", attempt.di_type);
  if (attempt.category && attempt.category !== "mixed") query = query.eq("category", attempt.category);
  if (seenIds.length) query = query.not("id", "in", `(${seenIds.join(",")})`);

  let { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fall back to any difficulty if the exact target band is exhausted for
  // this type/category combination — keeps the set from dead-ending.
  if (!candidates || candidates.length === 0) {
    let fallback = supabase.from("di_items").select("*").limit(50);
    if (attempt.di_type && attempt.di_type !== "mixed") fallback = fallback.eq("di_type", attempt.di_type);
    if (attempt.category && attempt.category !== "mixed")
      fallback = fallback.eq("category", attempt.category);
    if (seenIds.length) fallback = fallback.not("id", "in", `(${seenIds.join(",")})`);
    const res = await fallback;
    candidates = res.data ?? [];
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ item: null, done: true });
  }

  const row = candidates[Math.floor(Math.random() * candidates.length)];
  const safeItem = toSafeDiItem(row);

  return NextResponse.json({
    item: safeItem,
    done: false,
    progress: { answered: attempt.total, target },
    flagged: (attempt.flagged ?? []).includes(row.id),
  });
}
