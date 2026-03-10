/**
 * Extracts Heisig RTK data from the hochanh/rtk-search repo (cloned to tmp/rtk-search).
 *
 * Sources:
 *   tmp/rtk-search/rtk1-v6/   — 2200 kanji from RTK vol.1 6th edition
 *   tmp/rtk-search/rtk3-remain/ — 830 kanji from RTK vol.3 3rd edition (repo uses alternative index numbering)
 *
 * Output:
 *   data/heisig-rtk.json — sorted by heisigV6 (then heisigV4 for vol.3)
 *
 * Usage:
 *   npx tsx scripts/extract-rtk-heisig.ts
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

interface RtkEntry {
  kanji: string;
  keyword: string;
  heisigV6: number | null;   // RTK vol.1 6th edition number (1–2200), null for vol.3
  heisigV4: number | null;   // RTK 4th edition number
  strokes: number | null;
  source: "rtk1-v6" | "rtk3-remain";
}

// Parse YAML frontmatter (only the fields we need — no full YAML parser required)
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

function readDir(dir: string, source: "rtk1-v6" | "rtk3-remain"): RtkEntry[] {
  const files = readdirSync(dir).filter(f => f.endsWith(".md")).sort();
  const entries: RtkEntry[] = [];
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm.kanji || !fm.keyword) continue;
    entries.push({
      kanji:    fm.kanji,
      keyword:  fm.keyword,
      heisigV6: fm.v6 ? parseInt(fm.v6) : null,
      heisigV4: fm.v4 ? parseInt(fm.v4) : null,
      strokes:  fm.strokes ? parseInt(fm.strokes) : null,
      source,
    });
  }
  return entries;
}

const vol1 = readDir("tmp/rtk-search/rtk1-v6", "rtk1-v6");
const vol3 = readDir("tmp/rtk-search/rtk3-remain", "rtk3-remain");

const all = [...vol1, ...vol3].sort((a, b) => {
  // vol.1 entries come first (sorted by v6 number), then vol.3 (sorted by v4)
  const aKey = a.heisigV6 ?? (a.heisigV4 ?? 9999) + 10000;
  const bKey = b.heisigV6 ?? (b.heisigV4 ?? 9999) + 10000;
  return aKey - bKey;
});

console.log(`rtk1-v6:      ${vol1.length} entries`);
console.log(`rtk3-remain:  ${vol3.length} entries`);
console.log(`Total:        ${all.length} entries`);

// Sanity checks
const v6Range = vol1.map(e => e.heisigV6!).sort((a, b) => a - b);
console.log(`v6 range: ${v6Range[0]} – ${v6Range[v6Range.length - 1]}`);
const v4Range = vol3.map(e => e.heisigV4!).sort((a, b) => a - b);
console.log(`vol.3 v4 range: ${v4Range[0]} – ${v4Range[v4Range.length - 1]}`);

// Check for duplicate kanji
const seen = new Map<string, RtkEntry>();
const dupes: string[] = [];
for (const e of all) {
  if (seen.has(e.kanji)) dupes.push(e.kanji);
  else seen.set(e.kanji, e);
}
if (dupes.length) console.warn(`Duplicate kanji: ${dupes.join(", ")}`);

mkdirSync("data", { recursive: true });
writeFileSync("data/heisig-rtk.json", JSON.stringify(all, null, 2), "utf-8");
console.log("\nSaved to data/heisig-rtk.json");
