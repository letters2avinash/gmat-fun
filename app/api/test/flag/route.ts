import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST /api/test/flag  body: { attemptId, questionId, flagged: boolean }
// Toggles a "flag for review" marker — purely a study aid for the
// end-of-module review screen, doesn't affect grading.
export async function POST(req: NextRequest) {
  const { attemptId, questionId, flagged } = await req.json();
  if (!attemptId || !questionId || typeof flagged !== "boolean") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("flagged")
    .eq("id", attemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const current: string[] = attempt.flagged ?? [];
  const next = flagged
    ? Array.from(new Set([...current, questionId]))
    : current.filter((id) => id !== questionId);

  await supabase.from("test_attempts").update({ flagged: next }).eq("id", attemptId);

  return NextResponse.json({ flagged: next });
}
