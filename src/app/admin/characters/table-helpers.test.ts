import { describe, it, expect } from "vitest";
import {
  COL_SORT_FIELD,
  DEFAULT_VISIBLE,
  buildTableColumns,
  defaultVisibility,
  toggleMulti,
  sortIndicator,
} from "./table-helpers";
import type { CharacterContext } from "./filters";

// Helper to extract accessor keys from built columns
function colIds(ctx: CharacterContext): string[] {
  return buildTableColumns(ctx).map(c => (c as { accessorKey: string }).accessorKey);
}

function colHeaders(ctx: CharacterContext): string[] {
  return buildTableColumns(ctx).map(c => c.header as string);
}

// ─── buildTableColumns ────────────────────────────────────────────────────────

describe("buildTableColumns", () => {
  it("always includes literal, strokeCount, radical", () => {
    for (const ctx of ["all", "ja", "zhs", "zht"] as CharacterContext[]) {
      const ids = colIds(ctx);
      expect(ids).toContain("literal");
      expect(ids).toContain("strokeCount");
      expect(ids).toContain("radical");
    }
  });

  it("ja — contains Japanese-specific columns", () => {
    const ids = colIds("ja");
    expect(ids).toContain("keywordJa");
    expect(ids).toContain("keywordJaLv");
    expect(ids).toContain("heisigJa");
    expect(ids).toContain("jlpt");
    expect(ids).toContain("grade");
    expect(ids).toContain("onyomi");
    expect(ids).toContain("kunyomi");
    expect(ids).toContain("category");
    expect(ids).toContain("kyujitaiVariants");
    expect(ids).toContain("shinjitaiVariant");
  });

  it("ja — kyujitaiVariants and shinjitaiVariant come right after literal", () => {
    const ids = colIds("ja");
    expect(ids.indexOf("kyujitaiVariants")).toBe(ids.indexOf("literal") + 1);
    expect(ids.indexOf("shinjitaiVariant")).toBe(ids.indexOf("literal") + 2);
  });

  it("ja — does not contain Chinese or Korean columns", () => {
    const ids = colIds("ja");
    expect(ids).not.toContain("heisigZhs");
    expect(ids).not.toContain("heisigZht");
    expect(ids).not.toContain("keywordZhs");
    expect(ids).not.toContain("keywordZht");
    expect(ids).not.toContain("hsk2Level");
    expect(ids).not.toContain("pinyin");
  });

  it("zhs — contains Simplified Chinese columns and traditionalVariants", () => {
    const ids = colIds("zhs");
    expect(ids).toContain("keywordZhs");
    expect(ids).toContain("heisigZhs");
    expect(ids).toContain("hsk2Level");
    expect(ids).toContain("pinyin");
    expect(ids).toContain("traditionalVariants");
  });

  it("zht — contains Traditional Chinese columns, simplifiedVariants and pinyin", () => {
    const ids = colIds("zht");
    expect(ids).toContain("keywordZht");
    expect(ids).toContain("heisigZht");
    expect(ids).toContain("simplifiedVariants");
    expect(ids).toContain("pinyin");
  });

  it("zhs — traditionalVariants comes right after literal", () => {
    const ids = colIds("zhs");
    expect(ids.indexOf("traditionalVariants")).toBe(ids.indexOf("literal") + 1);
  });

  it("zht — simplifiedVariants comes right after literal", () => {
    const ids = colIds("zht");
    expect(ids.indexOf("simplifiedVariants")).toBe(ids.indexOf("literal") + 1);
  });

  it("all — contains cross-context columns with qualified names", () => {
    const ids = colIds("all");
    expect(ids).toContain("heisigJa");
    expect(ids).toContain("heisigZhs");
    expect(ids).toContain("heisigZht");
    expect(ids).toContain("keywordJa");
    expect(ids).toContain("keywordZhs");
    expect(ids).toContain("keywordZht");
  });

  it("ja — uses language-qualified keyword headers", () => {
    const headers = colHeaders("ja");
    expect(headers).toContain("Keyword EN");
    expect(headers).toContain("Keyword LV");
    expect(headers).toContain("Heisig");
    expect(headers).not.toContain("Keyword JA");
    expect(headers).not.toContain("Heisig JA");
  });

  it("all — uses qualified header names", () => {
    const headers = colHeaders("all");
    expect(headers).toContain("Heisig JA");
    expect(headers).toContain("Heisig ZHS");
    expect(headers).toContain("Keyword JA");
  });

  it("ja — JLPT cell renders N-prefixed string", () => {
    const cols = buildTableColumns("ja");
    const jlptCol = cols.find(c => (c as { accessorKey: string }).accessorKey === "jlpt")!;
    const cell = jlptCol.cell as (info: { getValue: () => unknown }) => string;
    expect(cell({ getValue: () => 3 })).toBe("N3");
    expect(cell({ getValue: () => null })).toBe("");
    expect(cell({ getValue: () => undefined })).toBe("");
  });

  describe("variant column cells", () => {
    type CellFn = (info: { getValue: () => unknown }) => unknown;

    function variantCell(ctx: CharacterContext, key: string): CellFn {
      const col = buildTableColumns(ctx).find(
        c => (c as { accessorKey: string }).accessorKey === key
      )!;
      return col.cell as CellFn;
    }

    it("kyujitaiVariants — returns null when value is absent", () => {
      const cell = variantCell("ja", "kyujitaiVariants");
      expect(cell({ getValue: () => null })).toBeNull();
      expect(cell({ getValue: () => "" })).toBeNull();
    });

    it("kyujitaiVariants — returns element when value is present", () => {
      const cell = variantCell("ja", "kyujitaiVariants");
      expect(cell({ getValue: () => "亞" })).not.toBeNull();
    });

    it("shinjitaiVariant — returns null when value is absent", () => {
      const cell = variantCell("ja", "shinjitaiVariant");
      expect(cell({ getValue: () => null })).toBeNull();
    });

    it("shinjitaiVariant — returns element when value is present", () => {
      const cell = variantCell("ja", "shinjitaiVariant");
      expect(cell({ getValue: () => "亜" })).not.toBeNull();
    });

    it("traditionalVariants — returns null when value is absent", () => {
      const cell = variantCell("zhs", "traditionalVariants");
      expect(cell({ getValue: () => null })).toBeNull();
    });

    it("traditionalVariants — returns element when value is present", () => {
      const cell = variantCell("zhs", "traditionalVariants");
      expect(cell({ getValue: () => "亞" })).not.toBeNull();
    });

    it("simplifiedVariants — returns null when value is absent", () => {
      const cell = variantCell("zht", "simplifiedVariants");
      expect(cell({ getValue: () => null })).toBeNull();
    });

    it("simplifiedVariants — returns element when value is present", () => {
      const cell = variantCell("zht", "simplifiedVariants");
      expect(cell({ getValue: () => "亚" })).not.toBeNull();
    });
  });

  it("columns follow general→specific order: literal before language-specific", () => {
    for (const ctx of ["ja", "zhs", "zht"] as CharacterContext[]) {
      const ids = colIds(ctx);
      expect(ids.indexOf("literal")).toBeLessThan(ids.indexOf("strokeCount"));
      expect(ids.indexOf("strokeCount")).toBeLessThan(ids.indexOf("radical"));
    }
  });
});

// ─── defaultVisibility ────────────────────────────────────────────────────────

describe("defaultVisibility", () => {
  it("literal and strokeCount are visible in all contexts", () => {
    for (const ctx of ["all", "ja", "zhs", "zht"] as CharacterContext[]) {
      const vis = defaultVisibility(ctx);
      expect(vis["literal"]).toBe(true);
      expect(vis["strokeCount"]).toBe(true);
    }
  });

  it("radical is visible in 'all' context, hidden in language-specific contexts", () => {
    expect(defaultVisibility("all")["radical"]).toBe(true);
    expect(defaultVisibility("ja")["radical"]).toBe(false);
    expect(defaultVisibility("zhs")["radical"]).toBe(false);
    expect(defaultVisibility("zht")["radical"]).toBe(false);
  });

  it("ja — Japanese columns visible, Chinese hidden", () => {
    const vis = defaultVisibility("ja");
    expect(vis["keywordJa"]).toBe(true);
    expect(vis["keywordJaLv"]).toBe(true);
    expect(vis["heisigJa"]).toBe(true);
    expect(vis["jlpt"]).toBe(true);
    expect(vis["grade"]).toBe(true);
    expect(vis["onyomi"]).toBe(true);
    expect(vis["kunyomi"]).toBe(true);
    expect(vis["kyujitaiVariants"]).toBe(true);
    expect(vis["shinjitaiVariant"]).toBe(true);
    expect(vis["category"]).toBe(false);
    expect(vis["radical"]).toBe(false);
  });

  it("zhs — Simplified columns visible, including traditionalVariants", () => {
    const vis = defaultVisibility("zhs");
    expect(vis["keywordZhs"]).toBe(true);
    expect(vis["heisigZhs"]).toBe(true);
    expect(vis["hsk2Level"]).toBe(true);
    expect(vis["pinyin"]).toBe(true);
    expect(vis["traditionalVariants"]).toBe(true);
  });

  it("zht — Traditional columns visible, including simplifiedVariants and pinyin", () => {
    const vis = defaultVisibility("zht");
    expect(vis["keywordZht"]).toBe(true);
    expect(vis["heisigZht"]).toBe(true);
    expect(vis["simplifiedVariants"]).toBe(true);
    expect(vis["pinyin"]).toBe(true);
  });

  it("all columns in returned object match the context's built columns", () => {
    for (const ctx of ["all", "ja", "zhs", "zht"] as CharacterContext[]) {
      const vis = defaultVisibility(ctx);
      const ids = colIds(ctx);
      expect(Object.keys(vis).sort()).toEqual(ids.sort());
    }
  });

  it("default visible sets match DEFAULT_VISIBLE constants", () => {
    for (const ctx of ["all", "ja", "zhs", "zht"] as CharacterContext[]) {
      const vis = defaultVisibility(ctx);
      for (const id of Object.keys(vis)) {
        expect(vis[id]).toBe(DEFAULT_VISIBLE[ctx].has(id));
      }
    }
  });
});

// ─── COL_SORT_FIELD ───────────────────────────────────────────────────────────

describe("COL_SORT_FIELD", () => {
  it("maps camelCase column ids to snake_case sort params", () => {
    expect(COL_SORT_FIELD["strokeCount"]).toBe("stroke_count");
    expect(COL_SORT_FIELD["heisigJa"]).toBe("heisig_ja");
    expect(COL_SORT_FIELD["heisigZhs"]).toBe("heisig_zhs");
    expect(COL_SORT_FIELD["heisigZht"]).toBe("heisig_zht");
    expect(COL_SORT_FIELD["hsk2Level"]).toBe("hsk2");
  });

  it("literal and keyword columns are not sortable", () => {
    expect(COL_SORT_FIELD["literal"]).toBeUndefined();
    expect(COL_SORT_FIELD["keywordJa"]).toBeUndefined();
    expect(COL_SORT_FIELD["onyomi"]).toBeUndefined();
  });
});

// ─── toggleMulti ─────────────────────────────────────────────────────────────

describe("toggleMulti", () => {
  it("adds a value to an empty string", () => {
    expect(toggleMulti("", "3")).toBe("3");
  });

  it("adds a value to existing values", () => {
    expect(toggleMulti("1,2", "3")).toBe("1,2,3");
  });

  it("removes an existing value", () => {
    expect(toggleMulti("1,2,3", "2")).toBe("1,3");
  });

  it("removes the only value, returning empty string", () => {
    expect(toggleMulti("5", "5")).toBe("");
  });

  it("does not duplicate an already-present value", () => {
    expect(toggleMulti("1,2", "2")).toBe("1");
  });

  it("handles single-char string values", () => {
    expect(toggleMulti("N1,N3", "N2")).toBe("N1,N3,N2");
    expect(toggleMulti("N1,N2,N3", "N2")).toBe("N1,N3");
  });
});

// ─── sortIndicator ────────────────────────────────────────────────────────────

describe("sortIndicator", () => {
  it("returns ↑ for the active ascending sort field", () => {
    expect(sortIndicator("jlpt", "asc", "jlpt")).toBe(" ↑");
  });

  it("returns ↓ for the active descending sort field", () => {
    expect(sortIndicator("jlpt", "desc", "jlpt")).toBe(" ↓");
  });

  it("returns empty string for a non-active field", () => {
    expect(sortIndicator("jlpt", "asc", "grade")).toBe("");
    expect(sortIndicator("jlpt", "desc", "grade")).toBe("");
  });

  it("returns empty string when sort field is empty", () => {
    expect(sortIndicator("", "asc", "grade")).toBe("");
  });
});
