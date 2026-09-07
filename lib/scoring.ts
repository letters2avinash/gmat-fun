/**
 * GMAT Focus Edition-style adaptive scoring engine.
 *
 * GMAT Focus Edition (2023–) scores three sections independently —
 * Quantitative Reasoning, Verbal Reasoning, Data Insights — each on a
 * 60–90 scaled-score band (1-point increments), then combines them into
 * a 205–805 Total Score in 10-point increments. Each section is itself a
 * computer-adaptive test: the difficulty of the next question is chosen
 * from an ability estimate that updates after every response, and score
 * depends on both how many questions you got right AND how hard they
 * were — not raw percent correct.
 *
 * GMAC has never published its exact item-response-theory parameters or
 * its section->total conversion table. This engine is a transparent,
 * documented approximation of the published methodology, not a reverse
 * engineered copy of a secret formula:
 *
 *  - Ability ("theta") is tracked with a 1-parameter logistic (Rasch)
 *    online update — the standard lightweight approach for adaptive
 *    testing when items carry a single difficulty rating rather than
 *    fully calibrated 3PL parameters.
 *  - Each question's difficulty (1–5 tier for Quant/Verbal, Easy/Medium/
 *    Hard for Data Insights) is mapped to an IRT "b" (difficulty)
 *    parameter on the same theta scale.
 *  - The next question is chosen to have b close to the current theta —
 *    the item that carries the most information for a 1PL model, which
 *    is what "adaptive" means: get it right, the next one gets harder;
 *    get it wrong, the next one gets easier, with the swings shrinking
 *    as the section goes on.
 *  - theta is mapped onto the real 60–90 section-score band, and the
 *    (up to three) section scores are combined onto the real 205–805
 *    band using GMAC's published anchor points — all-60 => 205,
 *    all-90 => 805 — with linear interpolation between them, rounded to
 *    the nearest official 10-point increment.
 */

export type ScoringSection = "quant" | "verbal" | "data_insights";

const SECTION_SCORE_MIN = 60;
const SECTION_SCORE_MAX = 90;
const TOTAL_SCORE_MIN = 205;
const TOTAL_SCORE_MAX = 805;
const THETA_MIN = -3;
const THETA_MAX = 3;
const STARTING_THETA = 0;

export function startingTheta(): number {
  return STARTING_THETA;
}

/** 1–5 tier (the `questions.difficulty` column) -> IRT b-parameter. */
export function bFromTierDifficulty(tier: number): number {
  return ((tier - 3) / 2) * 2; // 1..5 -> -2..2
}

/** theta -> nearest 1–5 tier, for querying `questions` by difficulty. */
export function tierFromTheta(theta: number): number {
  const raw = Math.round(theta) + 3;
  return Math.min(5, Math.max(1, raw));
}

/** Data Insights' Easy/Medium/Hard label -> IRT b-parameter. */
export function bFromDiDifficulty(label: string | null | undefined): number {
  switch ((label || "").toLowerCase()) {
    case "easy":
      return -1.5;
    case "hard":
      return 1.5;
    default:
      return 0; // medium / unrated
  }
}

/** theta -> nearest Easy/Medium/Hard label, for querying `di_items`. */
export function diDifficultyFromTheta(theta: number): "Easy" | "Medium" | "Hard" {
  if (theta < -0.5) return "Easy";
  if (theta > 0.5) return "Hard";
  return "Medium";
}

function probCorrect(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/**
 * Online ability update after a single response — a gradient step on the
 * 1PL log-likelihood (d/dtheta log L = observed - predicted), with a
 * learning rate that shrinks as the section progresses: big swings on
 * the first few questions, fine-tuning by the end. This mirrors real CAT
 * behavior, where early items matter most for locating your ability
 * level and later items mostly narrow the estimate.
 */
export function nextTheta(
  currentTheta: number,
  itemB: number,
  wasCorrect: boolean,
  questionsAnsweredInSection: number
): number {
  const p = probCorrect(currentTheta, itemB);
  const learningRate =
    questionsAnsweredInSection < 5 ? 0.9 : questionsAnsweredInSection < 12 ? 0.6 : 0.35;
  const raw = currentTheta + learningRate * ((wasCorrect ? 1 : 0) - p);
  return Math.min(THETA_MAX, Math.max(THETA_MIN, raw));
}

/** theta -> the real 60–90 section scaled score. */
export function sectionScoreFromTheta(theta: number): number {
  const t = Math.min(THETA_MAX, Math.max(THETA_MIN, theta));
  const ratio = (t - THETA_MIN) / (THETA_MAX - THETA_MIN);
  return Math.round(SECTION_SCORE_MIN + ratio * (SECTION_SCORE_MAX - SECTION_SCORE_MIN));
}

/**
 * Combine 1–3 section scaled scores (60–90 each) into the 205–805 Total
 * Score, in the real 10-point increments, using GMAC's published anchor
 * points with linear interpolation.
 */
export function totalScoreFromSections(scores: number[]): number {
  if (scores.length === 0) return TOTAL_SCORE_MIN;
  const avgRatio =
    scores.reduce((sum, v) => sum + (v - SECTION_SCORE_MIN) / (SECTION_SCORE_MAX - SECTION_SCORE_MIN), 0) /
    scores.length;
  const raw = TOTAL_SCORE_MIN + avgRatio * (TOTAL_SCORE_MAX - TOTAL_SCORE_MIN);
  const rounded = Math.round(raw / 10) * 10;
  return Math.min(TOTAL_SCORE_MAX, Math.max(TOTAL_SCORE_MIN, rounded));
}

/** Max answer edits allowed per module in the end-of-module review screen. */
export const MAX_EDITS_PER_MODULE = 3;

/** Section time limits (minutes), matching GMAT Focus Edition's real timing. */
export const SECTION_TIME_LIMITS_MIN: Record<ScoringSection, number> = {
  quant: 45,
  verbal: 45,
  data_insights: 45,
};

/** Question counts per module, matching GMAT Focus Edition's real counts. */
export const SECTION_QUESTION_COUNTS: Record<ScoringSection, number> = {
  quant: 21,
  verbal: 23,
  data_insights: 20,
};
