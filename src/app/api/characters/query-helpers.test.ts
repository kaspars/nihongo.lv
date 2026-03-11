import { describe, it, expect } from "vitest";
import { numOrUndef, buildWhereConditions, buildOrderBy } from "./query-helpers";
import type { CharacterFilters } from "@/app/admin/characters/filters";

// ─── numOrUndef ───────────────────────────────────────────────────────────────

describe("numOrUndef", () => {
  it("returns undefined for null", () => {
    expect(numOrUndef(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(numOrUndef("")).toBeUndefined();
  });

  it("returns undefined for non-numeric string", () => {
    expect(numOrUndef("abc")).toBeUndefined();
  });

  it("returns the number for a valid numeric string", () => {
    expect(numOrUndef("5")).toBe(5);
    expect(numOrUndef("100")).toBe(100);
    expect(numOrUndef("3.14")).toBe(3.14);
  });

  it("returns 0 for '0'", () => {
    expect(numOrUndef("0")).toBe(0); // "0" is a non-empty string — truthy, valid number
  });
});

// ─── buildWhereConditions ────────────────────────────────────────────────────

describe("buildWhereConditions", () => {
  const base: CharacterFilters = { sort: "id", dir: "asc", page: 1, per_page: 50 };

  it("returns empty array when no filters set", () => {
    expect(buildWhereConditions(base)).toEqual([]);
  });

  it("ctx=all produces no condition", () => {
    expect(buildWhereConditions({ ...base, ctx: "all" })).toEqual([]);
  });

  it("ctx=ja scopes to japanese_kanji rows", () => {
    const conds = buildWhereConditions({ ...base, ctx: "ja" });
    expect(conds).toContain("jk.character_id IS NOT NULL");
  });

  it("ctx=zhs scopes to simplified_hanzi rows", () => {
    const conds = buildWhereConditions({ ...base, ctx: "zhs" });
    expect(conds).toContain("sh.character_id IS NOT NULL");
  });

  it("ctx=zht scopes to traditional_hanzi rows", () => {
    const conds = buildWhereConditions({ ...base, ctx: "zht" });
    expect(conds).toContain("th.character_id IS NOT NULL");
  });

  it("ja_joyo filter adds category condition", () => {
    const conds = buildWhereConditions({ ...base, ja_joyo: true });
    expect(conds).toContain("jk.category IS NOT NULL");
  });

  it("ja_heisig filter adds heisig condition", () => {
    const conds = buildWhereConditions({ ...base, ja_heisig: true });
    expect(conds).toContain("jk.sort_heisig IS NOT NULL");
  });

  it("zhs_heisig filter adds simplified heisig condition", () => {
    const conds = buildWhereConditions({ ...base, zhs_heisig: true });
    expect(conds).toContain("sh.sort_heisig IS NOT NULL");
  });

  it("zht_heisig filter adds traditional heisig condition", () => {
    const conds = buildWhereConditions({ ...base, zht_heisig: true });
    expect(conds).toContain("th.sort_heisig IS NOT NULL");
  });

  it("jlpt filter produces IN clause", () => {
    const conds = buildWhereConditions({ ...base, jlpt: [1, 2] });
    expect(conds).toContain("jk.jlpt IN (1,2)");
  });

  it("grade filter produces quoted IN clause", () => {
    const conds = buildWhereConditions({ ...base, grade: ["1", "S"] });
    expect(conds).toContain("jk.grade IN ('1','S')");
  });

  it("hsk2 filter produces IN clause", () => {
    const conds = buildWhereConditions({ ...base, hsk2: [3, 4] });
    expect(conds).toContain("sh.hsk2_level IN (3,4)");
  });

  it("heisig range filters produce comparison conditions for all sets", () => {
    const conds = buildWhereConditions({
      ...base,
      heisig_ja_min: 1,   heisig_ja_max: 500,
      heisig_zhs_min: 10, heisig_zhs_max: 200,
      heisig_zht_min: 5,  heisig_zht_max: 100,
    });
    expect(conds).toContain("jk.sort_heisig >= 1");
    expect(conds).toContain("jk.sort_heisig <= 500");
    expect(conds).toContain("sh.sort_heisig >= 10");
    expect(conds).toContain("sh.sort_heisig <= 200");
    expect(conds).toContain("th.sort_heisig >= 5");
    expect(conds).toContain("th.sort_heisig <= 100");
  });

  it("multiple filters combine correctly", () => {
    const conds = buildWhereConditions({
      ...base,
      ctx: "ja",
      ja_joyo: true,
      jlpt: [1],
    });
    expect(conds).toHaveLength(3);
    expect(conds).toContain("jk.character_id IS NOT NULL");
    expect(conds).toContain("jk.category IS NOT NULL");
    expect(conds).toContain("jk.jlpt IN (1)");
  });

  it("empty jlpt array produces no condition", () => {
    const conds = buildWhereConditions({ ...base, jlpt: [] });
    expect(conds.some(c => c.includes("jlpt IN"))).toBe(false);
  });
});

// ─── buildOrderBy ─────────────────────────────────────────────────────────────

describe("buildOrderBy", () => {
  it("defaults to c.id ASC NULLS LAST", () => {
    expect(buildOrderBy(undefined, undefined)).toBe("c.id ASC NULLS LAST");
    expect(buildOrderBy("id", "asc")).toBe("c.id ASC NULLS LAST");
    expect(buildOrderBy("radical", "asc")).toBe("c.radical ASC NULLS LAST");
  });

  it("maps sort fields to correct SQL columns", () => {
    expect(buildOrderBy("stroke_count", "asc")).toBe("c.stroke_count ASC NULLS LAST");
    expect(buildOrderBy("heisig_ja",    "asc")).toBe("jk.sort_heisig ASC NULLS LAST");
    expect(buildOrderBy("heisig_zhs",   "asc")).toBe("sh.sort_heisig ASC NULLS LAST");
    expect(buildOrderBy("heisig_zht",   "asc")).toBe("th.sort_heisig ASC NULLS LAST");
    expect(buildOrderBy("jlpt",         "asc")).toBe("jk.jlpt ASC NULLS LAST");
    expect(buildOrderBy("grade",        "asc")).toBe("jk.grade ASC NULLS LAST");
    expect(buildOrderBy("hsk2",         "asc")).toBe("sh.hsk2_level ASC NULLS LAST");
  });

  it("respects desc direction", () => {
    expect(buildOrderBy("jlpt", "desc")).toBe("jk.jlpt DESC NULLS LAST");
    expect(buildOrderBy("id",   "desc")).toBe("c.id DESC NULLS LAST");
  });

  it("always appends NULLS LAST", () => {
    expect(buildOrderBy("jlpt", "asc")).toMatch(/NULLS LAST$/);
    expect(buildOrderBy("jlpt", "desc")).toMatch(/NULLS LAST$/);
  });
});
