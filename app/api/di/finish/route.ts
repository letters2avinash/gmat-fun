import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST /api/di/finish  body: { attemptId }
export async function POST(req: NextRequest) {
  const { attemptId } = await req.json();
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: attempt, error } = await supabase
    .from("di_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  const score = attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0;

  const { data: updated, error: updateError } = await supabase
    .from("di_attempts")
    .update({ status: "completed", score, completed_at: new Date().toISOString() })
    .eq("id", attemptId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ attempt: updated });
}
