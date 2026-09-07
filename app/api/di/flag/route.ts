import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST /api/di/flag  body: { attemptId, itemId, flagged: boolean }
export async function POST(req: NextRequest) {
  const { attemptId, itemId, flagged } = await req.json();
  if (!attemptId || !itemId || typeof flagged !== "boolean") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: attempt } = await supabase
    .from("di_attempts")
    .select("flagged")
    .eq("id", attemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const current: string[] = attempt.flagged ?? [];
  const next = flagged ? Array.from(new Set([...current, itemId])) : current.filter((id) => id !== itemId);

  await supabase.from("di_attempts").update({ flagged: next }).eq("id", attemptId);

  return NextResponse.json({ flagged: next });
}
