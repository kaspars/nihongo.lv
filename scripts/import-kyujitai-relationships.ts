/**
 * Imports shinjitai↔kyūjitai character relationships from KANJIDIC2.
 *
 * Source: KANJIDIC2 XML file (data/kanjidic2.xml).
 * Method: Characters with grade 1–8 (modern Jōyō kanji) that have a
 *   var_type="jis208" variant pointing to a grade 10 character (kyūjitai)
 *   are treated as shinjitai↔kyūjitai pairs.
 * Direction convention: from = shinjitai (modern), to = kyūjitai (old form).
 * Only pairs where both characters exist in our characters table are imported.
 *
 * Usage:
 *   npx tsx scripts/import-kyujitai-relationships.ts [--dry-run]
 */

import { readFileSync } from "fs";
import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const KANJIDIC_PATH = "data/kanjidic2.xml";

function cpToDisplay(cp: number): string {
  const hex = cp.toString(16).toUpperCase().padStart(4, "0");
  try {
    return `U+${hex} ${String.fromCodePoint(cp)}`;
  } catch {
    return `U+${hex}`;
  }
}

// --- Parse KANJIDIC2 ---

interface KanjidicEntry {
  codepoint: number;
  grade: number | null;
  jis208: string | null;
  jis208Variants: string[];
}

function parseKanjidic(xmlContent: string): KanjidicEntry[] {
  const entries: KanjidicEntry[] = [];
  const charRegex = /<character>([\s\S]*?)<\/character>/g;
  let m;

  while ((m = charRegex.exec(xmlContent)) !== null) {
    const block = m[1];

    const litMatch = block.match(/<literal>([\s\S]*?)<\/literal>/);
    if (!litMatch) continue;
    const codepoint = litMatch[1].codePointAt(0)!;

    const jis208Match = block.match(/<cp_value cp_type="jis208">(.*?)<\/cp_value>/);
    const gradeMatch = block.match(/<grade>(\d+)<\/grade>/);

    const jis208Variants: string[] = [];
    const varRegex = /<variant var_type="jis208">(.*?)<\/variant>/g;
    let vm;
    while ((vm = varRegex.exec(block)) !== null) {
      jis208Variants.push(vm[1]);
    }

    entries.push({
      codepoint,
      grade: gradeMatch ? parseInt(gradeMatch[1]) : null,
      jis208: jis208Match ? jis208Match[1] : null,
      jis208Variants,
    });
  }

  return entries;
}

const xmlContent = readFileSync(KANJIDIC_PATH, "utf-8");
const entries = parseKanjidic(xmlContent);

// Build JIS code → codepoint map and codepoint → grade map
const jisToCodepoint = new Map<string, number>();
const gradeMap = new Map<number, number>();

for (const entry of entries) {
  if (entry.jis208) jisToCodepoint.set(entry.jis208, entry.codepoint);
  if (entry.grade !== null) gradeMap.set(entry.codepoint, entry.grade);
}

// Find shinjitai (grade 1–8) → kyūjitai (grade 10) pairs
const pairs: Array<{ from: number; to: number }> = [];

for (const entry of entries) {
  const fromGrade = gradeMap.get(entry.codepoint);
  if (!fromGrade || fromGrade > 8) continue; // only modern Jōyō kanji

  for (const jis of entry.jis208Variants) {
    const toCp = jisToCodepoint.get(jis);
    if (!toCp) continue;
    if (gradeMap.get(toCp) === 10) {
      pairs.push({ from: entry.codepoint, to: toCp });
    }
  }
}

console.log(`KANJIDIC2 shinjitai↔kyūjitai pairs: ${pairs.length}`);

if (DRY_RUN) {
  console.log("\nSample pairs (shinjitai → kyūjitai):");
  pairs.slice(0, 20).forEach((p) =>
    console.log(`  ${cpToDisplay(p.from)}  →  ${cpToDisplay(p.to)}`)
  );
  process.exit(0);
}

// --- Import ---

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  const existingRows = await db.execute(sql`SELECT id FROM characters`);
  const existingIds = new Set((existingRows as { id: number }[]).map((r) => r.id));
  console.log(`Characters in DB: ${existingIds.size}`);

  const filtered = pairs.filter(
    (p) => existingIds.has(p.from) && existingIds.has(p.to)
  );
  const skipped = pairs.length - filtered.length;
  console.log(
    `Pairs with both chars in DB: ${filtered.length}  (skipped ${skipped} — chars not in our DB)`
  );

  if (skipped > 0) {
    const missing = pairs.filter(
      (p) => !existingIds.has(p.from) || !existingIds.has(p.to)
    );
    console.log("Missing chars:");
    missing.forEach((p) => {
      const fromMissing = !existingIds.has(p.from);
      const toMissing = !existingIds.has(p.to);
      console.log(
        `  ${cpToDisplay(p.from)} ${fromMissing ? "[MISSING]" : ""}  →  ${cpToDisplay(p.to)} ${toMissing ? "[MISSING]" : ""}`
      );
    });
  }

  let inserted = 0,
    conflicts = 0;
  for (const { from, to } of filtered) {
    const result = await db
      .insert(schema.characterRelationships)
      .values({ fromCharacterId: from, toCharacterId: to, type: "shinjitai_kyujitai" })
      .onConflictDoNothing();
    if ((result as any).rowCount === 0) conflicts++;
    else inserted++;
  }

  await client.end();

  console.log(`\nDone.`);
  console.log(`  inserted:  ${inserted}`);
  console.log(`  conflicts: ${conflicts} (already existed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
