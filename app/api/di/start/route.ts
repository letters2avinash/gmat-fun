import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { startingTheta } from "@/lib/scoring";
import type { DiCategory, DiType } from "@/lib/types";

// POST /api/di/start
// body: { userId: string, diType?: DiType | "mixed", category?: DiCategory | "mixed" }
export async function POST(req: NextRequest) {
  const { userId, diType, category } = (await req.json()) as {
    userId: string;
    diType?: DiType | "mixed";
    category?: DiCategory | "mixed";
  };

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("di_attempts")
    .insert({
      user_id: userId,
      di_type: diType ?? "mixed",
      category: category ?? "mixed",
      status: "in_progress",
      total: 0,
      correct: 0,
      current_theta: startingTheta(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attempt: data });
}
