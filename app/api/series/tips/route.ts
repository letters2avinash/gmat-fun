import { NextRequest, NextResponse } from "next/server";
import { requireSeriesUser } from "@/lib/series/server";
import { buildStudentProfile, studentName } from "@/lib/series/profile";

// GET /api/series/tips: the signed-in student's performance tips.
export async function GET(req: NextRequest) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;
  const profile = await buildStudentProfile(auth.email);
  return NextResponse.json({ name: studentName(auth.email), ...profile });
}
