import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// GET /api/test/topics?section=verbal&questionType=critical_reasoning
// Distinct topic values available for a section (optionally narrowed to
// one question_type), used to populate the topic picker on the practice
// selection screens — driven by whatever content is actually loaded
// rather than a hardcoded list, so it stays correct as new content
// (e.g. Reading Comprehension) gets added.
export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section");
  const questionType = req.nextUrl.searchParams.get("questionType");

  if (!section) {
    return NextResponse.json({ error: "section is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  let query = supabase.from("questions").select("topic").eq("section", section).limit(20000);
  if (questionType) query = query.eq("question_type", questionType);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const topics = Array.from(new Set((data ?? []).map((r) => r.topic))).sort();
  return NextResponse.json({ topics });
}
