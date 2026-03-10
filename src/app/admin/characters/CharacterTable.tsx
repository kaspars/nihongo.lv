"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  VisibilityState,
} from "@tanstack/react-table";
import { useQueryState, parseAsInteger, parseAsString, parseAsArrayOf } from "nuqs";
import { useEffect, useState, useTransition, useCallback } from "react";
import type { CharacterRow, SortField, SortDir } from "./filters";

const col = createColumnHelper<CharacterRow>();

const ALL_COLUMNS = [
  col.accessor("literal",     { header: "Char",      size: 48 }),
  col.accessor("heisigJa",    { header: "Heisig JA", size: 80 }),
  col.accessor("heisigZhs",   { header: "Heisig ZHS",size: 80 }),
  col.accessor("heisigZht",   { header: "Heisig ZHT",size: 80 }),
  col.accessor("jlpt",        { header: "JLPT",      size: 56, cell: i => i.getValue() ? `N${i.getValue()}` : null }),
  col.accessor("grade",       { header: "Grade",     size: 56 }),
  col.accessor("hsk2Level",   { header: "HSK2",      size: 56 }),
  col.accessor("strokeCount", { header: "Strokes",   size: 64 }),
  col.accessor("radical",     { header: "Radical",   size: 64 }),
  col.accessor("category",    { header: "Category",  size: 72 }),
  col.accessor("keywordJa",   { header: "Keyword JA",size: 160 }),
  col.accessor("keywordZhs",  { header: "Keyword ZHS",size: 160 }),
  col.accessor("keywordZht",  { header: "Keyword ZHT",size: 160 }),
  col.accessor("onyomi",      { header: "On'yomi",   size: 120 }),
  col.accessor("kunyomi",     { header: "Kun'yomi",  size: 120 }),
  col.accessor("pinyin",      { header: "Pinyin",    size: 100 }),
];

const DEFAULT_VISIBLE: VisibilityState = {
  literal: true, heisigJa: true, heisigZhs: false, heisigZht: false,
  jlpt: true, grade: true, hsk2Level: true, strokeCount: true, radical: false,
  category: false, keywordJa: true, keywordZhs: false, keywordZht: false,
  onyomi: true, kunyomi: true, pinyin: false,
};

const JLPT_LEVELS  = [1, 2, 3, 4, 5];
const GRADE_LEVELS = ["1", "2", "3", "4", "5", "6", "S"];
const HSK_LEVELS   = [1, 2, 3, 4, 5, 6];

export default function CharacterTable() {
  // --- Filter state (URL params) ---
  const [jaJoyo,    setJaJoyo]    = useQueryState("ja_joyo",    parseAsInteger.withDefault(0));
  const [jaHeisig,  setJaHeisig]  = useQueryState("ja_heisig",  parseAsInteger.withDefault(0));
  const [zhsHeisig, setZhsHeisig] = useQueryState("zhs_heisig", parseAsInteger.withDefault(0));
  const [zhtHeisig, setZhtHeisig] = useQueryState("zht_heisig", parseAsInteger.withDefault(0));
  const [jlpt,      setJlpt]      = useQueryState("jlpt",       parseAsString.withDefault(""));
  const [grade,     setGrade]     = useQueryState("grade",       parseAsString.withDefault(""));
  const [hsk2,      setHsk2]      = useQueryState("hsk2",        parseAsString.withDefault(""));
  const [sort,      setSort]      = useQueryState("sort",        parseAsString.withDefault("id"));
  const [dir,       setDir]       = useQueryState("dir",         parseAsString.withDefault("asc"));
  const [page,      setPage]      = useQueryState("page",        parseAsInteger.withDefault(1));

  // --- Data ---
  const [data, setData]   = useState<CharacterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  const perPage = 50;

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    if (jaJoyo)    params.set("ja_joyo",    "1");
    if (jaHeisig)  params.set("ja_heisig",  "1");
    if (zhsHeisig) params.set("zhs_heisig", "1");
    if (zhtHeisig) params.set("zht_heisig", "1");
    if (jlpt)      params.set("jlpt",  jlpt);
    if (grade)     params.set("grade", grade);
    if (hsk2)      params.set("hsk2",  hsk2);
    params.set("sort", sort);
    params.set("dir",  dir);
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    startTransition(async () => {
      const res = await fetch(`/api/characters?${params}`);
      const json = await res.json();
      setData(json.rows);
      setTotal(json.total);
    });
  }, [jaJoyo, jaHeisig, zhsHeisig, zhtHeisig, jlpt, grade, hsk2, sort, dir, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Column visibility ---
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBLE);

  // --- Table ---
  const table = useReactTable({
    data,
    columns: ALL_COLUMNS,
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
    if (sort === field) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setDir("asc");
    }
    setPage(1);
  }

  const sortIndicator = (field: SortField) =>
    sort === field ? (dir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap gap-6">
          {/* Set membership */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">Character set</legend>
            <div className="flex flex-wrap gap-3">
              {[
                ["Jōyō kanji",    jaJoyo,    setJaJoyo],
                ["Heisig JA",     jaHeisig,  setJaHeisig],
                ["Heisig ZHS",    zhsHeisig, setZhsHeisig],
                ["Heisig ZHT",    zhtHeisig, setZhtHeisig],
              ].map(([label, val, set]) => (
                <label key={label as string} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(val as number)}
                    onChange={() => { (set as (v: number) => void)(val ? 0 : 1); setPage(1); }}
                  />
                  {label as string}
                </label>
              ))}
            </div>
          </fieldset>

          {/* JLPT */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">JLPT</legend>
            <div className="flex gap-1.5">
              {JLPT_LEVELS.map(n => (
                <label key={n} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jlpt.split(",").includes(String(n))}
                    onChange={() => { setJlpt(toggleMulti(jlpt, String(n))); setPage(1); }}
                  />
                  N{n}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Grade */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">Grade</legend>
            <div className="flex gap-1.5">
              {GRADE_LEVELS.map(g => (
                <label key={g} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grade.split(",").includes(g)}
                    onChange={() => { setGrade(toggleMulti(grade, g)); setPage(1); }}
                  />
                  {g}
                </label>
              ))}
            </div>
          </fieldset>

          {/* HSK2 */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase mb-2">HSK2</legend>
            <div className="flex gap-1.5">
              {HSK_LEVELS.map(n => (
                <label key={n} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hsk2.split(",").includes(String(n))}
                    onChange={() => { setHsk2(toggleMulti(hsk2, String(n))); setPage(1); }}
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Column picker */}
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase">Columns</summary>
          <div className="mt-2 flex flex-wrap gap-3">
            {table.getAllColumns().map(col => (
              <label key={col.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={col.getIsVisible()}
                  onChange={col.getToggleVisibilityHandler()}
                />
                {String(col.columnDef.header)}
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
                  const field = header.column.id as SortField;
                  const sortable = ["id","stroke_count","radical","heisig_ja","heisig_zhs","heisig_zht","jlpt","grade","hsk2"].includes(header.column.id);
                  return (
                    <th
                      key={header.id}
                      className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap ${sortable ? "cursor-pointer hover:text-gray-900 select-none" : ""}`}
                      style={{ width: header.column.columnDef.size }}
                      onClick={sortable ? () => handleSort(field) : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortable && sortIndicator(field)}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`px-3 py-1.5 ${cell.column.id === "literal" ? "text-xl font-medium" : "text-gray-700"}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? (cell.getValue() as any) ?? ""}
                  </td>
                ))}
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
