import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSeriesUser } from "@/lib/series/server";
import { computeAnalytics } from "@/lib/series/analytics";

// GET /api/series/analytics — aggregated over the signed-in student's submitted attempts.
export async function GET(req: NextRequest) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const admin = createServerSupabase();
  const { data, error } = await admin
    .from("series_attempts")
    .select("id,test_id,answers,times_ms,correct,total,time_used_sec,auto_submitted,submitted_at")
    .eq("email", auth.email)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(computeAnalytics(data ?? []));
}
