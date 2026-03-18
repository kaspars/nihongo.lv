import { createColumnHelper, VisibilityState } from "@tanstack/react-table";
import type { CharacterRow, SortField, CharacterContext } from "./filters";

const col = createColumnHelper<CharacterRow>();

function VariantChars({ chars, lang, fontClass }: { chars: string; lang: string; fontClass: string }) {
  return <span lang={lang} className={`${fontClass} text-2xl`}>{chars}</span>;
}

/** Maps TanStack column id (camelCase) → API sort param (snake_case). */
export const COL_SORT_FIELD: Partial<Record<string, SortField>> = {
  strokeCount: "stroke_count",
  radical:     "radical",
  heisigJa:    "heisig_ja",
  heisigZhs:   "heisig_zhs",
  heisigZht:   "heisig_zht",
  jlpt:        "jlpt",
  grade:       "grade",
  hsk2Level:   "hsk2",
};

export const CONTEXT_LABELS: Record<CharacterContext, string> = {
  all: "All",
  ja:  "Japanese",
  zhs: "Chinese Simplified",
  zht: "Chinese Traditional",
};

/** Default-visible column ids per context. */
export const DEFAULT_VISIBLE: Record<CharacterContext, Set<string>> = {
  all: new Set(["literal", "strokeCount", "radical"]),
  ja:  new Set(["literal", "kyujitaiVariants", "shinjitaiVariant", "strokeCount", "keywordJa", "heisigJa", "grade", "jlpt", "onyomi", "kunyomi"]),
  zhs: new Set(["literal", "traditionalVariants", "strokeCount", "keywordZhs", "heisigZhs", "hsk2Level", "pinyin"]),
  zht: new Set(["literal", "simplifiedVariants", "strokeCount", "keywordZht", "heisigZht", "pinyin"]),
};

/** Build context-specific column definitions. Order: general → specific → readings → misc. */
export function buildTableColumns(ctx: CharacterContext) {
  const jlptCol = col.accessor("jlpt", {
    header: "JLPT", size: 56,
    cell: i => i.getValue() ? `N${i.getValue()}` : "",
  });

  const traditionalVariantsCol = col.accessor("traditionalVariants", {
    header: "Traditional", size: 80,
    cell: i => {
      const v = i.getValue();
      return v ? <VariantChars chars={v} lang="zh-Hant" fontClass="font-cjk-zht-sans" /> : null;
    },
  });

  const simplifiedVariantsCol = col.accessor("simplifiedVariants", {
    header: "Simplified", size: 80,
    cell: i => {
      const v = i.getValue();
      return v ? <VariantChars chars={v} lang="zh-Hans" fontClass="font-cjk-zhs-sans" /> : null;
    },
  });

  const kyujitaiVariantsCol = col.accessor("kyujitaiVariants", {
    header: "Kyūjitai", size: 80,
    cell: i => {
      const v = i.getValue();
      return v ? <VariantChars chars={v} lang="ja" fontClass="font-cjk-ja-sans" /> : null;
    },
  });

  const shinjitaiVariantCol = col.accessor("shinjitaiVariant", {
    header: "Shinjitai", size: 80,
    cell: i => {
      const v = i.getValue();
      return v ? <VariantChars chars={v} lang="ja" fontClass="font-cjk-ja-sans" /> : null;
    },
  });

  switch (ctx) {
    case "ja": return [
      col.accessor("literal",     { header: "Char",     size: 56  }),
      kyujitaiVariantsCol,
      shinjitaiVariantCol,
      col.accessor("strokeCount", { header: "Strokes",  size: 64  }),
      col.accessor("radical",     { header: "Radical",  size: 64  }),
      col.accessor("keywordJa",   { header: "Keyword",  size: 160 }),
      col.accessor("heisigJa",    { header: "Heisig",   size: 80  }),
      col.accessor("grade",       { header: "Grade",    size: 56  }),
      jlptCol,
      col.accessor("onyomi",      { header: "On'yomi",  size: 120 }),
      col.accessor("kunyomi",     { header: "Kun'yomi", size: 120 }),
      col.accessor("category",    { header: "Category", size: 80  }),
    ];
    case "zhs": return [
      col.accessor("literal",     { header: "Char",    size: 56  }),
      traditionalVariantsCol,
      col.accessor("strokeCount", { header: "Strokes", size: 64  }),
      col.accessor("radical",     { header: "Radical", size: 64  }),
      col.accessor("keywordZhs",  { header: "Keyword", size: 160 }),
      col.accessor("heisigZhs",   { header: "Heisig",  size: 80  }),
      col.accessor("hsk2Level",   { header: "HSK2",    size: 56  }),
      col.accessor("pinyin",      { header: "Pinyin",  size: 100 }),
    ];
    case "zht": return [
      col.accessor("literal",     { header: "Char",    size: 56  }),
      simplifiedVariantsCol,
      col.accessor("strokeCount", { header: "Strokes", size: 64  }),
      col.accessor("radical",     { header: "Radical", size: 64  }),
      col.accessor("keywordZht",  { header: "Keyword", size: 160 }),
      col.accessor("heisigZht",   { header: "Heisig",  size: 80  }),
      col.accessor("pinyin",      { header: "Pinyin",  size: 100 }),
    ];
    default: return [ // "all"
      col.accessor("literal",     { header: "Char",        size: 56  }),
      col.accessor("strokeCount", { header: "Strokes",     size: 64  }),
      col.accessor("radical",     { header: "Radical",     size: 64  }),
      col.accessor("heisigJa",    { header: "Heisig JA",   size: 80  }),
      col.accessor("heisigZhs",   { header: "Heisig ZHS",  size: 80  }),
      col.accessor("heisigZht",   { header: "Heisig ZHT",  size: 80  }),
      jlptCol,
      col.accessor("grade",       { header: "Grade",       size: 56  }),
      col.accessor("hsk2Level",   { header: "HSK2",        size: 56  }),
      col.accessor("keywordJa",   { header: "Keyword JA",  size: 160 }),
      col.accessor("keywordZhs",  { header: "Keyword ZHS", size: 160 }),
      col.accessor("keywordZht",  { header: "Keyword ZHT", size: 160 }),
      col.accessor("onyomi",      { header: "On'yomi",     size: 120 }),
      col.accessor("kunyomi",     { header: "Kun'yomi",    size: 120 }),
      col.accessor("pinyin",      { header: "Pinyin",      size: 100 }),
      col.accessor("category",    { header: "Category",    size: 80  }),
    ];
  }
}

/** Derive TanStack VisibilityState from the context's default-visible set. */
export function defaultVisibility(ctx: CharacterContext): VisibilityState {
  const visible = DEFAULT_VISIBLE[ctx];
  return Object.fromEntries(
    buildTableColumns(ctx).map(c => [
      (c as { accessorKey: string }).accessorKey,
      visible.has((c as { accessorKey: string }).accessorKey),
    ])
  );
}

/** Toggle a comma-separated multi-value string (add if absent, remove if present). */
export function toggleMulti(current: string, value: string): string {
  const arr = current ? current.split(",") : [];
  return arr.includes(value)
    ? arr.filter(v => v !== value).join(",")
    : [...arr, value].join(",");
}

/** Return a sort direction indicator for a column header. */
export function sortIndicator(currentSort: string, currentDir: string, field: string): string {
  return currentSort === field ? (currentDir === "asc" ? " ↑" : " ↓") : "";
}
