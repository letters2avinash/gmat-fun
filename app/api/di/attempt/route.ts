import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// GET /api/di/attempt?attemptId=...
export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("di_attempts").select("*").eq("id", attemptId).single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }
  return NextResponse.json({ attempt: data });
}
