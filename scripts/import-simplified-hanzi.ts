/**
 * Imports simplified Chinese hanzi from data/hanzidb-hsk.json into the database.
 *
 * For each character:
 *   - Upserts a row in `characters`        (literal, stroke_count, radical)
 *   - Upserts a row in `simplified_hanzi`  (hsk2_level)
 *   - Upserts a row in `character_readings` (zh / pinyin)
 *   - Upserts a row in `character_meanings` (zh source, en meaning)
 *
 * Primary source: data/hanzidb-hsk.json (2663 character-level HSK 2.0 entries)
 * Cross-validation: data/hskacademy-vocab.json (word-level, single-char entries only)
 *
 * Usage:
 *   npx tsx scripts/import-simplified-hanzi.ts [--dry-run]
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

// --- Load sources ---

interface HanziDbEntry {
  character: string;
  pinyin: string;
  definition: string;
  radicalChar: string;
  radicalKangxi: number;
  strokeCount: number;
  hskLevel: number;
  generalStandard: number | null;
  frequencyRank: number | null;
}

interface HskAcademyEntry {
  hskLevel: number;
  hanzi: string;
  traditional: string;
  pinyin: string;
  definition: string;
}

const hanziDb: HanziDbEntry[] = JSON.parse(
  readFileSync("data/hanzidb-hsk.json", "utf-8"),
);
const hskAcademy: HskAcademyEntry[] = JSON.parse(
  readFileSync("data/hskacademy-vocab.json", "utf-8"),
);

// Build hskacademy lookup for single-character words (for cross-validation)
const hskAcademySingle = new Map<string, HskAcademyEntry>();
for (const e of hskAcademy) {
  if ([...e.hanzi].length === 1) hskAcademySingle.set(e.hanzi, e);
}

// --- Cross-validate HSK levels ---

let levelAgreements = 0, levelDiscrepancies = 0;
const discrepancies: Array<{ char: string; hanzidb: number; hskacademy: number }> = [];

for (const e of hanziDb) {
  const a = hskAcademySingle.get(e.character);
  if (!a) continue;
  if (e.hskLevel === a.hskLevel) {
    levelAgreements++;
  } else {
    levelDiscrepancies++;
    discrepancies.push({ char: e.character, hanzidb: e.hskLevel, hskacademy: a.hskLevel });
  }
}

console.log(`Cross-validation (single-char entries in both sources):`);
console.log(`  Agreements:    ${levelAgreements}`);
console.log(`  Discrepancies: ${levelDiscrepancies}`);
if (discrepancies.length > 0) {
  console.log(`  First 10 discrepancies (hanzidb → hskacademy):`);
  discrepancies.slice(0, 10).forEach(d =>
    console.log(`    ${d.char}  hanzidb=L${d.hanzidb}  hskacademy=L${d.hskacademy}`)
  );
}
console.log();

// --- Parse meanings array from definition string ---
// Split on "; " or ", " boundaries, trim, filter empty
function parseMeanings(definition: string | null): string[] {
  if (!definition) return [];
  return definition
    .split(/;\s*/)
    .flatMap(s => s.split(/,\s+(?=[A-Z(])/))  // split on ", Word" boundaries
    .map(s => s.trim())
    .filter(Boolean);
}

// --- Run import ---

if (DRY_RUN) {
  console.log("DRY RUN — no database changes will be made.\n");
  hanziDb.slice(0, 5).forEach(e => {
    const cp = e.character.codePointAt(0)!;
    console.log({
      id: cp,
      literal: e.character,
      strokeCount: e.strokeCount,
      radical: e.radicalKangxi,
      hsk2Level: e.hskLevel,
      pinyin: e.pinyin,
      meanings: parseMeanings(e.definition),
    });
  });
  process.exit(0);
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  let upserted = { characters: 0, hanzi: 0, readings: 0, meanings: 0 };

  console.log(`Importing ${hanziDb.length} characters...`);

  for (const e of hanziDb) {
    const cp = e.character.codePointAt(0)!;
    const meanings = parseMeanings(e.definition);

    // 1. characters
    await db
      .insert(schema.characters)
      .values({
        id: cp,
        literal: e.character,
        strokeCount: e.strokeCount || null,
        radical: e.radicalKangxi || null,
      })
      .onConflictDoUpdate({
        target: schema.characters.id,
        set: {
          strokeCount: sql`COALESCE(EXCLUDED.stroke_count, ${schema.characters.strokeCount})`,
          radical: sql`COALESCE(EXCLUDED.radical, ${schema.characters.radical})`,
        },
      });
    upserted.characters++;

    // 2. simplified_hanzi
    await db
      .insert(schema.simplifiedHanzi)
      .values({ characterId: cp, hsk2Level: e.hskLevel })
      .onConflictDoUpdate({
        target: schema.simplifiedHanzi.characterId,
        set: { hsk2Level: e.hskLevel },
      });
    upserted.hanzi++;

    // 3. character_readings — pinyin
    if (e.pinyin) {
      await db
        .insert(schema.characterReadings)
        .values({ characterId: cp, language: "cmn", type: "pinyin", value: e.pinyin, position: 0 })
        .onConflictDoNothing();
      upserted.readings++;
    }

    // 4. character_meanings — English
    if (meanings.length > 0) {
      await db
        .insert(schema.characterMeanings)
        .values({ characterId: cp, sourceLanguage: "cmn", meaningLanguage: "en", meanings })
        .onConflictDoUpdate({
          target: [
            schema.characterMeanings.characterId,
            schema.characterMeanings.sourceLanguage,
            schema.characterMeanings.meaningLanguage,
          ],
          set: { meanings },
        });
      upserted.meanings++;
    }
  }

  await client.end();

  console.log(`\nDone.`);
  console.log(`  characters:  ${upserted.characters} upserted`);
  console.log(`  hanzi:       ${upserted.hanzi} upserted`);
  console.log(`  readings:    ${upserted.readings} upserted`);
  console.log(`  meanings:    ${upserted.meanings} upserted`);
}

main().catch(err => { console.error(err); process.exit(1); });
