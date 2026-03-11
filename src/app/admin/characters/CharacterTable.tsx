"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  VisibilityState,
} from "@tanstack/react-table";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import type { CharacterRow, SortField, CharacterContext } from "./filters";

const col = createColumnHelper<CharacterRow>();

// Sort field lookup by column id (for columns that support server-side sorting)
const COL_SORT_FIELD: Partial<Record<string, SortField>> = {
  strokeCount: "stroke_count",
  radical:     "radical",
  heisigJa:    "heisig_ja",
  heisigZhs:   "heisig_zhs",
  heisigZht:   "heisig_zht",
  jlpt:        "jlpt",
  grade:       "grade",
  hsk2Level:   "hsk2",
};

// Build context-specific columns in display order: general → specific → readings → misc
function buildTableColumns(ctx: CharacterContext) {
  const jlptCol = col.accessor("jlpt", {
    header: "JLPT", size: 56,
    cell: i => i.getValue() ? `N${i.getValue()}` : "",
  });

  switch (ctx) {
    case "ja": return [
      col.accessor("literal",     { header: "Char",     size: 56  }),
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
      col.accessor("strokeCount", { header: "Strokes", size: 64  }),
      col.accessor("radical",     { header: "Radical", size: 64  }),
      col.accessor("keywordZhs",  { header: "Keyword", size: 160 }),
      col.accessor("heisigZhs",   { header: "Heisig",  size: 80  }),
      col.accessor("hsk2Level",   { header: "HSK2",    size: 56  }),
      col.accessor("pinyin",      { header: "Pinyin",  size: 100 }),
    ];
    case "zht": return [
      col.accessor("literal",     { header: "Char",    size: 56  }),
      col.accessor("strokeCount", { header: "Strokes", size: 64  }),
      col.accessor("radical",     { header: "Radical", size: 64  }),
      col.accessor("keywordZht",  { header: "Keyword", size: 160 }),
      col.accessor("heisigZht",   { header: "Heisig",  size: 80  }),
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

// Which columns are visible by default per context (by accessor key)
const DEFAULT_VISIBLE: Record<CharacterContext, Set<string>> = {
  all: new Set(["literal", "strokeCount", "radical"]),
  ja:  new Set(["literal", "strokeCount", "keywordJa", "heisigJa", "grade", "jlpt", "onyomi", "kunyomi"]),
  zhs: new Set(["literal", "strokeCount", "keywordZhs", "heisigZhs", "hsk2Level", "pinyin"]),
  zht: new Set(["literal", "strokeCount", "keywordZht", "heisigZht"]),
};

function defaultVisibility(ctx: CharacterContext): VisibilityState {
  const visible = DEFAULT_VISIBLE[ctx];
  return Object.fromEntries(
    buildTableColumns(ctx).map(c => [c.accessorKey as string, visible.has(c.accessorKey as string)])
  );
}

// Font class and lang attribute per context — drives correct glyph rendering
// for Han-unified code points that differ by language.
const CJK_FONT_CLASS: Record<CharacterContext, string> = {
  all: "font-cjk-ja-sans",   // default to Japanese glyphs for mixed view
  ja:  "font-cjk-ja-sans",
  zhs: "font-cjk-zhs-sans",
  zht: "font-cjk-zht-sans",
};
const CJK_LANG: Record<CharacterContext, string | undefined> = {
  all: undefined,
  ja:  "ja",
  zhs: "zh-Hans",
  zht: "zh-Hant",
};

const CONTEXT_LABELS: Record<CharacterContext, string> = {
  all: "All",
  ja:  "Japanese",
  zhs: "Chinese Simplified",
  zht: "Chinese Traditional",
};

const JLPT_LEVELS  = [1, 2, 3, 4, 5];
const GRADE_LEVELS = ["1", "2", "3", "4", "5", "6", "S"];
const HSK_LEVELS   = [1, 2, 3, 4, 5, 6];

export default function CharacterTable() {
  // --- URL state ---
  const [ctxParam,  setCtxParam]  = useQueryState("ctx",        parseAsString.withDefault("all"));
  const [jaJoyo,    setJaJoyo]    = useQueryState("ja_joyo",    parseAsInteger.withDefault(0));
  const [jaHeisig,  setJaHeisig]  = useQueryState("ja_heisig",  parseAsInteger.withDefault(0));
  const [zhsHeisig, setZhsHeisig] = useQueryState("zhs_heisig", parseAsInteger.withDefault(0));
  const [zhtHeisig, setZhtHeisig] = useQueryState("zht_heisig", parseAsInteger.withDefault(0));
  const [jlpt,      setJlpt]      = useQueryState("jlpt",       parseAsString.withDefault(""));
  const [grade,     setGrade]     = useQueryState("grade",      parseAsString.withDefault(""));
  const [hsk2,      setHsk2]      = useQueryState("hsk2",       parseAsString.withDefault(""));
  const [sort,      setSort]      = useQueryState("sort",       parseAsString.withDefault("id"));
  const [dir,       setDir]       = useQueryState("dir",        parseAsString.withDefault("asc"));
  const [page,      setPage]      = useQueryState("page",       parseAsInteger.withDefault(1));

  const context = ctxParam as CharacterContext;

  function setContext(newCtx: CharacterContext) {
    setCtxParam(newCtx);
    setPage(1);
    if (newCtx !== "ja")  { setJaJoyo(0); setJaHeisig(0); setJlpt(""); setGrade(""); }
    if (newCtx !== "zhs") { setZhsHeisig(0); setHsk2(""); }
    if (newCtx !== "zht") { setZhtHeisig(0); }
    setColumnVisibility(defaultVisibility(newCtx));
  }

  // --- Data ---
  const [data,  setData]  = useState<CharacterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  const perPage = 50;

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("ctx",  context);
    if (jaJoyo)    params.set("ja_joyo",    "1");
    if (jaHeisig)  params.set("ja_heisig",  "1");
    if (zhsHeisig) params.set("zhs_heisig", "1");
    if (zhtHeisig) params.set("zht_heisig", "1");
    if (jlpt)      params.set("jlpt",  jlpt);
    if (grade)     params.set("grade", grade);
    if (hsk2)      params.set("hsk2",  hsk2);
    params.set("sort",     sort);
    params.set("dir",      dir);
    params.set("page",     String(page));
    params.set("per_page", String(perPage));

    startTransition(async () => {
      const res  = await fetch(`/api/characters?${params}`);
      const json = await res.json();
      setData(json.rows);
      setTotal(json.total);
    });
  }, [context, jaJoyo, jaHeisig, zhsHeisig, zhtHeisig, jlpt, grade, hsk2, sort, dir, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Columns & visibility ---
  const columns = useMemo(() => buildTableColumns(context), [context]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => defaultVisibility(context)
  );

  // --- Table ---
  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.ceil(total / perPage),
  });

  // --- Helpers ---
  function toggleMulti(current: string, value: string): string {
    const arr = current ? current.split(",") : [];
    return arr.includes(String(value))
      ? arr.filter(v => v !== String(value)).join(",")
      : [...arr, String(value)].join(",");
  }

  function handleSort(field: SortField) {
    if (sort === field) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(field); setDir("asc"); }
    setPage(1);
  }

  const sortIndicator = (field: SortField) =>
    sort === field ? (dir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">

        {/* Context selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase shrink-0">Character class</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(["all", "ja", "zhs", "zht"] as CharacterContext[]).map(c => (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={`px-3 py-1.5 border-r border-gray-200 last:border-r-0 transition-colors ${
                  context === c
                    ? "bg-gray-900 text-white"
                    : "text-gray-900 hover:bg-gray-50"
                }`}
              >
                {CONTEXT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Context-specific filters */}
        {context !== "all" && (
          <div className="flex flex-wrap gap-6">

            {context === "ja" && (<>
              <fieldset>
                <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">Set</legend>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-gray-900 cursor-pointer">
                    <input type="checkbox" checked={!!jaJoyo}
                      onChange={() => { setJaJoyo(jaJoyo ? 0 : 1); setPage(1); }} />
                    Jōyō
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-900 cursor-pointer">
                    <input type="checkbox" checked={!!jaHeisig}
                      onChange={() => { setJaHeisig(jaHeisig ? 0 : 1); setPage(1); }} />
                    Heisig
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">JLPT</legend>
                <div className="flex gap-1.5">
                  {JLPT_LEVELS.map(n => (
                    <label key={n} className="flex items-center gap-1 text-sm text-gray-900 cursor-pointer">
                      <input type="checkbox"
                        checked={jlpt.split(",").includes(String(n))}
                        onChange={() => { setJlpt(toggleMulti(jlpt, String(n))); setPage(1); }} />
                      N{n}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">Grade</legend>
                <div className="flex gap-1.5">
                  {GRADE_LEVELS.map(g => (
                    <label key={g} className="flex items-center gap-1 text-sm text-gray-900 cursor-pointer">
                      <input type="checkbox"
                        checked={grade.split(",").includes(g)}
                        onChange={() => { setGrade(toggleMulti(grade, g)); setPage(1); }} />
                      {g}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>)}

            {context === "zhs" && (<>
              <fieldset>
                <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">Set</legend>
                <label className="flex items-center gap-1.5 text-sm text-gray-900 cursor-pointer">
                  <input type="checkbox" checked={!!zhsHeisig}
                    onChange={() => { setZhsHeisig(zhsHeisig ? 0 : 1); setPage(1); }} />
                  Heisig
                </label>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">HSK2</legend>
                <div className="flex gap-1.5">
                  {HSK_LEVELS.map(n => (
                    <label key={n} className="flex items-center gap-1 text-sm text-gray-900 cursor-pointer">
                      <input type="checkbox"
                        checked={hsk2.split(",").includes(String(n))}
                        onChange={() => { setHsk2(toggleMulti(hsk2, String(n))); setPage(1); }} />
                      {n}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>)}

            {context === "zht" && (
              <fieldset>
                <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">Set</legend>
                <label className="flex items-center gap-1.5 text-sm text-gray-900 cursor-pointer">
                  <input type="checkbox" checked={!!zhtHeisig}
                    onChange={() => { setZhtHeisig(zhtHeisig ? 0 : 1); setPage(1); }} />
                  Heisig
                </label>
              </fieldset>
            )}

          </div>
        )}

        {/* Column picker — only shows columns relevant to current context */}
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase">Columns</summary>
          <div className="mt-2 flex flex-wrap gap-3">
            {table.getAllColumns().map(c => (
              <label key={c.id} className="flex items-center gap-1.5 text-gray-900 cursor-pointer">
                <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} />
                {String(c.columnDef.header)}
              </label>
            ))}
          </div>
        </details>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <div className="px-4 py-2 border-b border-gray-100 text-sm text-gray-500 flex justify-between">
          <span>{total.toLocaleString()} characters</span>
          <span className={isPending ? "text-blue-500" : ""}>{isPending ? "Loading…" : ""}</span>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
                {hg.headers.map(header => {
                  const sortField = COL_SORT_FIELD[header.column.id];
                  return (
                    <th
                      key={header.id}
                      className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap ${sortField ? "cursor-pointer hover:text-gray-900 select-none" : ""}`}
                      style={{ width: header.column.columnDef.size }}
                      onClick={sortField ? () => handleSort(sortField) : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortField && sortIndicator(sortField)}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                {row.getVisibleCells().map(cell => {
                  const isLiteral = cell.column.id === "literal";
                  return (
                    <td
                      key={cell.id}
                      className={`px-3 py-1.5 ${
                        isLiteral
                          ? `text-2xl font-medium text-gray-900 ${CJK_FONT_CLASS[context]}`
                          : "text-gray-700"
                      }`}
                      lang={isLiteral ? CJK_LANG[context] : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? (cell.getValue() as string) ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >← Prev</button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
