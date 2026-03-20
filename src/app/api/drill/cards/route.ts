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
  const drillTypes = (sp.get("direction") ?? "keyword_to_kanji")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Build: (VALUES ('keyword_to_kanji'), ('kanji_to_keyword'), ...)
  const valuesSql = sql.join(drillTypes.map((t) => sql`(${t})`), sql`, `);

  const rows = await db.execute(sql`
    WITH drill_types(dt) AS (VALUES ${valuesSql}),
    all_pairs AS (
      SELECT
        c.id,
        c.literal,
        cm.keyword,
        dt.dt                                         AS drill_type,
        jk.grade,
        COALESCE(ucs.fsrs_state, 'new')               AS fsrs_state,
        ucs.stability,
        ucs.difficulty,
        COALESCE(ucs.elapsed_days,   0)               AS elapsed_days,
        COALESCE(ucs.scheduled_days, 0)               AS scheduled_days,
        COALESCE(ucs.learning_steps, 0)               AS learning_steps,
        COALESCE(ucs.reps,           0)               AS reps,
        COALESCE(ucs.lapses,         0)               AS lapses,
        COALESCE(ucs.due_at, NOW())                   AS due_at,
        ucs.last_review_at,
        CASE
          WHEN ucs.user_id IS NULL THEN 1
          WHEN ucs.due_at <= NOW() THEN 0
          ELSE                         2
        END                                           AS priority_bucket,
        ROW_NUMBER() OVER (
          PARTITION BY c.id
          ORDER BY
            CASE
              WHEN ucs.user_id IS NULL THEN 1
              WHEN ucs.due_at <= NOW() THEN 0
              ELSE                         2
            END ASC,
            ucs.due_at ASC NULLS LAST
        )                                             AS rn
      FROM characters c
      JOIN japanese_kanji jk
        ON  jk.character_id = c.id
        AND jk.category = 'jouyou'
      JOIN character_meanings cm
        ON  cm.character_id    = c.id
        AND cm.source_language  = 'ja'
        AND cm.meaning_language = 'lv'
        AND cm.keyword IS NOT NULL
        AND cm.checked = true
      CROSS JOIN drill_types dt
      LEFT JOIN user_card_states ucs
        ON  ucs.item_id    = c.id
        AND ucs.item_type  = ${ITEM_TYPES.KANJI}
        AND ucs.drill_type = dt.dt
        AND ucs.user_id    = ${userId}
    )
    SELECT * FROM all_pairs
    WHERE rn = 1
    ORDER BY
      priority_bucket ASC,
      due_at ASC NULLS LAST,
      CASE grade
        WHEN '1' THEN 1  WHEN '2' THEN 2  WHEN '3' THEN 3
        WHEN '4' THEN 4  WHEN '5' THEN 5  WHEN '6' THEN 6
        WHEN 'S' THEN 7  ELSE            8
      END,
      id ASC
    LIMIT ${count}
  `);

  const cards = rows.map((r: Record<string, unknown>) => ({
    id:        r.id       as number,
    literal:   r.literal  as string,
    keyword:   r.keyword  as string,
    drillType: r.drill_type as string,
    cardState: {
      fsrsState:     (r.fsrs_state     as FsrsState) ?? "new",
      stability:     (r.stability      as number | null) ?? null,
      difficulty:    (r.difficulty     as number | null) ?? null,
      elapsedDays:   (r.elapsed_days   as number) ?? 0,
      scheduledDays: (r.scheduled_days as number) ?? 0,
      learningSteps: (r.learning_steps as number) ?? 0,
      reps:          (r.reps           as number) ?? 0,
      lapses:        (r.lapses         as number) ?? 0,
      dueAt:         new Date(r.due_at as string),
      lastReviewAt:  r.last_review_at ? new Date(r.last_review_at as string) : null,
    } satisfies CardState,
  }));

  return Response.json(cards);
}
