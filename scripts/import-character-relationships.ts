/**
 * Imports simplified↔traditional character relationships from Unihan_Variants.txt.
 *
 * Source: Unicode Unihan database, kTraditionalVariant field.
 * Format: U+XXXX\tkTraditionalVariant\tU+YYYY [U+ZZZZ ...]
 * Direction convention: from = simplified, to = traditional (matches our schema).
 * Self-references (char lists itself as own traditional form) are skipped.
 * Only pairs where both characters exist in our characters table are imported.
 *
 * Usage:
 *   npx tsx scripts/import-character-relationships.ts [--dry-run]
 */

import { readFileSync } from "fs";
import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const VARIANTS_FILE = "tmp/Unihan_Variants.txt";

function hexToCodepoint(s: string): number {
  return parseInt(s.replace("U+", ""), 16);
}

function cpToDisplay(cp: number): string {
  const hex = cp.toString(16).toUpperCase().padStart(4, "0");
  try { return `U+${hex} ${String.fromCodePoint(cp)}`; }
  catch { return `U+${hex}`; }
}

// --- Parse kTraditionalVariant lines ---

const pairs: Array<{ from: number; to: number }> = [];

for (const line of readFileSync(VARIANTS_FILE, "utf-8").split("\n")) {
  if (!line.startsWith("U+")) continue;
  const [fromHex, field, targets] = line.split("\t");
  if (field !== "kTraditionalVariant" || !targets) continue;

  const fromCp = hexToCodepoint(fromHex);
  for (const t of targets.trim().split(" ")) {
    const toCp = hexToCodepoint(t);
    if (toCp !== fromCp) pairs.push({ from: fromCp, to: toCp });
  }
}

console.log(`Unihan kTraditionalVariant pairs: ${pairs.length}`);

if (DRY_RUN) {
  console.log("\nSample pairs (simplified → traditional):");
  pairs.slice(0, 20).forEach(p =>
    console.log(`  ${cpToDisplay(p.from)}  →  ${cpToDisplay(p.to)}`)
  );
  // Show a multi-variant example
  const multi = pairs.filter(p => pairs.filter(q => q.from === p.from).length > 1);
  if (multi.length) {
    const ex = multi[0].from;
    const variants = pairs.filter(p => p.from === ex);
    console.log(`\nMulti-variant example: ${cpToDisplay(ex)} has ${variants.length} traditional forms:`);
    variants.forEach(p => console.log(`  → ${cpToDisplay(p.to)}`));
  }
  process.exit(0);
}

// --- Import ---

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  const existingRows = await db.execute(sql`SELECT id FROM characters`);
  const existingIds = new Set((existingRows as { id: number }[]).map(r => r.id));
  console.log(`Characters in DB: ${existingIds.size}`);

  const filtered = pairs.filter(p => existingIds.has(p.from) && existingIds.has(p.to));
  const skipped  = pairs.length - filtered.length;
  console.log(`Pairs with both chars in DB: ${filtered.length}  (skipped ${skipped} — chars not in our DB)`);

  let inserted = 0, conflicts = 0;
  for (const { from, to } of filtered) {
    const result = await db
      .insert(schema.characterRelationships)
      .values({ fromCharacterId: from, toCharacterId: to, type: "simplified_traditional" })
      .onConflictDoNothing();
    if ((result as any).rowCount === 0) conflicts++; else inserted++;
  }

  await client.end();

  console.log(`\nDone.`);
  console.log(`  inserted:  ${inserted}`);
  console.log(`  conflicts: ${conflicts} (already existed)`);
}

main().catch(err => { console.error(err); process.exit(1); });
