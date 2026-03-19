import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ITEM_TYPES, type CardState, type FsrsState } from "@/lib/fsrs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const sp = req.nextUrl.searchParams;
  const count = Math.min(Math.max(parseInt(sp.get("count") ?? "10", 10), 1), 100);
  const drillType = sp.get("direction") ?? "keyword_to_kanji";

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.literal,
      cm.keyword,
      COALESCE(ucs.fsrs_state, 'new')   AS fsrs_state,
      ucs.stability,
      ucs.difficulty,
      COALESCE(ucs.elapsed_days,   0)   AS elapsed_days,
      COALESCE(ucs.scheduled_days, 0)   AS scheduled_days,
      COALESCE(ucs.learning_steps, 0)   AS learning_steps,
      COALESCE(ucs.reps,           0)   AS reps,
      COALESCE(ucs.lapses,         0)   AS lapses,
      COALESCE(ucs.due_at, NOW())       AS due_at,
      ucs.last_review_at
    FROM characters c
    JOIN japanese_kanji jk
      ON  jk.character_id = c.id
      AND jk.category = 'jouyou'
    JOIN character_meanings cm
      ON  cm.character_id   = c.id
      AND cm.source_language = 'ja'
      AND cm.meaning_language = 'lv'
      AND cm.keyword IS NOT NULL
      AND cm.checked = true
    LEFT JOIN user_card_states ucs
      ON  ucs.item_id    = c.id
      AND ucs.item_type  = ${ITEM_TYPES.KANJI}
      AND ucs.drill_type = ${drillType}
      AND ucs.user_id    = ${userId}
    ORDER BY
      CASE
        WHEN ucs.user_id IS NULL   THEN 1   -- new (never seen)
        WHEN ucs.due_at <= NOW()   THEN 0   -- due for review
        ELSE                            2   -- reviewed but not yet due
      END,
      ucs.due_at ASC NULLS LAST
    LIMIT ${count}
  `);

  const cards = rows.map((r: Record<string, unknown>) => ({
    id:      r.id      as number,
    literal: r.literal as string,
    keyword: r.keyword as string,
    cardState: {
      fsrsState:     (r.fsrs_state    as FsrsState) ?? "new",
      stability:     (r.stability     as number | null) ?? null,
      difficulty:    (r.difficulty    as number | null) ?? null,
      elapsedDays:   (r.elapsed_days  as number) ?? 0,
      scheduledDays: (r.scheduled_days as number) ?? 0,
      learningSteps: (r.learning_steps as number) ?? 0,
      reps:          (r.reps          as number) ?? 0,
      lapses:        (r.lapses        as number) ?? 0,
      dueAt:         new Date(r.due_at as string),
      lastReviewAt:  r.last_review_at ? new Date(r.last_review_at as string) : null,
    } satisfies CardState,
  }));

  return Response.json(cards);
}
