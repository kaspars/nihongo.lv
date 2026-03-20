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

/**
 * Priority bucket for drill card ordering. Mirrors the SQL CASE expression
 * used in the cards and overview API routes.
 *
 *   0 — due now   (highest priority)
 *   1 — new       (never seen)
 *   2 — future    (scheduled, not yet due)
 */
export function cardPriorityBucket(hasState: boolean, dueAt: Date | null, now: Date): 0 | 1 | 2 {
  if (!hasState) return 1;
  if (dueAt !== null && dueAt <= now) return 0;
  return 2;
}

/**
 * Advances the drill queue by one card.
 * Passed cards are removed; failed cards rotate to the back.
 * Returns a new array — does not mutate the input.
 */
export function rotateQueue<T>(queue: T[], passed: boolean): T[] {
  if (queue.length === 0) return queue;
  const [head, ...tail] = queue;
  return passed ? tail : [...tail, head];
}
