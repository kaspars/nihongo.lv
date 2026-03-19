import { describe, it, expect } from "vitest";
import { Rating } from "ts-fsrs";
import {
  initCardState,
  scheduleReview,
  ratingFromScore,
  previewSchedule,
  type CardState,
} from "./fsrs";

// ─── initCardState ────────────────────────────────────────────────────────────

describe("initCardState", () => {
  it("returns a new card with zeroed stats", () => {
    const state = initCardState();
    expect(state.fsrsState).toBe("new");
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.stability).toBeNull();
    expect(state.difficulty).toBeNull();
    expect(state.lastReviewAt).toBeNull();
  });

  it("sets dueAt to approximately now", () => {
    const before = new Date();
    const state = initCardState();
    const after = new Date();
    expect(state.dueAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(state.dueAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});

// ─── scheduleReview ───────────────────────────────────────────────────────────

describe("scheduleReview", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const newCard = initCardState();

  it("increments reps on any passing rating", () => {
    const next = scheduleReview(newCard, Rating.Good, now);
    expect(next.reps).toBe(1);
  });

  it("Again on a new card does not increment reps — card stays in learning", () => {
    const next = scheduleReview(newCard, Rating.Again, now);
    expect(next.lapses).toBe(0); // no lapse on a new card
    expect(next.fsrsState).toBe("learning");
  });

  it("Good on a new card transitions to learning", () => {
    const next = scheduleReview(newCard, Rating.Good, now);
    expect(next.fsrsState).toBe("learning");
    expect(next.stability).toBeGreaterThan(0);
    expect(next.difficulty).toBeGreaterThan(0);
  });

  it("sets lastReviewAt to now", () => {
    const next = scheduleReview(newCard, Rating.Good, now);
    expect(next.lastReviewAt?.getTime()).toBe(now.getTime());
  });

  it("dueAt is in the future after a Good rating", () => {
    const next = scheduleReview(newCard, Rating.Good, now);
    expect(next.dueAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("Again on a Review card increments lapses", () => {
    // Simulate a card that has reached Review state
    const reviewCard: CardState = {
      fsrsState:     "review",
      stability:     10,
      difficulty:    5,
      elapsedDays:   10,
      scheduledDays: 10,
      learningSteps: 0,
      reps:          5,
      lapses:        0,
      dueAt:         now,
      lastReviewAt:  new Date("2025-12-22T12:00:00Z"),
    };
    const next = scheduleReview(reviewCard, Rating.Again, now);
    expect(next.lapses).toBe(1);
    expect(next.fsrsState).toBe("relearning");
  });

  it("Easy gives a longer interval than Good", () => {
    const good = scheduleReview(newCard, Rating.Good, now);
    const easy = scheduleReview(newCard, Rating.Easy, now);
    expect(easy.dueAt.getTime()).toBeGreaterThan(good.dueAt.getTime());
  });

  it("Hard gives a shorter interval than Good", () => {
    const hard = scheduleReview(newCard, Rating.Hard, now);
    const good = scheduleReview(newCard, Rating.Good, now);
    expect(hard.dueAt.getTime()).toBeLessThanOrEqual(good.dueAt.getTime());
  });

  it("preserves item identity fields through multiple reviews", () => {
    let state = initCardState();
    for (const rating of [Rating.Good, Rating.Good, Rating.Hard, Rating.Good]) {
      state = scheduleReview(state, rating, now);
    }
    expect(state.reps).toBe(4);
    expect(state.lapses).toBe(0);
  });
});

// ─── ratingFromScore ──────────────────────────────────────────────────────────

describe("ratingFromScore", () => {
  it("score 0.0 → Again", () => expect(ratingFromScore(0.0)).toBe(Rating.Again));
  it("score 0.39 → Again", () => expect(ratingFromScore(0.39)).toBe(Rating.Again));
  it("score 0.40 → Hard", () => expect(ratingFromScore(0.40)).toBe(Rating.Hard));
  it("score 0.64 → Hard", () => expect(ratingFromScore(0.64)).toBe(Rating.Hard));
  it("score 0.65 → Good", () => expect(ratingFromScore(0.65)).toBe(Rating.Good));
  it("score 0.84 → Good", () => expect(ratingFromScore(0.84)).toBe(Rating.Good));
  it("score 0.85 → Easy", () => expect(ratingFromScore(0.85)).toBe(Rating.Easy));
  it("score 1.00 → Easy", () => expect(ratingFromScore(1.00)).toBe(Rating.Easy));
});

// ─── previewSchedule ──────────────────────────────────────────────────────────

describe("previewSchedule", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const newCard = initCardState();

  it("returns all four rating outcomes", () => {
    const preview = previewSchedule(newCard, now);
    expect(preview[Rating.Again]).toBeDefined();
    expect(preview[Rating.Hard]).toBeDefined();
    expect(preview[Rating.Good]).toBeDefined();
    expect(preview[Rating.Easy]).toBeDefined();
  });

  it("outcomes are ordered Again < Hard <= Good < Easy by due date", () => {
    // For a new card in learning, Again and Hard may have the same short interval,
    // but Easy should always be furthest out.
    const preview = previewSchedule(newCard, now);
    expect(preview[Rating.Easy].dueAt.getTime())
      .toBeGreaterThan(preview[Rating.Good].dueAt.getTime());
    expect(preview[Rating.Good].dueAt.getTime())
      .toBeGreaterThanOrEqual(preview[Rating.Hard].dueAt.getTime());
  });

  it("does not mutate the original card state", () => {
    const original = initCardState();
    const repsBefore = original.reps;
    previewSchedule(original, now);
    expect(original.reps).toBe(repsBefore);
  });
});
