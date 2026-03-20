import { describe, it, expect } from "vitest";
import { Rating } from "ts-fsrs";
import { isPassed, sessionRating, combinedState, PASS_THRESHOLD } from "./drill";

// ─── isPassed ────────────────────────────────────────────────────────────────

describe("isPassed", () => {
  describe("with rawScore (stroke drawing)", () => {
    it("passes at exactly the threshold", () => {
      expect(isPassed(Rating.Again, PASS_THRESHOLD)).toBe(true);
    });

    it("passes above the threshold", () => {
      expect(isPassed(Rating.Again, 1.0)).toBe(true);
      expect(isPassed(Rating.Again, 0.8)).toBe(true);
    });

    it("fails below the threshold", () => {
      expect(isPassed(Rating.Good, PASS_THRESHOLD - 0.01)).toBe(false);
      expect(isPassed(Rating.Easy, 0.0)).toBe(false);
    });

    it("ignores the rating when rawScore is provided", () => {
      expect(isPassed(Rating.Easy, 0.5)).toBe(false);
      expect(isPassed(Rating.Again, 0.9)).toBe(true);
    });
  });

  describe("without rawScore (self-assessed)", () => {
    it("passes on Good", () => {
      expect(isPassed(Rating.Good, null)).toBe(true);
    });

    it("passes on Easy", () => {
      expect(isPassed(Rating.Easy, null)).toBe(true);
    });

    it("fails on Hard", () => {
      expect(isPassed(Rating.Hard, null)).toBe(false);
    });

    it("fails on Again", () => {
      expect(isPassed(Rating.Again, null)).toBe(false);
    });
  });
});

// ─── sessionRating ───────────────────────────────────────────────────────────

describe("sessionRating", () => {
  it("returns the natural rating on the first attempt", () => {
    expect(sessionRating(1, Rating.Easy)).toBe(Rating.Easy);
    expect(sessionRating(1, Rating.Good)).toBe(Rating.Good);
    expect(sessionRating(1, Rating.Hard)).toBe(Rating.Hard);
    expect(sessionRating(1, Rating.Again)).toBe(Rating.Again);
  });

  it("caps at Hard on the second attempt", () => {
    expect(sessionRating(2, Rating.Easy)).toBe(Rating.Hard);
    expect(sessionRating(2, Rating.Good)).toBe(Rating.Hard);
    expect(sessionRating(2, Rating.Hard)).toBe(Rating.Hard);
  });

  it("preserves Again on the second attempt (already worst)", () => {
    expect(sessionRating(2, Rating.Again)).toBe(Rating.Again);
  });

  it("returns Again for three or more attempts", () => {
    expect(sessionRating(3, Rating.Easy)).toBe(Rating.Again);
    expect(sessionRating(3, Rating.Good)).toBe(Rating.Again);
    expect(sessionRating(10, Rating.Easy)).toBe(Rating.Again);
  });
});

// ─── combinedState ───────────────────────────────────────────────────────────

describe("combinedState", () => {
  it("returns the same state when both are equal", () => {
    expect(combinedState("new",        "new"       )).toBe("new");
    expect(combinedState("learning",   "learning"  )).toBe("learning");
    expect(combinedState("review",     "review"    )).toBe("review");
    expect(combinedState("relearning", "relearning")).toBe("relearning");
  });

  it("relearning beats everything", () => {
    expect(combinedState("relearning", "new"      )).toBe("relearning");
    expect(combinedState("relearning", "learning" )).toBe("relearning");
    expect(combinedState("relearning", "review"   )).toBe("relearning");
    expect(combinedState("new",        "relearning")).toBe("relearning");
    expect(combinedState("review",     "relearning")).toBe("relearning");
  });

  it("new beats learning and review", () => {
    expect(combinedState("new",      "learning")).toBe("new");
    expect(combinedState("new",      "review"  )).toBe("new");
    expect(combinedState("learning", "new"     )).toBe("new");
    expect(combinedState("review",   "new"     )).toBe("new");
  });

  it("learning beats review", () => {
    expect(combinedState("learning", "review")).toBe("learning");
    expect(combinedState("review",   "learning")).toBe("learning");
  });

  it("is commutative", () => {
    const states = ["new", "learning", "review", "relearning"] as const;
    for (const a of states) {
      for (const b of states) {
        expect(combinedState(a, b)).toBe(combinedState(b, a));
      }
    }
  });
});
