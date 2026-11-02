import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { SERIES, requireSeriesAdmin } from "@/lib/series/server";

// GET /api/series/admin/students — every student on the access list, with progress.
export async function GET(req: NextRequest) {
  const auth = await requireSeriesAdmin(req);
  if ("response" in auth) return auth.response;

  const admin = createServerSupabase();
  const { data: access, error: e1 } = await admin
    .from("series_access")
    .select("email,is_admin")
    .eq("series", SERIES)
    .order("email", { ascending: true });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: rows, error: e2 } = await admin
    .from("series_attempts")
    .select("email,status,correct,total,started_at,submitted_at");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const stats = new Map<string, { started: number; submitted: number; pctSum: number; pctCount: number; last: string | null }>();
  for (const r of rows ?? []) {
    const s = stats.get(r.email) ?? { started: 0, submitted: 0, pctSum: 0, pctCount: 0, last: null };
    s.started++;
    if (r.status === "submitted") {
      s.submitted++;
      if (r.total) { s.pctSum += ((r.correct ?? 0) / r.total) * 100; s.pctCount++; }
    }
    const when = r.submitted_at ?? r.started_at;
    if (when && (!s.last || when > s.last)) s.last = when;
    stats.set(r.email, s);
  }

  const students = (access ?? []).map((a) => {
    const s = stats.get(a.email);
    return {
      email: a.email,
      isAdmin: !!a.is_admin,
      startedAttempts: s?.started ?? 0,
      submittedAttempts: s?.submitted ?? 0,
      avgScorePct: s && s.pctCount ? Math.round(s.pctSum / s.pctCount) : null,
      lastActive: s?.last ?? null,
    };
  });
  return NextResponse.json({ students });
}
