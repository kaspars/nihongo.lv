/**
 * Scrapes HSK character data from hanzidb.org and saves it locally as JSON
 * for cross-referencing against other HSK data sources.
 *
 * Usage:
 *   npx tsx scripts/scrape-hanzidb-hsk.ts
 *
 * Output: data/hanzidb-hsk.json
 */

import { writeFileSync } from "fs";
import { JSDOM } from "jsdom";

const BASE_URL = "http://hanzidb.org/character-list/hsk";
const TOTAL_PAGES = 27;
const DELAY_MS = 500;

interface HanzidbEntry {
  character: string;
  pinyin: string | null;
  definition: string | null;
  radicalChar: string | null;
  radicalKangxi: number | null;
  strokeCount: number | null;
  hskLevel: number | null;
  generalStandard: number | null;
  frequencyRank: number | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page: number): Promise<HanzidbEntry[]> {
  const url = `${BASE_URL}?page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const rows = document.querySelectorAll("table tbody tr");
  if (rows.length === 0) {
    console.warn(`  Page ${page}: no rows found`);
    return [];
  }

  // Detect column headers on first pass
  if (page === 1) {
    const headers = [...document.querySelectorAll("table thead th")].map(
      (th) => th.textContent?.trim()
    );
    console.log("  Columns:", headers.join(" | "));
  }

  const entries: HanzidbEntry[] = [];

  // Columns: Character | Pinyin | Definition | Radical | Stroke Count | HSK Level | General Standard# | Frequency Rank
  for (const row of rows) {
    const tds = row.querySelectorAll("td");
    if (tds.length < 6) continue;

    const character = tds[0].querySelector("a")?.textContent?.trim() ?? tds[0].textContent?.trim() ?? "";
    const pinyin = tds[1].textContent?.trim() || null;
    const definition = tds[2].textContent?.trim() || null;

    // Radical cell: <a title="Kangxi radical 106">白</a>&nbsp;106.3
    const radicalLink = tds[3].querySelector("a");
    const radicalChar = radicalLink?.textContent?.trim() || null;
    const radicalTitle = radicalLink?.getAttribute("title") ?? "";
    const radicalKangxiMatch = radicalTitle.match(/Kangxi radical (\d+)/);
    const radicalKangxi = radicalKangxiMatch ? parseInt(radicalKangxiMatch[1]) : null;

    const strokeCount = parseInt(tds[4].textContent?.trim() ?? "") || null;
    const hskLevel = parseInt(tds[5].textContent?.trim() ?? "") || null;
    const generalStandard = parseInt(tds[6].textContent?.trim() ?? "") || null;
    const frequencyRank = parseInt(tds[7].textContent?.trim() ?? "") || null;

    entries.push({
      character,
      pinyin,
      definition,
      radicalChar,
      radicalKangxi,
      strokeCount,
      hskLevel,
      generalStandard,
      frequencyRank,
    });
  }

  return entries;
}

async function main() {
  console.log(`Scraping ${TOTAL_PAGES} pages from hanzidb.org...`);

  const allEntries: HanzidbEntry[] = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    process.stdout.write(`Page ${page}/${TOTAL_PAGES}...`);
    try {
      const entries = await fetchPage(page);
      allEntries.push(...entries);
      console.log(` ${entries.length} rows`);
    } catch (err) {
      console.error(` ERROR: ${err}`);
    }
    if (page < TOTAL_PAGES) await sleep(DELAY_MS);
  }

  const outPath = "data/hanzidb-hsk.json";
  writeFileSync(outPath, JSON.stringify(allEntries, null, 2), "utf-8");

  console.log(`\nTotal entries: ${allEntries.length}`);
  console.log(`Saved to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
