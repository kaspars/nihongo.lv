import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import CharacterDetail from "./CharacterDetail";
import type { CharacterDetailData } from "@/app/api/characters/[id]/route";
import type { CharacterFilters, CharacterContext } from "@/app/admin/characters/filters";
import { numOrUndef, buildWhereConditions, buildOrderBy } from "@/app/api/characters/query-helpers";

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

// Parse searchParams into CharacterFilters, applying the same defaults as the
// CharacterTable UI (ctx=ja, ja_joyo=true) so prev/next matches what the user sees.
function parseFilters(sp: Record<string, string>): CharacterFilters {
  const get = (k: string) => sp[k] ?? null;
  return {
    ctx:        ((get("ctx") ?? "ja") as CharacterContext),
    q:          get("q") ?? undefined,
    ja_joyo:    "ja_joyo"    in sp ? sp.ja_joyo    === "1" : true,
    ja_heisig:  get("ja_heisig")  === "1",
    zhs_heisig: get("zhs_heisig") === "1",
    zht_heisig: get("zht_heisig") === "1",
    jlpt:  get("jlpt")  ? get("jlpt")!.split(",").map(Number)  : undefined,
    grade: get("grade") ? get("grade")!.split(",")             : undefined,
    hsk2:  get("hsk2")  ? get("hsk2")!.split(",").map(Number)  : undefined,
    heisig_ja_min:  numOrUndef(get("heisig_ja_min")),
    heisig_ja_max:  numOrUndef(get("heisig_ja_max")),
    heisig_zhs_min: numOrUndef(get("heisig_zhs_min")),
    heisig_zhs_max: numOrUndef(get("heisig_zhs_max")),
    heisig_zht_min: numOrUndef(get("heisig_zht_min")),
    heisig_zht_max: numOrUndef(get("heisig_zht_max")),
    sort: (get("sort") as CharacterFilters["sort"]) ?? "id",
    dir:  (get("dir") as "asc" | "desc") ?? "asc",
    page: 1,
    per_page: 50,
  };
}

async function fetchAdjacentIds(charId: number, filters: CharacterFilters): Promise<{
  prevId: number | null; prevLiteral: string | null;
  nextId: number | null; nextLiteral: string | null;
}> {
  const conditions = buildWhereConditions(filters);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = buildOrderBy(filters.sort, filters.dir);

  try {
    const result = await db.execute(sql.raw(`
      WITH ranked AS (
        SELECT c.id, c.literal,
               ROW_NUMBER() OVER (ORDER BY ${orderBy}, c.id ASC) AS rn
        FROM characters c
        LEFT JOIN japanese_kanji jk ON jk.character_id = c.id
        LEFT JOIN simplified_hanzi sh ON sh.character_id = c.id
        LEFT JOIN traditional_hanzi th ON th.character_id = c.id
        ${where}
      ),
      cur AS (SELECT rn FROM ranked WHERE id = ${charId})
      SELECT
        (SELECT id      FROM ranked WHERE rn = (SELECT rn FROM cur) - 1) AS prev_id,
        (SELECT literal FROM ranked WHERE rn = (SELECT rn FROM cur) - 1) AS prev_literal,
        (SELECT id      FROM ranked WHERE rn = (SELECT rn FROM cur) + 1) AS next_id,
        (SELECT literal FROM ranked WHERE rn = (SELECT rn FROM cur) + 1) AS next_literal
    `));
    const row = result[0] as any;
    return {
      prevId:      row?.prev_id      != null ? Number(row.prev_id) : null,
      prevLiteral: row?.prev_literal ?? null,
      nextId:      row?.next_id      != null ? Number(row.next_id) : null,
      nextLiteral: row?.next_literal ?? null,
    };
  } catch {
    return { prevId: null, prevLiteral: null, nextId: null, nextLiteral: null };
  }
}

export default async function CharacterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const charId = parseInt(id);
  if (isNaN(charId)) notFound();

  const [data, adj] = await Promise.all([
    fetchCharacter(charId),
    fetchAdjacentIds(charId, parseFilters(sp)),
  ]);
  if (!data) notFound();

  const qs = Object.keys(sp).length ? `?${new URLSearchParams(sp).toString()}` : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/characters${qs}`}
          className="text-sm text-gray-500 hover:text-gray-900 shrink-0"
        >
          ← Characters
        </Link>
        <h1 className="text-4xl font-cjk-ja-sans font-medium text-gray-900" lang="ja">
          {data.literal}
        </h1>
        <span className="text-sm text-gray-400">
          U+{data.id.toString(16).toUpperCase().padStart(4, "0")}
        </span>
        <div className="ml-auto flex gap-2 shrink-0">
          {adj.prevId ? (
            <Link
              href={`/admin/characters/${adj.prevId}${qs}`}
              className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
            >
              ← <span className="font-cjk-ja-sans text-lg leading-none" lang="ja">{adj.prevLiteral}</span>
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-400 opacity-50">←</span>
          )}
          {adj.nextId ? (
            <Link
              href={`/admin/characters/${adj.nextId}${qs}`}
              className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
            >
              <span className="font-cjk-ja-sans text-lg leading-none" lang="ja">{adj.nextLiteral}</span> →
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-400 opacity-50">→</span>
          )}
        </div>
      </div>
      <CharacterDetail data={data} />
    </div>
  );
}
