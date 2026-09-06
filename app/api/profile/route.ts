import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST /api/profile
// body: { id: string, fullName?: string | null }
// Upserts a profiles row for a just-created (or just-logged-in) auth user.
// Runs with the service role key so it works even when the browser client
// has no session yet (e.g. signup while "Confirm email" is required).
export async function POST(req: NextRequest) {
  const { id, fullName } = (await req.json()) as {
    id: string;
    fullName?: string | null;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { error } = await supabase
    .from("profiles")
    .upsert({ id, full_name: fullName ?? null }, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
