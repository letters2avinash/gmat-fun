// Estimated section score on the GMAT Focus 60–90 scale.
// Practice estimate only: GMAC does not publish its scoring algorithm, so this
// is not an official GMAT score.
//
// The curve is deliberately non-linear: each extra correct answer is worth more
// near the top of the scale, so strong accuracy separates from average accuracy.

export const SCALE_MIN = 60;
export const SCALE_MAX = 90;

export const SCORE_NOTE =
  "Estimated Verbal section score on the GMAT Focus 60–90 scale. This is a practice estimate, not an official GMAT score.";

export function scaledScore(correct: number | null | undefined, total: number): number {
  const c = Math.max(0, Math.min(total, correct ?? 0));
  if (total <= 0) return SCALE_MIN;
  const p = c / total;
  return Math.round(SCALE_MIN + (SCALE_MAX - SCALE_MIN) * Math.pow(p, 1.6));
}
