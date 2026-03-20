import { Rating } from "ts-fsrs";
import type { FsrsState } from "@/lib/fsrs";

export const PASS_THRESHOLD = 0.75;

/**
 * Returns true if the card attempt counts as passed.
 * Stroke-drawing cards pass when the average score meets the threshold.
 * Self-assessed cards (kanji→keyword) pass when rated Good or better.
 */
export function isPassed(rating: Rating, rawScore: number | null): boolean {
  if (rawScore !== null) return rawScore >= PASS_THRESHOLD;
  return rating >= Rating.Good;
}

/**
 * Downgrades the session rating based on how many attempts were needed.
 *
 *   1 attempt  → natural rating (whatever the user scored)
 *   2 attempts → Hard (capped — needed a retry)
 *   3+ attempts → Again (needed multiple retries)
 *
 * Ensures cards that required retries get shorter FSRS intervals than
 * cards answered correctly on the first try.
 */
export function sessionRating(attempts: number, finalRating: Rating): Rating {
  if (attempts <= 1) return finalRating;
  if (attempts === 2) return Math.min(finalRating, Rating.Hard) as Rating;
  return Rating.Again;
}

/**
 * Priority for combining two FSRS states — lower number = worse/more urgent.
 * relearning > new > learning > review
 */
export const STATE_PRIORITY: Record<FsrsState, number> = {
  relearning: 0,
  new:        1,
  learning:   2,
  review:     3,
};

/**
 * Returns the more urgent of two FSRS states (worst-of-two).
 */
export function combinedState(a: FsrsState, b: FsrsState): FsrsState {
  return STATE_PRIORITY[a] <= STATE_PRIORITY[b] ? a : b;
}
