/**
 * Extracts Heisig & Richardson hanzi keyword data from Anki decks.
 *
 * Sources:
 *   tmp/James_W_Heisig_-_Remembering_Simplified_Hanzi_1__2.apkg
 *   tmp/James_W_Heisig_-_Remembering_Traditional_Hanzi_1_and_2.apkg
 *
 * Output:
 *   data/heisig-rsh-simplified.json  — 3018 entries (RSH books 1 & 2)
 *   data/heisig-rth-traditional.json — 3035 entries (RTH books 1 & 2)
 *
 * Casing rules:
 *   - All keywords lowercased by default
 *   - Surname blocks keep original casing:
 *     simplified #3001–3009, traditional #3001–3020
 *
 * Usage:
 *   npx tsx scripts/extract-heisig-hanzi.ts
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";

interface HanziEntry {
  num: number;
  hanzi: string;
  simplified?: string; // traditional deck only — the simplified equivalent
  keyword: string;
}

function extractApkg(apkgPath: string, extractEntry: (fields: string[]) => HanziEntry | null): HanziEntry[] {
  const output = execSync(`python3 scripts/_apkg_dump.py '${apkgPath}'`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  const entries: HanziEntry[] = [];
  for (const line of output.trim().split("\n")) {
    const fields = JSON.parse(line) as string[];
    const entry = extractEntry(fields);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => a.num - b.num);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function applyCase(keyword: string, num: number, surnameRange: [number, number]): string {
  if (num >= surnameRange[0] && num <= surnameRange[1]) return keyword; // keep original
  return keyword.toLowerCase();
}

// --- Simplified ---
// Fields: [0] Hanzi, [2] HeisigNumber, [4] Keyword
const simplified = extractApkg(
  "tmp/James_W_Heisig_-_Remembering_Simplified_Hanzi_1__2.apkg",
  (p) => {
    const num = parseInt(p[2]?.trim());
    const keyword = p[4]?.trim();
    const hanzi = p[0]?.trim();
    if (!num || !hanzi || !keyword) return null;
    return { num, hanzi, keyword: applyCase(keyword, num, [3001, 3009]) };
  }
);

// --- Traditional ---
// Fields: [0] HeisigNumber (zero-padded), [1] Keyword, [3] Traditional, [4] Simplified
const traditional = extractApkg(
  "tmp/James_W_Heisig_-_Remembering_Traditional_Hanzi_1_and_2.apkg",
  (p) => {
    const num = parseInt(p[0]?.trim());
    const keyword = p[1]?.trim();
    const hanzi = stripHtml(p[3]?.trim() ?? "");
    if (!num || num > 3035 || !hanzi || !keyword) return null;
    const simplified = stripHtml(p[4]?.trim() ?? "") || undefined;
    return { num, hanzi, simplified, keyword: applyCase(keyword, num, [3001, 3020]) };
  }
);

console.log(`Simplified: ${simplified.length} entries (${simplified[0].num}–${simplified[simplified.length - 1].num})`);
console.log(`Traditional: ${traditional.length} entries (${traditional[0].num}–${traditional[traditional.length - 1].num})`);

// Sanity: duplicate keywords
function checkDupes(entries: HanziEntry[], label: string) {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const e of entries) {
    if (seen.has(e.keyword)) dupes.push(`"${e.keyword}": #${seen.get(e.keyword)} vs #${e.num}`);
    else seen.set(e.keyword, e.num);
  }
  console.log(`${label} duplicate keywords: ${dupes.length}`);
  dupes.forEach(d => console.log(`  ${d}`));
}

checkDupes(simplified, "Simplified");
checkDupes(traditional, "Traditional");

mkdirSync("data", { recursive: true });
writeFileSync("data/heisig-rsh-simplified.json", JSON.stringify(simplified, null, 2), "utf-8");
writeFileSync("data/heisig-rth-traditional.json", JSON.stringify(traditional, null, 2), "utf-8");
console.log("\nSaved to data/heisig-rsh-simplified.json and data/heisig-rth-traditional.json");
