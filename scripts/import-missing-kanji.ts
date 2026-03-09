/**
 * Imports kanji that are missing from our database, sourcing their
 * properties (stroke count, radical, readings) from KANJIDIC2.
 *
 * Intended to be run after analyze-text.ts reveals gaps.
 *
 * Usage:
 *   npx tsx scripts/import-missing-kanji.ts <path-to-text-file> [--dry-run]
 *
 * Example:
 *   npx tsx scripts/import-missing-kanji.ts data/texts/soseki-natsume/kokoro/kokoro.txt
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { radicalCharToNumber } from "../src/lib/kangxi-radicals";

dotenv.config({ path: ".env.local" });

const filePath = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");

if (!filePath) {
  console.error(
    "Usage: npx tsx scripts/import-missing-kanji.ts <path-to-text-file> [--dry-run]",
  );
  process.exit(1);
}

// --- Aozora text cleaning (same as analyze-text.ts) ---

function stripAozoraMarkup(text: string): string {
  const headerEnd = text.indexOf("-------------------------------------------------------\n");
  if (headerEnd !== -1) {
    const secondSep = text.indexOf("-------------------------------------------------------", headerEnd + 1);
    if (secondSep !== -1) {
      text = text.slice(secondSep + "-------------------------------------------------------".length);
    }
  }
  const footerMatch = text.search(/\n底本[：:]/);
  if (footerMatch !== -1) text = text.slice(0, footerMatch);
  text = text.replace(/［＃[^］]*］/g, "");
  text = text.replace(/《[^》]*》/g, "");
  text = text.replace(/｜/g, "");
  text = text.replace(/[※〔〕]/g, "");
  return text;
}

function isKanji(cp: number): boolean {
  return (
    (cp >= 0x4e00  && cp <= 0x9fff)  ||
    (cp >= 0x3400  && cp <= 0x4dbf)  ||
    (cp >= 0x20000 && cp <= 0x2a6df) ||
    (cp >= 0x2a700 && cp <= 0x2b73f) ||
    (cp >= 0x2b740 && cp <= 0x2b81f) ||
    (cp >= 0x2b820 && cp <= 0x2ceaf) ||
    (cp >= 0x2ceb0 && cp <= 0x2ebef) ||
    (cp >= 0x30000 && cp <= 0x3134f) ||
    (cp >= 0x31350 && cp <= 0x323af) ||
    (cp >= 0xf900  && cp <= 0xfaff)
  );
}

// --- KANJIDIC2 parsing ---

interface KanjidicEntry {
  codepoint: number;
  strokeCount: number | null;
  radicalNumber: number | null;
  onyomi: string[];
  kunyomi: string[];
  grade: string | null;
  jlpt: number | null;
  category: "jouyou" | "jinmei" | "hyougai" | null;
}

function parseKanjidic(): Map<number, KanjidicEntry> {
  const xml = readFileSync("data/kanjidic2.xml", "utf-8");
  const map = new Map<number, KanjidicEntry>();
  const charRegex = /<character>([\s\S]*?)<\/character>/g;
  let m;

  while ((m = charRegex.exec(xml)) !== null) {
    const block = m[1];
    const literal = block.match(/<literal>(.*?)<\/literal>/)?.[1];
    if (!literal) continue;
    const cp = literal.codePointAt(0)!;

    const sc = block.match(/<stroke_count>(\d+)<\/stroke_count>/);
    const rad = block.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/);
    const grade = block.match(/<grade>(\d+)<\/grade>/);
    const jlpt = block.match(/<jlpt>(\d+)<\/jlpt>/);

    // Grade 8 = jouyou secondary (S), 1-6 = primary school
    let category: KanjidicEntry["category"] = null;
    let gradeStr: string | null = null;
    if (grade) {
      const g = parseInt(grade[1]);
      if (g >= 1 && g <= 6) { category = "jouyou"; gradeStr = String(g); }
      else if (g === 8) { category = "jouyou"; gradeStr = "S"; }
      else if (g === 9) { category = "jinmei"; }
    }

    // Readings
    const onyomi: string[] = [];
    const kunyomi: string[] = [];
    const readingRegex = /<reading r_type="(ja_on|ja_kun)"[^>]*>([^<]+)<\/reading>/g;
    let rm;
    while ((rm = readingRegex.exec(block)) !== null) {
      if (rm[1] === "ja_on") onyomi.push(rm[2]);
      else kunyomi.push(rm[2]);
    }

    map.set(cp, {
      codepoint: cp,
      strokeCount: sc ? parseInt(sc[1]) : null,
      radicalNumber: rad ? parseInt(rad[1]) : null,
      onyomi,
      kunyomi,
      grade: gradeStr,
      jlpt: jlpt ? parseInt(jlpt[1]) : null,
      category,
    });
  }

  return map;
}

// --- Main ---

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== IMPORTING ===");

  const raw = readFileSync(filePath, "utf-8");
  const cleaned = stripAozoraMarkup(raw);

  // Collect unique kanji from text
  const seen = new Set<string>();
  for (const char of cleaned) {
    const cp = char.codePointAt(0)!;
    if (isKanji(cp)) seen.add(char);
  }

  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Find which are missing from DB
  const dbRows = await sql<{ literal: string }[]>`SELECT literal FROM characters`;
  const inDb = new Set(dbRows.map((r) => r.literal));
  const missing = [...seen].filter((k) => !inDb.has(k));

  console.log(`Unique kanji in text: ${seen.size}`);
  console.log(`Already in DB:        ${seen.size - missing.length}`);
  console.log(`To import:            ${missing.length}`);
  console.log("");

  const kanjidic = parseKanjidic();

  let stats = { inserted: 0, noKanjidicData: 0, errors: 0 };

  for (const char of missing) {
    const cp = char.codePointAt(0)!;
    const entry = kanjidic.get(cp);

    if (!entry) {
      stats.noKanjidicData++;
      console.log(`  No KANJIDIC2 data: ${char} (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  Would import: ${char} (U+${cp.toString(16).toUpperCase().padStart(4, "0")}) strokes=${entry.strokeCount} radical=${entry.radicalNumber}`);
      stats.inserted++;
      continue;
    }

    try {
      // 1. characters
      await db.insert(schema.characters).values({
        id: cp,
        literal: char,
        strokeCount: entry.strokeCount,
        radical: entry.radicalNumber,
      }).onConflictDoNothing();

      // 2. japanese_kanji
      await db.insert(schema.japaneseKanji).values({
        characterId: cp,
        grade: entry.grade,
        jlpt: entry.jlpt,
        category: entry.category,
      }).onConflictDoNothing();

      // 3. readings
      for (let i = 0; i < entry.onyomi.length; i++) {
        await db.insert(schema.characterReadings).values({
          characterId: cp,
          language: "ja",
          type: "onyomi",
          value: entry.onyomi[i],
          position: i,
        }).onConflictDoNothing();
      }
      for (let i = 0; i < entry.kunyomi.length; i++) {
        await db.insert(schema.characterReadings).values({
          characterId: cp,
          language: "ja",
          type: "kunyomi",
          value: entry.kunyomi[i],
          position: i,
        }).onConflictDoNothing();
      }

      stats.inserted++;
    } catch (err) {
      stats.errors++;
      console.error(`  Error importing ${char}:`, err);
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Imported:          ${stats.inserted}`);
  console.log(`No KANJIDIC2 data: ${stats.noKanjidicData}`);
  console.log(`Errors:            ${stats.errors}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
