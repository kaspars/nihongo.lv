/**
 * Imports Heisig & Richardson hanzi keywords into the database.
 *
 * Sources:
 *   data/heisig-rsh-simplified.json  — 3018 simplified hanzi (RSH books 1 & 2)
 *   data/heisig-rth-traditional.json — 3035 traditional hanzi (RTH books 1 & 2)
 *
 * For each entry:
 *   - Upserts `characters` (inserts if not yet present)
 *   - Upserts `simplified_hanzi.sort_heisig` or `traditional_hanzi` row
 *   - Upserts `character_meanings` (zhs/en or zht/en) with keyword
 *
 * Usage:
 *   npx tsx scripts/import-heisig-hanzi.ts [--dry-run]
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

interface HanziEntry {
  num: number;
  hanzi: string;
  simplified?: string;
  keyword: string;
}

const simplified: HanziEntry[] = JSON.parse(readFileSync("data/heisig-rsh-simplified.json", "utf-8"));
const traditional: HanziEntry[] = JSON.parse(readFileSync("data/heisig-rth-traditional.json", "utf-8"));

console.log(`Simplified: ${simplified.length} entries`);
console.log(`Traditional: ${traditional.length} entries`);

if (DRY_RUN) {
  console.log("\nDRY RUN — no database changes will be made.\n");
  console.log("Simplified sample:", simplified.slice(0, 3));
  console.log("Traditional sample:", traditional.slice(0, 3));
  process.exit(0);
}

async function importSet(
  db: ReturnType<typeof drizzle>,
  client: ReturnType<typeof postgres>,
  entries: HanziEntry[],
  opts: {
    label: string;
    sourceLanguage: "zhs" | "zht";
    upsertLangTable: (characterId: number, num: number) => Promise<void>;
  }
) {
  const { label, sourceLanguage, upsertLangTable } = opts;

  // Load existing characters
  const existing = await db
    .select({ id: schema.characters.id, literal: schema.characters.literal })
    .from(schema.characters);
  const charMap = new Map<string, number>(existing.map(r => [r.literal, r.id]));

  let inserted = 0, upserted = 0, skipped = 0;
  const missing: HanziEntry[] = [];

  for (const e of entries) {
    let charId = charMap.get(e.hanzi);

    if (!charId) {
      // Character not yet in DB — insert it
      const cp = e.hanzi.codePointAt(0)!;
      await db
        .insert(schema.characters)
        .values({ id: cp, literal: e.hanzi })
        .onConflictDoNothing();
      charId = cp;
      charMap.set(e.hanzi, cp);
      inserted++;
    }

    // Upsert language-specific table (simplified_hanzi or traditional_hanzi)
    await upsertLangTable(charId, e.num);

    // Upsert character_meanings keyword
    await db
      .insert(schema.characterMeanings)
      .values({
        characterId: charId,
        sourceLanguage,
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

    upserted++;
  }

  console.log(`\n${label}:`);
  console.log(`  New characters inserted: ${inserted}`);
  console.log(`  Keywords upserted:       ${upserted}`);
  if (missing.length) {
    console.log(`  Skipped: ${missing.length}`);
    missing.forEach(e => console.log(`    #${e.num} ${e.hanzi} "${e.keyword}"`));
  }
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  await importSet(db, client, simplified, {
    label: "Simplified (RSH)",
    sourceLanguage: "zhs",
    upsertLangTable: async (characterId, num) => {
      await db
        .insert(schema.simplifiedHanzi)
        .values({ characterId, sortHeisig: num })
        .onConflictDoUpdate({
          target: schema.simplifiedHanzi.characterId,
          set: { sortHeisig: num },
        });
    },
  });

  await importSet(db, client, traditional, {
    label: "Traditional (RTH)",
    sourceLanguage: "zht",
    upsertLangTable: async (characterId, num) => {
      await db
        .insert(schema.traditionalHanzi)
        .values({ characterId, sortHeisig: num })
        .onConflictDoUpdate({
          target: schema.traditionalHanzi.characterId,
          set: { sortHeisig: num },
        });
    },
  });

  await client.end();
  console.log("\nDone.");
}

main().catch(err => { console.error(err); process.exit(1); });
