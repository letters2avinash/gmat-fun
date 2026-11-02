// SERVER ONLY.
import { createServerSupabase } from "@/lib/supabase";
import type { Attempt } from "@/lib/series/types";
import {
  FullTest,
  gradeAttempt,
  isExpired,
  sanitizeAnswers,
  sanitizeFlagged,
  sanitizeTimes,
  timeUsedSec,
} from "@/lib/series/server";

const COLS =
  "id,test_id,status,started_at,submitted_at,answers,times_ms,flagged,correct,total,time_used_sec,auto_submitted";

export async function getAttemptForUser(id: string, email: string): Promise<Attempt | null> {
  const admin = createServerSupabase();
  const { data } = await admin
    .from("series_attempts")
    .select(COLS)
    .eq("id", id)
    .eq("email", email)
    .maybeSingle();
  return (data as Attempt | null) ?? null;
}

// Writes the grade and final state. Idempotent: a submitted attempt is never
// re-graded or overwritten, so a double-submit cannot change a score.
export async function finalizeAttempt(
  attempt: Attempt,
  test: FullTest,
  input: {
    answers?: unknown;
    times?: unknown;
    flagged?: unknown;
    autoSubmitted: boolean;
  }
): Promise<Attempt> {
  if (attempt.status === "submitted") return attempt;

  const answers = sanitizeAnswers(input.answers ?? attempt.answers);
  const times = sanitizeTimes(input.times ?? attempt.times_ms);
  const flagged = sanitizeFlagged(input.flagged ?? attempt.flagged);
  const { correct, total } = gradeAttempt(test, answers, times);
  const now = new Date();
  const used = timeUsedSec(attempt, test, now.getTime());

  const admin = createServerSupabase();
  const { data, error } = await admin
    .from("series_attempts")
    .update({
      status: "submitted",
      submitted_at: now.toISOString(),
      answers,
      times_ms: times,
      flagged,
      correct,
      total,
      time_used_sec: used,
      auto_submitted: input.autoSubmitted,
    })
    .eq("id", attempt.id)
    .eq("status", "in_progress")
    .select(COLS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as Attempt;
  // Lost a race with another submit; return whatever is stored now.
  const { data: current } = await admin
    .from("series_attempts")
    .select(COLS)
    .eq("id", attempt.id)
    .maybeSingle();
  return (current as Attempt | null) ?? attempt;
}

// If the clock ran out while the student was away, submit what was saved.
export async function autoSubmitIfExpired(attempt: Attempt, test: FullTest): Promise<Attempt> {
  if (attempt.status === "in_progress" && isExpired(attempt, test)) {
    return finalizeAttempt(attempt, test, { autoSubmitted: true });
  }
  return attempt;
}

export async function saveProgress(
  attempt: Attempt,
  input: { answers?: unknown; times?: unknown; flagged?: unknown }
): Promise<void> {
  const admin = createServerSupabase();
  const { error } = await admin
    .from("series_attempts")
    .update({
      answers: sanitizeAnswers(input.answers),
      times_ms: sanitizeTimes(input.times),
      flagged: sanitizeFlagged(input.flagged),
    })
    .eq("id", attempt.id)
    .eq("status", "in_progress");
  if (error) throw new Error(error.message);
}
