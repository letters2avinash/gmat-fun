import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { tierFromTheta, SECTION_QUESTION_COUNTS, type ScoringSection } from "@/lib/scoring";
import type { Section } from "@/lib/types";

const QUESTIONS_PER_TOPIC_MODE = 10;

function targetCount(mode: string, section: ScoringSection): number {
  if (mode === "topic") return QUESTIONS_PER_TOPIC_MODE;
  return SECTION_QUESTION_COUNTS[section];
}

// GET /api/test/next-question?attemptId=...
// Picks an unseen question near the section's current ability estimate
// (theta), scoped to the attempt's section/topic/question_type. For
// full-length, tracks the module currently in progress via
// attempt.current_section, and hands off to the DI flow once that module
// is reached (DI content lives in a separate table — see lib/di.ts).
export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }

  const activeSection: Section | null =
    attempt.mode === "full-length" ? attempt.current_section : attempt.section;

  if (!activeSection) {
    return NextResponse.json({ error: "attempt has no active section" }, { status: 400 });
  }

  if (activeSection === "data_insights") {
    // The DI module of a full-length test is driven entirely by the DI
    // API/UI — the client should switch over once it sees this.
    return NextResponse.json({ switchToDi: true, diAttemptId: attempt.di_attempt_id });
  }

  const isFullLength = attempt.mode === "full-length";
  const theta = isFullLength
    ? activeSection === "quant"
      ? attempt.quant_theta
      : attempt.verbal_theta
    : attempt.current_theta;
  const answeredInSection = isFullLength
    ? activeSection === "quant"
      ? attempt.quant_answered
      : attempt.verbal_answered
    : undefined;

  const { data: seen } = await supabase
    .from("attempt_responses")
    .select("question_id")
    .eq("attempt_id", attemptId);
  const seenIds = (seen ?? []).map((r) => r.question_id);
  const answeredCount = answeredInSection ?? seenIds.length;

  const target = targetCount(attempt.mode, activeSection);
  if (answeredCount >= target) {
    return NextResponse.json({ question: null, done: true });
  }

  const targetTier = tierFromTheta(theta);

  let query = supabase
    .from("questions")
    .select("*")
    .eq("section", activeSection)
    .gte("difficulty", Math.max(1, targetTier - 1))
    .lte("difficulty", Math.min(5, targetTier + 1))
    .limit(10);

  if (attempt.topic) query = query.eq("topic", attempt.topic);
  if (attempt.question_type) query = query.eq("question_type", attempt.question_type);
  if (seenIds.length) query = query.not("id", "in", `(${seenIds.join(",")})`);

  const { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ question: null, done: true });
  }

  // Pick the candidate whose difficulty tier is closest to the target —
  // this is what makes the test adaptive rather than random within a band.
  const question = candidates.reduce((best, q) =>
    Math.abs(q.difficulty - targetTier) < Math.abs(best.difficulty - targetTier) ? q : best
  );

  // Don't leak the correct answer/explanation to the client before it answers.
  const { correct_choice, explanation, ...safeQuestion } = question;

  return NextResponse.json({
    question: safeQuestion,
    done: false,
    progress: { answered: answeredCount, target },
    flagged: (attempt.flagged ?? []).includes(question.id),
  });
}
