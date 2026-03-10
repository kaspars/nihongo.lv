/**
 * Imports Heisig RTK keywords into character_meanings (source_language=ja, meaning_language=en).
 *
 * Sources:
 *   data/heisig-rtk1-anki.json — 2200 vol.1 entries (corrected from REMEMBERING_THE_KANJI_VOL_1_.apkg)
 *   data/heisig-rtk3-anki.json — 800 vol.3 integer entries (corrected from REMEMBERING_THE_KANJI_VOL_3.apkg)
 *
 * Both files were cleaned: empty/corrupt keywords filled from hochanh/rtk-search, duplicate keywords
 * resolved, and two vol.3 errors corrected manually (揖 #2362 "collect", 涅 #2421 "black soil").
 * Decimal-suffix entries (variants, e.g. 2226.1) are excluded.
 *
 * Strategy: match by kanji literal.
 *   - Upserts character_meanings row for (character_id, ja, en)
 *   - Sets keyword; preserves existing meanings array (COALESCE)
 *   - Reports kanji not found in our characters table
 *
 * Usage:
 *   npx tsx scripts/import-heisig-keywords.ts [--dry-run]
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

interface Vol1Entry { kanji: string; keyword: string; heisigV6: number; }
interface Vol3Entry { kanji: string; keyword: string; num: string; }

const vol1: Vol1Entry[] = JSON.parse(readFileSync("data/heisig-rtk1-anki.json", "utf-8"));
const vol3raw: Vol3Entry[] = JSON.parse(readFileSync("data/heisig-rtk3-anki.json", "utf-8"));
const vol3 = vol3raw.filter(e => !e.num.includes("."));  // integer entries only

const allEntries = [
  ...vol1.map(e => ({ kanji: e.kanji, keyword: e.keyword, label: `vol.1 #${e.heisigV6}` })),
  ...vol3.map(e => ({ kanji: e.kanji, keyword: e.keyword, label: `vol.3 #${e.num}` })),
];

console.log(`Loaded ${vol1.length} vol.1 + ${vol3.length} vol.3 = ${allEntries.length} total entries`);

if (DRY_RUN) {
  console.log("\nDRY RUN — no database changes will be made.\n");
  allEntries.slice(0, 5).forEach(e => console.log(e));
  process.exit(0);
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  const existing = await db
    .select({ id: schema.characters.id, literal: schema.characters.literal })
    .from(schema.characters);
  const charMap = new Map<string, number>(existing.map(r => [r.literal, r.id]));

  console.log(`DB has ${charMap.size} characters\n`);

  let imported = 0;
  let skipped = 0;

  for (const e of allEntries) {
    const charId = charMap.get(e.kanji);
    if (!charId) {
      skipped++;
      continue;
    }

    await db
      .insert(schema.characterMeanings)
      .values({
        characterId: charId,
        sourceLanguage: "ja",
        meaningLanguage: "en",
        keyword: e.keyword,
        meanings: null,
      })
      .onConflictDoUpdate({
        target: [
          schema.characterMeanings.characterId,
          schema.characterMeanings.sourceLanguage,
          schema.characterMeanings.meaningLanguage,
        ],
        set: {
          keyword: e.keyword,
          meanings: sql`COALESCE(${schema.characterMeanings.meanings}, EXCLUDED.meanings)`,
        },
      });
    imported++;
  }

  await client.end();

  console.log(`Done.`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (not in DB): ${skipped}`);

  if (skipped > 0) {
    console.log(`\nMissing kanji:`);
    for (const e of allEntries) {
      if (!charMap.get(e.kanji)) {
        console.log(`  ${e.kanji}  ${e.label}  "${e.keyword}"`);
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
