/**
 * Analyzes kanji usage in an Aozora ruby format text file.
 *
 * Outputs kanji frequency statistics and checks which ones
 * are missing from our characters database.
 *
 * Usage:
 *   npx tsx scripts/analyze-text.ts <path-to-text-file>
 *   npx tsx scripts/analyze-text.ts data/texts/soseki-natsume/kokoro/kokoro.txt
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/analyze-text.ts <path-to-text-file>");
  process.exit(1);
}

// --- Aozora text cleaning ---

function stripAozoraMarkup(text: string): string {
  // Strip header block (everything up to and including the dashed separator)
  // Aozora files have a symbol guide between two lines of dashes
  const headerEnd = text.indexOf(
    "-------------------------------------------------------\n",
  );
  if (headerEnd !== -1) {
    // Find the second separator (end of header block)
    const secondSep = text.indexOf(
      "-------------------------------------------------------",
      headerEnd + 1,
    );
    if (secondSep !== -1) {
      text = text.slice(
        secondSep + "-------------------------------------------------------".length,
      );
    }
  }

  // Strip footer block — Aozora footers start with lines like:
  // "底本：「...」" or "入力：" or "校正："
  const footerMatch = text.search(/\n底本[：:]/);
  if (footerMatch !== -1) {
    text = text.slice(0, footerMatch);
  }

  // Strip annotator notes ［＃...］
  text = text.replace(/［＃[^］]*］/g, "");

  // Strip ruby readings inside 《》 — keep the base text before it
  text = text.replace(/《[^》]*》/g, "");

  // Strip the ｜ ruby base marker
  text = text.replace(/｜/g, "");

  // Strip remaining ASCII/full-width punctuation and markup
  text = text.replace(/[※〔〕]/g, "");

  return text;
}

// --- Kanji detection ---

function isKanji(cp: number): boolean {
  return (
    (cp >= 0x4e00  && cp <= 0x9fff)  || // CJK Unified Ideographs
    (cp >= 0x3400  && cp <= 0x4dbf)  || // CJK Extension A
    (cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
    (cp >= 0x2a700 && cp <= 0x2b73f) || // CJK Extension C
    (cp >= 0x2b740 && cp <= 0x2b81f) || // CJK Extension D
    (cp >= 0x2b820 && cp <= 0x2ceaf) || // CJK Extension E
    (cp >= 0x2ceb0 && cp <= 0x2ebef) || // CJK Extension F
    (cp >= 0x30000 && cp <= 0x3134f) || // CJK Extension G
    (cp >= 0x31350 && cp <= 0x323af) || // CJK Extension H
    (cp >= 0xf900  && cp <= 0xfaff)     // CJK Compatibility Ideographs
  );
}

function extractKanji(text: string): string[] {
  const result: string[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (isKanji(cp)) {
      result.push(char);
    }
  }
  return result;
}

// --- Main ---

async function main() {
  const raw = readFileSync(filePath, "utf-8");
  const cleaned = stripAozoraMarkup(raw);
  const kanji = extractKanji(cleaned);

  // Count frequencies
  const freq = new Map<string, number>();
  for (const k of kanji) {
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }

  // Sort by frequency descending
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`Total kanji tokens: ${kanji.length}`);
  console.log(`Unique kanji:       ${sorted.length}`);
  console.log("");

  // Check against database
  const sql = postgres(process.env.DATABASE_URL!);
  const dbRows = await sql<{ literal: string }[]>`
    SELECT literal FROM characters
  `;
  const inDb = new Set(dbRows.map((r) => r.literal));

  const missing = sorted.filter(([k]) => !inDb.has(k));
  const present = sorted.filter(([k]) => inDb.has(k));

  console.log(`In database:        ${present.length} unique kanji`);
  console.log(`Missing from DB:    ${missing.length} unique kanji`);
  console.log("");

  // Top 30 by frequency
  console.log("=== Top 30 kanji by frequency ===");
  console.log("Rank  Char  Unicode     Count  In DB");
  console.log("----  ----  ----------  -----  -----");
  for (let i = 0; i < Math.min(30, sorted.length); i++) {
    const [char, count] = sorted[i];
    const cp = char.codePointAt(0)!;
    const code = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    const inDbMark = inDb.has(char) ? "✓" : "✗ MISSING";
    console.log(
      `${String(i + 1).padStart(4)}  ${char}     ${code}  ${String(count).padStart(5)}  ${inDbMark}`,
    );
  }

  if (missing.length > 0) {
    console.log("");
    console.log("=== Kanji missing from database ===");
    console.log("Char  Unicode     Count");
    console.log("----  ----------  -----");
    for (const [char, count] of missing) {
      const cp = char.codePointAt(0)!;
      const code = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
      console.log(`${char}     ${code}  ${String(count).padStart(5)}`);
    }
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
