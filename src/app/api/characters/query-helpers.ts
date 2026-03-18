import type { CharacterFilters, SortField } from "@/app/admin/characters/filters";

/** Parse a query param string as a number, returning undefined for null/NaN. */
export function numOrUndef(s: string | null): number | undefined {
  const n = Number(s);
  return s && !isNaN(n) ? n : undefined;
}

/** Escape a string for safe embedding in a SQL single-quoted literal. */
export function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

/** Strip diacritical marks (e.g., ō→o, ǐ→i) for tone-insensitive matching. */
export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const SORT_COL: Record<string, string> = {
  id:           "c.id",
  stroke_count: "c.stroke_count",
  radical:      "c.radical",
  heisig_ja:    "jk.sort_heisig",
  heisig_zhs:   "sh.sort_heisig",
  heisig_zht:   "th.sort_heisig",
  jlpt:         "jk.jlpt",
  grade:        "jk.grade",
  hsk2:         "sh.hsk2_level",
};

/** Build SQL WHERE conditions from parsed filters. Returns array of condition strings. */
export function buildWhereConditions(filters: CharacterFilters): string[] {
  const conditions: string[] = [];

  if (filters.q) {
    const safe = escapeSqlString(filters.q.trim());
    const safePlain = escapeSqlString(stripDiacritics(filters.q.trim()));
    conditions.push(`(
      c.literal = '${safe}'
      OR EXISTS (SELECT 1 FROM character_meanings cm WHERE cm.character_id = c.id AND cm.keyword ILIKE '%${safe}%')
      OR EXISTS (SELECT 1 FROM character_readings cr WHERE cr.character_id = c.id AND unaccent(cr.value) ILIKE '%${safePlain}%')
    )`);
  }

  if (filters.ctx === "ja")  conditions.push(`jk.character_id IS NOT NULL`);
  if (filters.ctx === "zhs") conditions.push(`sh.character_id IS NOT NULL`);
  if (filters.ctx === "zht") conditions.push(`th.character_id IS NOT NULL`);

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

  return conditions;
}

/** Build SQL ORDER BY clause from sort field and direction. */
export function buildOrderBy(sort: SortField | undefined, dir: "asc" | "desc" | undefined): string {
  const col = SORT_COL[sort ?? "id"] ?? "c.id";
  const direction = dir === "desc" ? "DESC" : "ASC";
  return `${col} ${direction} NULLS LAST`;
}
