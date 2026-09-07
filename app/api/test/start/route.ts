import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { startingTheta } from "@/lib/scoring";
import type { Mode, Section } from "@/lib/types";

// POST /api/test/start
// body: { userId: string, mode: Mode, section?: Section, topic?: string, questionType?: string }
//
// topic/sectional attempts cover a single section for the whole attempt.
// full-length attempts start in the quant module and move through verbal
// and data_insights via /api/test/module-finish.
export async function POST(req: NextRequest) {
  const { userId, mode, section, topic, questionType } = (await req.json()) as {
    userId: string;
    mode: Mode;
    section?: Section;
    topic?: string;
    questionType?: string;
  };

  if (!userId || !mode) {
    return NextResponse.json({ error: "userId and mode are required" }, { status: 400 });
  }
  if (mode !== "full-length" && !section) {
    return NextResponse.json(
      { error: "section is required for topic/sectional modes" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("test_attempts")
    .insert({
      user_id: userId,
      mode,
      section: mode === "full-length" ? null : section,
      topic: topic ?? null,
      question_type: questionType ?? null,
      current_difficulty: 3,
      current_theta: startingTheta(),
      current_section: mode === "full-length" ? "quant" : null,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attempt: data });
}
