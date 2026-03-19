import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { userCardStates, userDrillEvents } from "@/db/schema";
import {
  scheduleReview,
  initCardState,
  ITEM_TYPES,
  type CardState,
  type FsrsState,
} from "@/lib/fsrs";
import { Rating } from "ts-fsrs";

/**
 * Downgrade the session rating based on how many attempts the card needed.
 *
 *   1 attempt  → natural rating (whatever the user actually scored)
 *   2 attempts → Hard (capped — needed a retry)
 *   3+ attempts → Again (needed multiple retries)
 *
 * This ensures cards that required retries get shorter FSRS intervals than
 * cards that were answered correctly on the first try.
 */
function sessionRating(attempts: number, finalRating: Rating): Rating {
  if (attempts <= 1) return finalRating;
  if (attempts === 2) return Math.min(finalRating, Rating.Hard) as Rating;
  return Rating.Again;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await req.json()) as {
    itemId:           number;
    drillType:        string;
    rating:           number;
    rawScore:         number | null;
    isFinal:          boolean;
    sessionAttempts?: number; // only required when isFinal=true
  };
  const { itemId, drillType, rating, rawScore, isFinal } = body;

  // Always log the attempt to drill_events (full history for analytics)
  await db.insert(userDrillEvents).values({
    userId,
    itemType:  ITEM_TYPES.KANJI,
    itemId,
    drillType,
    rating,
    rawScore: rawScore ?? null,
  });

  // Only update card_states on the final passing attempt, using the
  // session-adjusted rating so FSRS schedules harder cards sooner.
  if (!isFinal) {
    return Response.json({ ok: true });
  }

  const attempts    = body.sessionAttempts ?? 1;
  const adjRating   = sessionRating(attempts, rating as Rating);
  const now         = new Date();

  // Fetch current card state (or initialise for a brand-new card)
  const existing = await db.execute(sql`
    SELECT fsrs_state, stability, difficulty, elapsed_days, scheduled_days,
           learning_steps, reps, lapses, due_at, last_review_at
    FROM user_card_states
    WHERE user_id    = ${userId}
      AND item_type  = ${ITEM_TYPES.KANJI}
      AND item_id    = ${itemId}
      AND drill_type = ${drillType}
  `);

  let currentState: CardState;
  if (existing.length === 0) {
    currentState = initCardState();
  } else {
    const r = existing[0] as Record<string, unknown>;
    currentState = {
      fsrsState:     r.fsrs_state     as FsrsState,
      stability:     r.stability      as number | null,
      difficulty:    r.difficulty     as number | null,
      elapsedDays:   r.elapsed_days   as number,
      scheduledDays: r.scheduled_days as number,
      learningSteps: r.learning_steps as number,
      reps:          r.reps           as number,
      lapses:        r.lapses         as number,
      dueAt:         new Date(r.due_at as string),
      lastReviewAt:  r.last_review_at ? new Date(r.last_review_at as string) : null,
    };
  }

  const newState = scheduleReview(currentState, adjRating, now);

  await db
    .insert(userCardStates)
    .values({
      userId,
      itemType:      ITEM_TYPES.KANJI,
      itemId,
      drillType,
      fsrsState:     newState.fsrsState,
      stability:     newState.stability,
      difficulty:    newState.difficulty,
      elapsedDays:   newState.elapsedDays,
      scheduledDays: newState.scheduledDays,
      learningSteps: newState.learningSteps,
      reps:          newState.reps,
      lapses:        newState.lapses,
      dueAt:         newState.dueAt,
      lastReviewAt:  newState.lastReviewAt,
    })
    .onConflictDoUpdate({
      target: [
        userCardStates.userId,
        userCardStates.itemType,
        userCardStates.itemId,
        userCardStates.drillType,
      ],
      set: {
        fsrsState:     newState.fsrsState,
        stability:     newState.stability,
        difficulty:    newState.difficulty,
        elapsedDays:   newState.elapsedDays,
        scheduledDays: newState.scheduledDays,
        learningSteps: newState.learningSteps,
        reps:          newState.reps,
        lapses:        newState.lapses,
        dueAt:         newState.dueAt,
        lastReviewAt:  newState.lastReviewAt,
      },
    });

  return Response.json({ cardState: newState });
}
