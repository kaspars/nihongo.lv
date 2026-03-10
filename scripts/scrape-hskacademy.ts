/**
 * Scrapes HSK vocabulary lists from hsk.academy (levels 1–6) and saves
 * them locally as JSON for cross-referencing against other HSK data sources.
 *
 * Usage:
 *   npx tsx scripts/scrape-hskacademy.ts
 *
 * Output: data/hskacademy-vocab.json
 */

import { writeFileSync } from "fs";

const LEVELS = [1, 2, 3, 4, 5, 6];
const DELAY_MS = 1000;

interface HskAcademyWord {
  id: number;
  hanzi: string;
  traditional: string;
  pinyin: string;
  definition: string;
  hskLevel: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLevel(level: number): Promise<HskAcademyWord[]> {
  const url = `https://hsk.academy/en/hsk-${level}-vocabulary-list`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; research-scraper/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for level ${level}`);
  const html = await res.text();

  // Extract window.__REACT_DATA JSON blob
  const match = html.match(/window\.__REACT_DATA\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!match) throw new Error(`Could not find __REACT_DATA on level ${level} page`);

  const data = JSON.parse(match[1]);
  const words: unknown[] = data.words ?? data.data?.words ?? [];

  if (!Array.isArray(words) || words.length === 0) {
    throw new Error(`No words found in __REACT_DATA for level ${level}`);
  }

  return words.map((w: any) => ({
    id: w.id,
    hanzi: w.hanzi ?? w.hanziRaw ?? "",
    traditional: w.trad ?? w.traditional ?? "",
    pinyin: w.pinyinToneSpace ?? w.pinyin ?? "",
    definition: w.def ?? w.definition ?? "",
    hskLevel: level,
  }));
}

async function main() {
  console.log("Scraping hsk.academy vocabulary lists (levels 1–6)...\n");

  const allWords: HskAcademyWord[] = [];

  for (const level of LEVELS) {
    process.stdout.write(`HSK ${level}...`);
    try {
      const words = await fetchLevel(level);
      allWords.push(...words);
      console.log(` ${words.length} words`);
    } catch (err) {
      console.error(` ERROR: ${err}`);
    }
    if (level < LEVELS[LEVELS.length - 1]) await sleep(DELAY_MS);
  }

  const outPath = "data/hskacademy-vocab.json";
  writeFileSync(outPath, JSON.stringify(allWords, null, 2), "utf-8");

  console.log(`\nTotal words: ${allWords.length}`);
  console.log(`Saved to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
