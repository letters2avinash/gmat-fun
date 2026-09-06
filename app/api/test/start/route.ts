import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { startingDifficulty } from "@/lib/adaptive";
import type { Mode, Section } from "@/lib/types";

// POST /api/test/start
// body: { userId: string, mode: Mode, section?: Section, topic?: string }
export async function POST(req: NextRequest) {
  const { userId, mode, section, topic } = (await req.json()) as {
    userId: string;
    mode: Mode;
    section?: Section;
    topic?: string;
  };

  if (!userId || !mode) {
    return NextResponse.json(
      { error: "userId and mode are required" },
      { status: 400 }
    );
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
      section: section ?? null,
      topic: topic ?? null,
      current_difficulty: startingDifficulty(),
      status: "in_progress",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attempt: data });
}
