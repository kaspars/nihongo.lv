import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import CharacterDetail from "./CharacterDetail";
import type { CharacterDetailData } from "@/app/api/characters/[id]/route";

async function fetchCharacter(id: number): Promise<CharacterDetailData | null> {
  const rows = await db.execute(sql.raw(`
    SELECT
      c.id, c.literal, c.stroke_count AS "strokeCount", c.radical,
      (jk.character_id IS NOT NULL)  AS "hasJapanese",
      (sh.character_id IS NOT NULL)  AS "hasSimplified",
      (th.character_id IS NOT NULL)  AS "hasTraditional",
      jk.category, jk.grade, jk.jlpt, jk.sort_heisig AS "heisigJa",
      sh.hsk2_level AS "hsk2Level", sh.sort_heisig AS "heisigZhs",
      th.sort_heisig AS "heisigZht",
      cm_ja_en.keyword  AS "keywordJaEn",
      cm_ja_lv.keyword  AS "keywordJaLv",
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
    WHERE c.id = ${id}
  `));

  if (!rows.length) return null;
  const r = rows[0] as any;

  const readings = await db.execute(sql.raw(`
    SELECT language, type, value FROM character_readings
    WHERE character_id = ${id} ORDER BY language, type, position
  `)) as any[];

  const relationships = await db.execute(sql.raw(`
    SELECT cr.type, cr.from_character_id, cr.to_character_id, c2.literal AS other_literal
    FROM character_relationships cr
    JOIN characters c2 ON c2.id = CASE
      WHEN cr.from_character_id = ${id} THEN cr.to_character_id
      ELSE cr.from_character_id
    END
    WHERE cr.from_character_id = ${id} OR cr.to_character_id = ${id}
  `)) as any[];

  const readingValues = (lang: string, type: string) =>
    readings.filter(rd => rd.language === lang && rd.type === type).map(rd => rd.value);

  return {
    id: r.id,
    literal: r.literal,
    strokeCount: r.strokeCount,
    radical: r.radical,
    japanese: r.hasJapanese ? {
      category: r.category ?? null,
      grade: r.grade ?? null,
      jlpt: r.jlpt ?? null,
      heisig: r.heisigJa ?? null,
      keywordEn: r.keywordJaEn ?? null,
      keywordLv: r.keywordJaLv ?? null,
      onyomi:  readingValues("ja", "onyomi"),
      kunyomi: readingValues("ja", "kunyomi"),
    } : null,
    simplifiedChinese: r.hasSimplified ? {
      hsk2Level: r.hsk2Level ?? null,
      heisig: r.heisigZhs ?? null,
      keywordEn: r.keywordZhsEn ?? null,
      keywordLv: r.keywordZhsLv ?? null,
      pinyin: readingValues("cmn", "pinyin"),
    } : null,
    traditionalChinese: r.hasTraditional ? {
      heisig: r.heisigZht ?? null,
      keywordEn: r.keywordZhtEn ?? null,
      keywordLv: r.keywordZhtLv ?? null,
      pinyin: readingValues("cmn", "pinyin"),
    } : null,
    relationships: relationships.map(rel => ({
      type: rel.type,
      direction: rel.from_character_id === id ? "from" : "to",
      otherId: rel.from_character_id === id ? rel.to_character_id : rel.from_character_id,
      otherLiteral: rel.other_literal,
    })),
  };
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const charId = parseInt(id);
  if (isNaN(charId)) notFound();

  const data = await fetchCharacter(charId);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/characters"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Characters
        </Link>
        <h1 className="text-4xl font-cjk-ja-sans font-medium text-gray-900" lang="ja">
          {data.literal}
        </h1>
        <span className="text-sm text-gray-400">
          U+{data.id.toString(16).toUpperCase().padStart(4, "0")}
        </span>
      </div>
      <CharacterDetail data={data} />
    </div>
  );
}
