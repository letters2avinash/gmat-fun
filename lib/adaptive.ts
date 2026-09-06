/**
 * Shared adaptive difficulty engine for gmat.fun.
 *
 * Same core logic drives all three delivery modes (topic-wise, sectional,
 * full-length) — only how a mode picks which section/topic pool to draw
 * from differs; the difficulty-stepping rule is identical everywhere so
 * scoring stays comparable across modes.
 *
 * Model: 5 difficulty tiers (1 easiest – 5 hardest). A correct answer
 * steps difficulty up, an incorrect answer steps it down, with the step
 * size shrinking as the test progresses (mirrors real CAT behavior: big
 * swings early, fine-tuning later).
 */

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const STARTING_DIFFICULTY = 3;

export function startingDifficulty(): number {
  return STARTING_DIFFICULTY;
}

/**
 * questionsAnswered: how many questions into the test this response is
 * (0-indexed count *before* this one) — used to shrink step size over time.
 */
export function nextDifficulty(
  currentDifficulty: number,
  wasCorrect: boolean,
  questionsAnswered: number
): number {
  const step = questionsAnswered < 5 ? 1 : questionsAnswered < 12 ? 1 : 0.5;
  const raw = currentDifficulty + (wasCorrect ? step : -step);
  const rounded = Math.round(raw * 2) / 2; // allow half-steps for fine-tuning
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, rounded));
}

/**
 * Rough ability estimate from the sequence of difficulties answered
 * correctly/incorrectly, scaled to a 200-800-style band for display.
 * This is a simple weighted average, not a full IRT model — good enough
 * for an MVP score estimate; swap in a proper IRT/3PL model once there's
 * enough response data to calibrate item parameters.
 */
export function estimateScore(
  responses: { difficulty: number; correct: boolean }[]
): number {
  if (responses.length === 0) return 0;

  const weighted = responses.reduce((sum, r) => {
    return sum + (r.correct ? r.difficulty : r.difficulty * 0.3);
  }, 0);
  const maxPossible = responses.length * MAX_DIFFICULTY;
  const ratio = weighted / maxPossible;

  // Map 0..1 onto a 200..800 band (GMAT-style range) for a familiar number.
  return Math.round(200 + ratio * 600);
}
