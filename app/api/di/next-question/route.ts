import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { toSafeDiItem } from "@/lib/di";

// GET /api/di/next-question?attemptId=...
// Picks a not-yet-seen di_items row matching the attempt's di_type/category
// (or any, if the attempt is "mixed"), and strips every correct-answer
// field before returning it.
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

  const { data: seen } = await supabase
    .from("di_attempt_responses")
    .select("item_id")
    .eq("attempt_id", attemptId);
  const seenIds = (seen ?? []).map((r) => r.item_id);

  let query = supabase.from("di_items").select("*").limit(50);
  if (attempt.di_type && attempt.di_type !== "mixed") {
    query = query.eq("di_type", attempt.di_type);
  }
  if (attempt.category && attempt.category !== "mixed") {
    query = query.eq("category", attempt.category);
  }
  if (seenIds.length) query = query.not("id", "in", `(${seenIds.join(",")})`);

  const { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ item: null, done: true });
  }

  const row = candidates[Math.floor(Math.random() * candidates.length)];
  const safeItem = toSafeDiItem(row);

  return NextResponse.json({ item: safeItem, done: false });
}
