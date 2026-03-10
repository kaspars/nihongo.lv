/**
 * Extracts vocabulary and sentence data from the JK HSK Anki decks
 * (HSK 1–6) into a single structured JSON file for reference.
 *
 * Fields extracted per note:
 *   Key, Simplified, Traditional, Pinyin (tones), Meaning,
 *   Part of speech, Homophone, Homograph,
 *   SentenceSimplified, SentenceTraditional, SentencePinyin, SentenceMeaning
 *
 * Audio, image, cloze, and numeric pinyin fields are omitted.
 *
 * Usage:
 *   npx tsx scripts/extract-anki-hsk.ts
 *
 * Output: data/anki-hsk-vocab.json
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";

const DECKS = [
  { level: 1, file: "data/anki/HSK_1_-_JK.apkg" },
  { level: 2, file: "data/anki/HSK_2_-_JK.apkg" },
  { level: 3, file: "data/anki/HSK_3_-_JK.apkg" },
  { level: 4, file: "data/anki/HSK_4_-_JK.apkg" },
  { level: 5, file: "data/anki/HSK_5_-_JK.apkg" },
  { level: 6, file: "data/anki/HSK_6_-_JK.apkg" },
];

// Field indexes in the note flds column (tab-separated by ASCII 0x1F)
const F = {
  KEY: 0,
  SIMPLIFIED: 1,
  TRADITIONAL: 2,
  PINYIN: 3,        // tone marks (Pinyin.1)
  MEANING: 5,
  POS: 6,           // part of speech
  HOMOPHONE: 8,
  HOMOGRAPH: 9,
  SENTENCE_ZH: 10,  // SentenceSimplified
  SENTENCE_TW: 11,  // SentenceTraditional
  SENTENCE_PY: 14,  // SentencePinyin.1
  SENTENCE_EN: 16,  // SentenceMeaning
};

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

interface AnkiEntry {
  hskLevel: number;
  simplified: string;
  traditional: string;
  pinyin: string;
  meaning: string;
  pos: string | null;
  homophone: string | null;
  homograph: string | null;
  sentence: {
    simplified: string;
    traditional: string;
    pinyin: string;
    meaning: string;
  } | null;
}

function extractDeck(level: number, apkgPath: string): AnkiEntry[] {
  // Unzip to a temp dir and query the SQLite DB
  const tmpDir = `/tmp/anki-extract-hsk${level}`;
  execSync(`rm -rf ${tmpDir} && mkdir -p ${tmpDir} && unzip -q "${apkgPath}" collection.anki2 -d ${tmpDir}`);

  const rows = execSync(
    `sqlite3 ${tmpDir}/collection.anki2 "SELECT flds FROM notes ORDER BY id"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString().split("\n").filter(Boolean);

  const SEP = "\x1f";
  const entries: AnkiEntry[] = [];

  for (const row of rows) {
    const f = row.split(SEP);
    if (f.length < 17) continue;

    const simplified = stripHtml(f[F.SIMPLIFIED]);
    const traditional = stripHtml(f[F.TRADITIONAL]);
    const pinyin = stripHtml(f[F.PINYIN]);
    const meaning = stripHtml(f[F.MEANING]);
    if (!simplified) continue;

    const sentZh = stripHtml(f[F.SENTENCE_ZH]);
    const sentTw = stripHtml(f[F.SENTENCE_TW]);
    const sentPy = stripHtml(f[F.SENTENCE_PY]);
    const sentEn = stripHtml(f[F.SENTENCE_EN]);

    entries.push({
      hskLevel: level,
      simplified,
      traditional,
      pinyin,
      meaning,
      pos: stripHtml(f[F.POS]) || null,
      homophone: stripHtml(f[F.HOMOPHONE]) || null,
      homograph: stripHtml(f[F.HOMOGRAPH]) || null,
      sentence: sentZh ? { simplified: sentZh, traditional: sentTw, pinyin: sentPy, meaning: sentEn } : null,
    });
  }

  execSync(`rm -rf ${tmpDir}`);
  return entries;
}

const all: AnkiEntry[] = [];

for (const { level, file } of DECKS) {
  process.stdout.write(`Extracting HSK ${level}...`);
  const entries = extractDeck(level, file);
  all.push(...entries);
  console.log(` ${entries.length} entries (${entries.filter(e => e.sentence).length} with sentences)`);
}

const outPath = "data/anki-hsk-vocab.json";
writeFileSync(outPath, JSON.stringify(all, null, 2), "utf-8");
console.log(`\nTotal: ${all.length} entries`);
console.log(`Saved to: ${outPath}`);
