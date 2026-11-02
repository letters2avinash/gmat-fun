import { NextRequest, NextResponse } from "next/server";
import { getFullTest, requireSeriesUser, toPublicTest } from "@/lib/series/server";

// GET /api/series/tests/[id] — questions and passages, WITHOUT answers.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const test = getFullTest(Number(id));
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  return NextResponse.json({ test: toPublicTest(test) });
}
