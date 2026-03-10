import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { CharacterFilters, CharacterResponse } from "@/app/admin/characters/filters";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const filters: CharacterFilters = {
    ja_joyo:    p.get("ja_joyo") === "1",
    ja_heisig:  p.get("ja_heisig") === "1",
    zhs_heisig: p.get("zhs_heisig") === "1",
    zht_heisig: p.get("zht_heisig") === "1",
    jlpt:  p.get("jlpt")  ? p.get("jlpt")!.split(",").map(Number)  : undefined,
    grade: p.get("grade") ? p.get("grade")!.split(",")              : undefined,
    hsk2:  p.get("hsk2")  ? p.get("hsk2")!.split(",").map(Number)  : undefined,
    heisig_ja_min:  numOrUndef(p.get("heisig_ja_min")),
    heisig_ja_max:  numOrUndef(p.get("heisig_ja_max")),
    heisig_zhs_min: numOrUndef(p.get("heisig_zhs_min")),
    heisig_zhs_max: numOrUndef(p.get("heisig_zhs_max")),
    heisig_zht_min: numOrUndef(p.get("heisig_zht_min")),
    heisig_zht_max: numOrUndef(p.get("heisig_zht_max")),
    sort: (p.get("sort") as CharacterFilters["sort"]) ?? "id",
    dir:  (p.get("dir")  as CharacterFilters["dir"])  ?? "asc",
    page:     Math.max(1, Number(p.get("page") ?? 1)),
    per_page: Math.min(200, Math.max(10, Number(p.get("per_page") ?? 50))),
  };

  const offset = ((filters.page ?? 1) - 1) * (filters.per_page ?? 50);
  const limit  = filters.per_page ?? 50;

  const conditions: string[] = [];

  if (filters.ja_joyo)    conditions.push(`jk.category IS NOT NULL`);
  if (filters.ja_heisig)  conditions.push(`jk.sort_heisig IS NOT NULL`);
  if (filters.zhs_heisig) conditions.push(`sh.sort_heisig IS NOT NULL`);
  if (filters.zht_heisig) conditions.push(`th.sort_heisig IS NOT NULL`);

  if (filters.jlpt?.length)  conditions.push(`jk.jlpt IN (${filters.jlpt.join(",")})`);
  if (filters.grade?.length) conditions.push(`jk.grade IN (${filters.grade.map(g => `'${g}'`).join(",")})`);
  if (filters.hsk2?.length)  conditions.push(`sh.hsk2_level IN (${filters.hsk2.join(",")})`);

  if (filters.heisig_ja_min)  conditions.push(`jk.sort_heisig >= ${filters.heisig_ja_min}`);
  if (filters.heisig_ja_max)  conditions.push(`jk.sort_heisig <= ${filters.heisig_ja_max}`);
  if (filters.heisig_zhs_min) conditions.push(`sh.sort_heisig >= ${filters.heisig_zhs_min}`);
  if (filters.heisig_zhs_max) conditions.push(`sh.sort_heisig <= ${filters.heisig_zhs_max}`);
  if (filters.heisig_zht_min) conditions.push(`th.sort_heisig >= ${filters.heisig_zht_min}`);
  if (filters.heisig_zht_max) conditions.push(`th.sort_heisig <= ${filters.heisig_zht_max}`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortCol: Record<string, string> = {
    id:          "c.id",
    stroke_count:"c.stroke_count",
    radical:     "c.radical",
    heisig_ja:   "jk.sort_heisig",
    heisig_zhs:  "sh.sort_heisig",
    heisig_zht:  "th.sort_heisig",
    jlpt:        "jk.jlpt",
    grade:       "jk.grade",
    hsk2:        "sh.hsk2_level",
  };
  const orderBy = `${sortCol[filters.sort ?? "id"] ?? "c.id"} ${filters.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`;

  const query = `
    SELECT
      c.id,
      c.literal,
      c.stroke_count        AS "strokeCount",
      c.radical,
      jk.sort_heisig        AS "heisigJa",
      jk.jlpt,
      jk.grade,
      jk.category,
      sh.hsk2_level         AS "hsk2Level",
      sh.sort_heisig        AS "heisigZhs",
      th.sort_heisig        AS "heisigZht",
      cm_ja.keyword         AS "keywordJa",
      cm_zhs.keyword        AS "keywordZhs",
      cm_zht.keyword        AS "keywordZht",
      (SELECT value FROM character_readings WHERE character_id = c.id AND language = 'ja' AND type = 'onyomi'  ORDER BY position LIMIT 1) AS "onyomi",
      (SELECT value FROM character_readings WHERE character_id = c.id AND language = 'ja' AND type = 'kunyomi' ORDER BY position LIMIT 1) AS "kunyomi",
      (SELECT value FROM character_readings WHERE character_id = c.id AND language = 'cmn' AND type = 'pinyin'  ORDER BY position LIMIT 1) AS "pinyin"
    FROM characters c
    LEFT JOIN japanese_kanji jk    ON jk.character_id = c.id
    LEFT JOIN simplified_hanzi sh  ON sh.character_id = c.id
    LEFT JOIN traditional_hanzi th ON th.character_id = c.id
    LEFT JOIN character_meanings cm_ja  ON cm_ja.character_id  = c.id AND cm_ja.source_language  = 'ja'  AND cm_ja.meaning_language  = 'en'
    LEFT JOIN character_meanings cm_zhs ON cm_zhs.character_id = c.id AND cm_zhs.source_language = 'zhs' AND cm_zhs.meaning_language = 'en'
    LEFT JOIN character_meanings cm_zht ON cm_zht.character_id = c.id AND cm_zht.source_language = 'zht' AND cm_zht.meaning_language = 'en'
    ${where}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countQuery = `
    SELECT count(*) AS total
    FROM characters c
    LEFT JOIN japanese_kanji jk    ON jk.character_id = c.id
    LEFT JOIN simplified_hanzi sh  ON sh.character_id = c.id
    LEFT JOIN traditional_hanzi th ON th.character_id = c.id
    ${where}
  `;

  const [rows, countResult] = await Promise.all([
    db.execute(sql.raw(query)),
    db.execute(sql.raw(countQuery)),
  ]);

  const response: CharacterResponse = {
    rows: rows as any,
    total: Number((countResult[0] as any).total),
    page: filters.page ?? 1,
    perPage: limit,
  };

  return NextResponse.json(response);
}

function numOrUndef(s: string | null): number | undefined {
  const n = Number(s);
  return s && !isNaN(n) ? n : undefined;
}
