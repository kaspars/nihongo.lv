/**
 * Parses Glossika sentence files and produces a structured JSON reference.
 *
 * Each source file contains numbered sentences:
 *   "123. sentence text here"
 *
 * For Chinese, zh-CN (simplified) and zh-TW (traditional) share sentence
 * numbers — they are aligned into parallel pairs where both exist.
 *
 * Output: data/glossika/sentences.json
 *
 * Usage:
 *   npx tsx scripts/parse-glossika.ts
 */

import { readFileSync, writeFileSync } from "fs";

const FILES: { lang: string; file: string }[] = [
  { lang: "en",    file: "data/glossika/en.txt" },
  { lang: "lv",    file: "data/glossika/lv.txt" },
  { lang: "ja",    file: "data/glossika/ja.txt" },
  { lang: "ko",    file: "data/glossika/ko.txt" },
  { lang: "zh-CN", file: "data/glossika/zh-CN.txt" },
  { lang: "zh-TW", file: "data/glossika/zh-TW.txt" },
  { lang: "yue",   file: "data/glossika/yue.txt" },
  { lang: "vi",    file: "data/glossika/vi.txt" },
];

function parseFile(path: string): Map<number, string> {
  const lines = readFileSync(path, "utf-8").split("\n");
  const map = new Map<number, string>();
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s+(.+)$/);
    if (m) map.set(parseInt(m[1]), m[2].trim());
  }
  return map;
}

// Parse all files
const parsed: Record<string, Map<number, string>> = {};
for (const { lang, file } of FILES) {
  parsed[lang] = parseFile(file);
  console.log(`${lang}: ${parsed[lang].size} sentences`);
}

// Build output: one entry per unique sentence number, with all available languages
const allNums = new Set<number>();
for (const map of Object.values(parsed)) {
  for (const num of map.keys()) allNums.add(num);
}

interface SentenceEntry {
  id: number;
  en?: string;
  lv?: string;
  ja?: string;
  ko?: string;
  "zh-CN"?: string;
  "zh-TW"?: string;
  yue?: string;
  vi?: string;
}

const entries: SentenceEntry[] = [];
for (const id of [...allNums].sort((a, b) => a - b)) {
  const entry: SentenceEntry = { id };
  for (const lang of ["en", "lv", "ja", "ko", "zh-CN", "zh-TW", "yue", "vi"] as const) {
    const val = parsed[lang]?.get(id);
    if (val) (entry as any)[lang] = val;
  }
  entries.push(entry);
}

// Stats
const langs = ["en", "lv", "ja", "ko", "zh-CN", "zh-TW", "yue", "vi"];
const zhBoth = entries.filter(e => e["zh-CN"] && e["zh-TW"]).length;
const allCjk  = entries.filter(e => e["zh-CN"] && e["zh-TW"] && e.ja && e.ko && e.yue).length;

console.log(`\nTotal unique sentence IDs: ${entries.length}`);
console.log(`zh-CN + zh-TW parallel pairs: ${zhBoth}`);
console.log(`All CJK (zh-CN + zh-TW + ja + ko + yue): ${allCjk}`);
for (const lang of langs) {
  console.log(`  ${lang}: ${entries.filter(e => (e as any)[lang]).length}`);
}

const outPath = "data/glossika/sentences.json";
writeFileSync(outPath, JSON.stringify(entries, null, 2), "utf-8");
console.log(`\nSaved to: ${outPath}`);
