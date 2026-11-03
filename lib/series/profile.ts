// Server-only. Builds a short performance profile for one student from their
// submitted attempts. Used by the doubts assistant and the tips card.
import { createServerSupabase } from "@/lib/supabase";
import { computeAnalytics } from "@/lib/series/analytics";

export type TypeStat = { type: string; pct: number; attempted: number };
export type Tip = {
  key: string;
  kind: "weak" | "strong";
  type: string;
  text: string;
};
export type StudentProfile = {
  submittedTests: number;
  weakTypes: TypeStat[];
  strongTypes: TypeStat[];
  tips: Tip[];
};

// A type needs at least this many answered questions before it is mentioned,
// so one or two misses never turn into a "0%" tip.
const MIN_ATTEMPTS = 6;
const WEAK_BELOW = 60;
const STRONG_ABOVE = 80;

// How the assistant addresses each signed-in person. Anyone not listed is "there".
const NAMES: Record<string, string> = {
  "sazzag2006@gmail.com": "Sazzag",
  "letters2avinash@gmail.com": "Avinash",
};

export function studentName(email: string): string {
  return NAMES[email.toLowerCase()] ?? "there";
}

export async function buildStudentProfile(email: string): Promise<StudentProfile> {
  const name = studentName(email);
  const { data } = await createServerSupabase()
    .from("series_attempts")
    .select("id,test_id,answers,times_ms,time_used_sec,auto_submitted,submitted_at")
    .eq("email", email)
    .eq("status", "submitted");
  const rows = data ?? [];
  if (rows.length === 0) return { submittedTests: 0, weakTypes: [], strongTypes: [], tips: [] };

  const analytics = computeAnalytics(rows as Parameters<typeof computeAnalytics>[0]);
  const typed: TypeStat[] = analytics.questionAnalysis.byType
    .filter((t): t is typeof t & { pct: number } => t.pct !== null && t.attempted >= MIN_ATTEMPTS)
    .map((t) => ({ type: t.type, pct: t.pct, attempted: t.attempted }));

  const weakTypes = typed.filter((t) => t.pct < WEAK_BELOW).sort((a, b) => a.pct - b.pct).slice(0, 2);
  const strongTypes = typed.filter((t) => t.pct >= STRONG_ABOVE).sort((a, b) => b.pct - a.pct).slice(0, 2);

  const tips: Tip[] = [];
  for (const w of weakTypes) {
    tips.push({
      key: `weak:${w.type}`,
      kind: "weak",
      type: w.type,
      text: `${name}, ${w.type} is your weakest type so far: ${w.pct}% across ${w.attempted} questions. Do you want to review those misses?`,
    });
  }
  for (const s of strongTypes) {
    tips.push({
      key: `strong:${s.type}`,
      kind: "strong",
      type: s.type,
      text: `${name}, you're at ${s.pct}% on ${s.type}. Use the same reasoning on related question types. Do you want to keep this strength going?`,
    });
  }
  return { submittedTests: rows.length, weakTypes, strongTypes, tips };
}
