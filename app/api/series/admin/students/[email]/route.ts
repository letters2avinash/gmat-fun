import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getFullTest, requireSeriesAdmin } from "@/lib/series/server";
import { computeAnalytics } from "@/lib/series/analytics";

// GET /api/series/admin/students/[email] — one student's attempts, analytics and chat activity.
export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const auth = await requireSeriesAdmin(req);
  if ("response" in auth) return auth.response;

  const { email: raw } = await params;
  const email = decodeURIComponent(raw).toLowerCase();
  const admin = createServerSupabase();

  const { data: rows, error } = await admin
    .from("series_attempts")
    .select("id,test_id,status,started_at,submitted_at,answers,times_ms,correct,total,time_used_sec,auto_submitted")
    .eq("email", email)
    .order("started_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const attempts = rows ?? [];
  const ids = attempts.map((a) => a.id);
  const { data: msgs } = ids.length
    ? await admin.from("series_chat_messages").select("attempt_id,n").in("attempt_id", ids)
    : { data: [] as { attempt_id: string; n: number }[] };

  const chatStats = new Map<string, { messages: number; questions: Set<number> }>();
  for (const m of msgs ?? []) {
    const c = chatStats.get(m.attempt_id) ?? { messages: 0, questions: new Set<number>() };
    c.messages++;
    c.questions.add(m.n);
    chatStats.set(m.attempt_id, c);
  }

  const submitted = attempts.filter((a) => a.status === "submitted");
  return NextResponse.json({
    email,
    attempts: attempts.map((a) => {
      const c = chatStats.get(a.id);
      return {
        id: a.id,
        testId: a.test_id,
        testName: getFullTest(a.test_id)?.name ?? `Test ${a.test_id}`,
        status: a.status,
        startedAt: a.started_at,
        submittedAt: a.submitted_at,
        correct: a.correct,
        total: a.total,
        timeUsedSec: a.time_used_sec,
        autoSubmitted: a.auto_submitted,
        chatMessages: c?.messages ?? 0,
        questionsDiscussed: c ? c.questions.size : 0,
      };
    }),
    analytics: computeAnalytics(submitted),
  });
}
