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
import { type Rating } from "ts-fsrs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await req.json()) as {
    itemId:    number;
    drillType: string;
    rating:    number;
    rawScore:  number | null;
  };
  const { itemId, drillType, rating, rawScore } = body;

  // Fetch current card state from DB
  const existing = await db.execute(sql`
    SELECT fsrs_state, stability, difficulty, elapsed_days, scheduled_days,
           learning_steps, reps, lapses, due_at, last_review_at
    FROM user_card_states
    WHERE user_id   = ${userId}
      AND item_type = ${ITEM_TYPES.KANJI}
      AND item_id   = ${itemId}
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

  const now = new Date();
  const newState = scheduleReview(currentState, rating as Rating, now);

  // Upsert card state
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

  // Append drill event
  await db.insert(userDrillEvents).values({
    userId,
    itemType:  ITEM_TYPES.KANJI,
    itemId,
    drillType,
    rating,
    rawScore:  rawScore ?? null,
  });

  return Response.json({ cardState: newState });
}
