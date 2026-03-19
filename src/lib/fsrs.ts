import { fsrs, createEmptyCard, Rating, State, type Card, type Grade } from "ts-fsrs";

export { Rating } from "ts-fsrs";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FsrsState = "new" | "learning" | "review" | "relearning";

// Mirrors the user_card_states DB row (FSRS fields only)
export interface CardState {
  fsrsState: FsrsState;
  stability: number | null;
  difficulty: number | null;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  dueAt: Date;
  lastReviewAt: Date | null;
}

// ─── Drill type / item type constants ────────────────────────────────────────
// Kept as plain string constants (not DB enums) so new types can be added
// without schema migrations.

export const DRILL_TYPES = {
  KEYWORD_TO_KANJI: "keyword_to_kanji",
  KANJI_TO_KEYWORD: "kanji_to_keyword",
} as const;
export type DrillType = (typeof DRILL_TYPES)[keyof typeof DRILL_TYPES];

export const ITEM_TYPES = {
  KANJI: "kanji",
} as const;
export type ItemType = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES];

// ─── FSRS scheduler instance ─────────────────────────────────────────────────

const scheduler = fsrs();

// ─── State mapping ───────────────────────────────────────────────────────────

const STATE_TO_STRING: Record<State, FsrsState> = {
  [State.New]:        "new",
  [State.Learning]:   "learning",
  [State.Review]:     "review",
  [State.Relearning]: "relearning",
};

const STATE_FROM_STRING: Record<FsrsState, State> = {
  new:        State.New,
  learning:   State.Learning,
  review:     State.Review,
  relearning: State.Relearning,
};

// ─── Card ↔ DB mapping ───────────────────────────────────────────────────────

function cardStateToTsfsrs(state: CardState): Card {
  return {
    due:            state.dueAt,
    stability:      state.stability ?? 0,
    difficulty:     state.difficulty ?? 0,
    elapsed_days:   state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps:           state.reps,
    lapses:         state.lapses,
    state:          STATE_FROM_STRING[state.fsrsState],
    last_review:    state.lastReviewAt ?? undefined,
  } as Card;
}

function tsfsrsToCardState(card: Card, now: Date): CardState {
  return {
    fsrsState:     STATE_TO_STRING[card.state],
    stability:     card.stability || null,
    difficulty:    card.difficulty || null,
    elapsedDays:   card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps ?? 0,
    reps:          card.reps,
    lapses:        card.lapses,
    dueAt:         card.due,
    lastReviewAt:  now,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initial card state for a newly added card (never reviewed).
 */
export function initCardState(): CardState {
  const card = createEmptyCard(new Date());
  return {
    fsrsState:     "new",
    stability:     null,
    difficulty:    null,
    elapsedDays:   0,
    scheduledDays: 0,
    learningSteps: 0,
    reps:          0,
    lapses:        0,
    dueAt:         card.due,
    lastReviewAt:  null,
  };
}

/**
 * Process a review and return the updated card state to persist.
 */
export function scheduleReview(
  state: CardState,
  rating: Rating,
  now = new Date(),
): CardState {
  const card = cardStateToTsfsrs(state);
  const results = scheduler.repeat(card, now);
  return tsfsrsToCardState(results[rating as Grade].card, now);
}

/**
 * Convert a continuous 0–1 auto-evaluation score (kaku-ren stroke similarity,
 * quiz correctness, etc.) to an FSRS rating.
 *
 * Thresholds are intentionally conservative — erring toward Again/Hard keeps
 * the algorithm from over-scheduling cards the learner hasn't truly mastered.
 */
export function ratingFromScore(score: number): Rating {
  if (score < 0.40) return Rating.Again;
  if (score < 0.65) return Rating.Hard;
  if (score < 0.85) return Rating.Good;
  return Rating.Easy;
}

/**
 * Return all four scheduled outcomes for a card without committing to one.
 * Useful for rendering the self-assessment buttons with their due dates.
 */
export function previewSchedule(
  state: CardState,
  now = new Date(),
): Record<Grade, CardState> {
  const card = cardStateToTsfsrs(state);
  const results = scheduler.repeat(card, now);
  return {
    [Rating.Again]: tsfsrsToCardState(results[Rating.Again].card, now),
    [Rating.Hard]:  tsfsrsToCardState(results[Rating.Hard].card,  now),
    [Rating.Good]:  tsfsrsToCardState(results[Rating.Good].card,  now),
    [Rating.Easy]:  tsfsrsToCardState(results[Rating.Easy].card,  now),
  };
}
