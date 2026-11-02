import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { listFullTests, requireSeriesUser } from "@/lib/series/server";
import type { TestListItem } from "@/lib/series/types";

// GET /api/series/tests — the 32 tests, with this student's progress on each.
export async function GET(req: NextRequest) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const admin = createServerSupabase();
  const { data, error } = await admin
    .from("series_attempts")
    .select("test_id,status,correct,started_at")
    .eq("email", auth.email)
    .order("started_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const tests: TestListItem[] = listFullTests().map((t) => {
    const mine = rows.filter((r) => r.test_id === t.id);
    const submitted = mine.filter((r) => r.status === "submitted");
    const bestScore = submitted.length
      ? Math.max(...submitted.map((r) => r.correct ?? 0))
      : null;
    return {
      id: t.id,
      name: t.name,
      durationMinutes: t.durationMinutes,
      questionCount: t.questions.length,
      attempts: submitted.length,
      bestScore,
      lastStatus: mine[0]?.status ?? null,
    };
  });
  return NextResponse.json({ tests });
}
