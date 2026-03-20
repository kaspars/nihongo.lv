import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ITEM_TYPES, type FsrsState } from "@/lib/fsrs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.literal,
      cm.keyword,
      COALESCE(ktk.fsrs_state, 'new') AS ktk_state,
      COALESCE(kk.fsrs_state,  'new') AS kk_state,
      (ktk.due_at IS NOT NULL AND ktk.due_at <= NOW()) AS ktk_due_now,
      (kk.due_at  IS NOT NULL AND kk.due_at  <= NOW()) AS kk_due_now
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
    LEFT JOIN user_card_states ktk
      ON  ktk.item_id   = c.id
      AND ktk.item_type = ${ITEM_TYPES.KANJI}
      AND ktk.drill_type = 'keyword_to_kanji'
      AND ktk.user_id   = ${userId}
    LEFT JOIN user_card_states kk
      ON  kk.item_id   = c.id
      AND kk.item_type = ${ITEM_TYPES.KANJI}
      AND kk.drill_type = 'kanji_to_keyword'
      AND kk.user_id   = ${userId}
    ORDER BY
      CASE
        WHEN ktk.due_at <= NOW() OR kk.due_at <= NOW() THEN 0
        WHEN ktk.user_id IS NULL AND kk.user_id IS NULL THEN 1
        ELSE 2
      END,
      CASE jk.grade
        WHEN '1' THEN 1  WHEN '2' THEN 2  WHEN '3' THEN 3
        WHEN '4' THEN 4  WHEN '5' THEN 5  WHEN '6' THEN 6
        WHEN 'S' THEN 7  ELSE            8
      END,
      c.id ASC
  `);

  const cards = rows.map((r: Record<string, unknown>) => ({
    id:       r.id      as number,
    literal:  r.literal as string,
    keyword:  r.keyword as string,
    ktkState: r.ktk_state as FsrsState,
    kkState:  r.kk_state  as FsrsState,
    ktkDueNow: Boolean(r.ktk_due_now),
    kkDueNow:  Boolean(r.kk_due_now),
  }));

  return Response.json(cards);
}
