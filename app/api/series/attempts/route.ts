import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getFullTest, requireSeriesUser } from "@/lib/series/server";
import { autoSubmitIfExpired } from "@/lib/series/attempts";
import type { Attempt } from "@/lib/series/types";

const COLS =
  "id,test_id,status,started_at,submitted_at,answers,times_ms,flagged,correct,total,time_used_sec,auto_submitted";

// GET /api/series/attempts — this student's attempts, newest first (no answers).
export async function GET(req: NextRequest) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const admin = createServerSupabase();
  const { data, error } = await admin
    .from("series_attempts")
    .select(COLS)
    .eq("email", auth.email)
    .order("started_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempts: data ?? [] });
}

// POST /api/series/attempts  { testId }
// Resumes the open attempt for this test if one exists, otherwise starts one.
export async function POST(req: NextRequest) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { testId?: number };
  const test = getFullTest(Number(body.testId));
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const admin = createServerSupabase();
  const { data: open } = await admin
    .from("series_attempts")
    .select(COLS)
    .eq("email", auth.email)
    .eq("test_id", test.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) {
    const settled = await autoSubmitIfExpired(open as Attempt, test);
    if (settled.status === "in_progress") {
      return NextResponse.json({ attempt: settled, resumed: true });
    }
    // Clock ran out while away — the old attempt is now submitted; start fresh.
  }

  const { data, error } = await admin
    .from("series_attempts")
    .insert({ email: auth.email, test_id: test.id, total: test.questions.length })
    .select(COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: data, resumed: false }, { status: 201 });
}
