import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql, eq } from "drizzle-orm";
import * as schema from "@/db/schema";

export interface CharacterDetailData {
  id: number;
  literal: string;
  strokeCount: number | null;
  radical: number | null;
  japanese: {
    category: string | null;
    grade: string | null;
    jlpt: number | null;
    heisig: number | null;
    keywordEn: string | null;
    keywordLv: string | null;
    onyomi: string[];
    kunyomi: string[];
  } | null;
  simplifiedChinese: {
    hsk2Level: number | null;
    heisig: number | null;
    keywordEn: string | null;
    keywordLv: string | null;
    pinyin: string[];
  } | null;
  traditionalChinese: {
    heisig: number | null;
    keywordEn: string | null;
    keywordLv: string | null;
    pinyin: string[];
  } | null;
  relationships: Array<{
    type: string;
    direction: "from" | "to";
    otherId: number;
    otherLiteral: string;
  }>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const charId = parseInt(id);
  if (isNaN(charId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const rows = await db.execute(sql.raw(`
      SELECT
        c.id, c.literal, c.stroke_count AS "strokeCount", c.radical,
        (jk.character_id IS NOT NULL)  AS "hasJapanese",
        (sh.character_id IS NOT NULL)  AS "hasSimplified",
        (th.character_id IS NOT NULL)  AS "hasTraditional",
        jk.category, jk.grade, jk.jlpt, jk.sort_heisig AS "heisigJa",
        sh.hsk2_level AS "hsk2Level", sh.sort_heisig AS "heisigZhs",
        th.sort_heisig AS "heisigZht",
        cm_ja_en.keyword AS "keywordJaEn",
        cm_ja_lv.keyword AS "keywordJaLv",
        cm_zhs_en.keyword AS "keywordZhsEn",
        cm_zhs_lv.keyword AS "keywordZhsLv",
        cm_zht_en.keyword AS "keywordZhtEn",
        cm_zht_lv.keyword AS "keywordZhtLv"
      FROM characters c
      LEFT JOIN japanese_kanji jk       ON jk.character_id  = c.id
      LEFT JOIN simplified_hanzi sh     ON sh.character_id  = c.id
      LEFT JOIN traditional_hanzi th    ON th.character_id  = c.id
      LEFT JOIN character_meanings cm_ja_en  ON cm_ja_en.character_id  = c.id AND cm_ja_en.source_language  = 'ja'  AND cm_ja_en.meaning_language  = 'en'
      LEFT JOIN character_meanings cm_ja_lv  ON cm_ja_lv.character_id  = c.id AND cm_ja_lv.source_language  = 'ja'  AND cm_ja_lv.meaning_language  = 'lv'
      LEFT JOIN character_meanings cm_zhs_en ON cm_zhs_en.character_id = c.id AND cm_zhs_en.source_language = 'zhs' AND cm_zhs_en.meaning_language = 'en'
      LEFT JOIN character_meanings cm_zhs_lv ON cm_zhs_lv.character_id = c.id AND cm_zhs_lv.source_language = 'zhs' AND cm_zhs_lv.meaning_language = 'lv'
      LEFT JOIN character_meanings cm_zht_en ON cm_zht_en.character_id = c.id AND cm_zht_en.source_language = 'zht' AND cm_zht_en.meaning_language = 'en'
      LEFT JOIN character_meanings cm_zht_lv ON cm_zht_lv.character_id = c.id AND cm_zht_lv.source_language = 'zht' AND cm_zht_lv.meaning_language = 'lv'
      WHERE c.id = ${charId}
    `));

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const r = rows[0] as any;

    const readings = await db.execute(sql.raw(`
      SELECT language, type, value, position
      FROM character_readings
      WHERE character_id = ${charId}
      ORDER BY language, type, position
    `));

    const relationships = await db.execute(sql.raw(`
      SELECT cr.type, cr.from_character_id, cr.to_character_id,
             c2.literal AS other_literal
      FROM character_relationships cr
      JOIN characters c2 ON c2.id = CASE
        WHEN cr.from_character_id = ${charId} THEN cr.to_character_id
        ELSE cr.from_character_id
      END
      WHERE cr.from_character_id = ${charId} OR cr.to_character_id = ${charId}
    `)) as any[];

    const readingValues = (lang: string, type: string) =>
      (readings as any[])
        .filter((rd: any) => rd.language === lang && rd.type === type)
        .map((rd: any) => rd.value);

    const data: CharacterDetailData = {
      id: r.id,
      literal: r.literal,
      strokeCount: r.strokeCount,
      radical: r.radical,
      japanese: r.hasJapanese
        ? {
            category: r.category ?? null,
            grade: r.grade ?? null,
            jlpt: r.jlpt ?? null,
            heisig: r.heisigJa ?? null,
            keywordEn: r.keywordJaEn ?? null,
            keywordLv: r.keywordJaLv ?? null,
            onyomi: readingValues("ja", "onyomi"),
            kunyomi: readingValues("ja", "kunyomi"),
          }
        : null,
      simplifiedChinese: r.hasSimplified
        ? {
            hsk2Level: r.hsk2Level ?? null,
            heisig: r.heisigZhs ?? null,
            keywordEn: r.keywordZhsEn ?? null,
            keywordLv: r.keywordZhsLv ?? null,
            pinyin: readingValues("cmn", "pinyin"),
          }
        : null,
      traditionalChinese: r.hasTraditional
        ? {
            heisig: r.heisigZht ?? null,
            keywordEn: r.keywordZhtEn ?? null,
            keywordLv: r.keywordZhtLv ?? null,
            pinyin: readingValues("cmn", "pinyin"),
          }
        : null,
      relationships: (relationships as any[]).map((rel: any) => ({
        type: rel.type,
        direction: rel.from_character_id === charId ? "from" : "to",
        otherId: rel.from_character_id === charId ? rel.to_character_id : rel.from_character_id,
        otherLiteral: rel.other_literal,
      })),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/characters/[id] GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const charId = parseInt(id);
  if (isNaN(charId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json();

    // Update characters table
    if (body.strokeCount !== undefined || body.radical !== undefined) {
      const updates: Record<string, unknown> = {};
      if (body.strokeCount !== undefined) updates.strokeCount = body.strokeCount || null;
      if (body.radical !== undefined) updates.radical = body.radical || null;
      await db.update(schema.characters).set(updates).where(eq(schema.characters.id, charId));
    }

    // Update japanese_kanji
    if (body.japanese) {
      const ja = body.japanese;
      const updates: Record<string, unknown> = {};
      if (ja.category !== undefined) updates.category = ja.category || null;
      if (ja.grade !== undefined) updates.grade = ja.grade || null;
      if (ja.jlpt !== undefined) updates.jlpt = ja.jlpt || null;
      if (ja.heisig !== undefined) updates.sortHeisig = ja.heisig || null;
      if (Object.keys(updates).length) {
        await db.update(schema.japaneseKanji).set(updates).where(eq(schema.japaneseKanji.characterId, charId));
      }
      // Upsert keywords
      await upsertKeyword(charId, "ja", "en", ja.keywordEn);
      await upsertKeyword(charId, "ja", "lv", ja.keywordLv);
    }

    // Update simplified_hanzi
    if (body.simplifiedChinese) {
      const zh = body.simplifiedChinese;
      const updates: Record<string, unknown> = {};
      if (zh.hsk2Level !== undefined) updates.hsk2Level = zh.hsk2Level || null;
      if (zh.heisig !== undefined) updates.sortHeisig = zh.heisig || null;
      if (Object.keys(updates).length) {
        await db.update(schema.simplifiedHanzi).set(updates).where(eq(schema.simplifiedHanzi.characterId, charId));
      }
      await upsertKeyword(charId, "zhs", "en", zh.keywordEn);
      await upsertKeyword(charId, "zhs", "lv", zh.keywordLv);
    }

    // Update traditional_hanzi
    if (body.traditionalChinese) {
      const zh = body.traditionalChinese;
      const updates: Record<string, unknown> = {};
      if (zh.heisig !== undefined) updates.sortHeisig = zh.heisig || null;
      if (Object.keys(updates).length) {
        await db.update(schema.traditionalHanzi).set(updates).where(eq(schema.traditionalHanzi.characterId, charId));
      }
      await upsertKeyword(charId, "zht", "en", zh.keywordEn);
      await upsertKeyword(charId, "zht", "lv", zh.keywordLv);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/characters/[id] PATCH]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function upsertKeyword(
  charId: number,
  sourceLang: "ja" | "zhs" | "zht",
  meaningLang: "en" | "lv",
  keyword: string | null | undefined,
) {
  if (keyword === undefined) return;
  await db
    .insert(schema.characterMeanings)
    .values({
      characterId: charId,
      sourceLanguage: sourceLang,
      meaningLanguage: meaningLang,
      keyword: keyword || null,
    })
    .onConflictDoUpdate({
      target: [
        schema.characterMeanings.characterId,
        schema.characterMeanings.sourceLanguage,
        schema.characterMeanings.meaningLanguage,
      ],
      set: { keyword: keyword || null },
    });
}
