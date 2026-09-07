import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { gradeDiItem, toSafeDiItem, DI_TYPE_LABELS, type DiSubmission } from "@/lib/di";
import type { DiType } from "@/lib/types";

// GET /api/di/review?attemptId=...
// Full per-item breakdown with correct answers — only ever returned once
// the attempt is completed, never mid-set.
export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: attempt } = await supabase
    .from("di_attempts")
    .select("status, flagged")
    .eq("id", attemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (attempt.status !== "completed") {
    return NextResponse.json({ error: "attempt is still in progress" }, { status: 403 });
  }

  const { data: responses, error } = await supabase
    .from("di_attempt_responses")
    .select("item_id, submission, is_correct, answered_at")
    .eq("attempt_id", attemptId)
    .order("answered_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const itemIds = (responses ?? []).map((r) => r.item_id);
  const { data: items } = itemIds.length
    ? await supabase.from("di_items").select("*").in("id", itemIds)
    : { data: [] };

  const byId = new Map((items ?? []).map((it) => [it.id, it]));
  const flagged: string[] = attempt.flagged ?? [];

  const review = (responses ?? [])
    .map((r) => {
      const row = byId.get(r.item_id);
      if (!row) return null;
      const grade = gradeDiItem(row.di_type as DiType, row.raw, r.submission as DiSubmission);
      return {
        itemId: row.id,
        diType: row.di_type as DiType,
        diTypeLabel: DI_TYPE_LABELS[row.di_type as DiType],
        item: toSafeDiItem(row),
        submission: r.submission,
        isCorrect: r.is_correct,
        grade,
        flagged: flagged.includes(row.id),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ review });
}
