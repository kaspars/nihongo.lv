/**
 * Parses "Japanese Sentence Patterns" books (N5–N1) by Noboru Akuzawa.
 *
 * Strategy: use `Meaning:` lines as pattern boundaries — every complete
 * pattern entry has exactly one. Parse forward from each anchor to extract
 * Formation, Japanese sentences, vocabulary, and English sentences.
 * Stop at ひらがな (Hiragana) section which we skip along with Romaji.
 *
 * N5 has a handful of early patterns without Meaning/Formation — those are
 * captured by a secondary pass using 日本語 as an anchor.
 *
 * Usage:
 *   npx tsx scripts/parse-sentence-patterns.ts [--level N3] [--dry-run]
 *
 * Output:
 *   data/sentence-patterns/all.json        — all patterns
 *   data/sentence-patterns/flagged.json    — patterns needing review
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";

const BOOKS = [
  { level: "N5", file: "tmp/sentence_patterns/N5.pdf" },
  { level: "N4", file: "tmp/sentence_patterns/N4.pdf" },
  { level: "N3", file: "tmp/sentence_patterns/N3.pdf" },
  { level: "N2", file: "tmp/sentence_patterns/N2.pdf" },
  { level: "N1", file: "tmp/sentence_patterns/N1.pdf" },
];

// --- Section marker detectors ---
const isJapanese  = (l: string) => /日本語.*Japanes/.test(l); // "Japanes" handles truncated PDF lines
const isEnglish   = (l: string) => /英語.*English/.test(l);
const isHiragana  = (l: string) => /^ひらがな/.test(l.trim());
const isRomaji    = (l: string) => /^ローマ/.test(l.trim()) || l.trim() === "字";
const isVocab     = (l: string) =>
  /ことばと/.test(l) || /Words\s*&\s*Expressions/.test(l) || /表現\s*\/\s*Words/.test(l);
// "Meaning:" appears in 3 forms:
//   1. "Meaning:"          — standalone line
//   2. "Meaning: text..."  — inline meaning on same line
//   3. "header textMeaning:" — header merged with anchor (rare)
const isMeaning   = (l: string) =>
  /^Meaning:/.test(l.trim()) || l.trimEnd().endsWith("Meaning:");
const isFormation = (l: string) => l.trim() === "Formation:";

// Romaji sentences look like: "(1) Kore wa ..."
// Some N1 sentences use fullwidth ）(U+FF09) instead of ASCII ), so accept both.
const isRomajiSentence = (l: string) => /^\(\d+\s*[)）]\s+[A-Za-z]/.test(l.trim());
const isNumbered  = (l: string) => /^\(\d+\s*[)）]/.test(l.trim());

// Boilerplate lines to ignore everywhere
const isBoilerplate = (l: string) =>
  /^■/.test(l.trim()) ||
  /^・/.test(l.trim()) ||   // bullet points in the free-report ad section
  /^Click here/.test(l.trim()) ||
  /^This report is written/.test(l.trim()) ||
  /^I have 2 learning methods/.test(l.trim()) ||
  /^Sentence Pattern Method/.test(l.trim()) ||
  /^Read-aloud Method/.test(l.trim());

// ---

interface VocabEntry { word: string; reading: string; meaning: string; }
interface SentencePair { ja: string; en: string; }
interface Pattern {
  jlpt: string;
  header: string;
  meaning: string;
  formation: string;
  sentences: SentencePair[];
  vocabulary: VocabEntry[];
  flags: string[];
}

// Returns true if a line contains no Japanese characters — likely romaji or English prose
const isLatinOnly = (l: string) =>
  l.trim().length > 0 &&
  !/[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/.test(l);

// True if line has at least one Japanese character (hiragana, katakana, or CJK)
const hasJapanese = (l: string) =>
  /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/.test(l);

// Extract header lines going backward from a line index.
// Headers are 1–2 lines: always starts with Japanese, optionally followed by
// a wrapped English gloss continuation (Latin-only). Romaji prose from the
// previous pattern's romaji section must be excluded.
function extractHeader(lines: string[], upTo: number): string {
  // Scan backward up to 8 lines, collecting up to 2 non-empty content lines.
  // A Latin-only line is included only if a Japanese line precedes it (wrapped gloss).
  // Stop at section markers, boilerplate, or romaji sentence lines.
  const parts: string[] = [];
  let blanksAfterContent = 0;

  for (let j = upTo - 1; j >= Math.max(0, upTo - 12); j--) {
    const t = lines[j].trim();

    if (t === "") {
      if (parts.length > 0) blanksAfterContent++;
      // Allow up to 1 blank between header parts (e.g. wrapped gloss)
      if (blanksAfterContent > 1) break;
      continue;
    }

    blanksAfterContent = 0;

    // Always stop at section markers and boilerplate
    if (
      isRomajiSentence(t) || isNumbered(t) ||
      isRomaji(t) || isHiragana(t) || isEnglish(t) ||
      isJapanese(t) || isBoilerplate(t) ||
      /^■/.test(t) || t.startsWith("I believe this method")
    ) break;

    if (isLatinOnly(t)) {
      // Latin-only: include only if a Japanese line exists somewhere before it
      // (i.e. it's an English gloss continuation, not romaji from previous pattern).
      // N2/N1 headers are often fragmented: Japanese kanji on one line, then several
      // Latin gloss fragments separated by blanks. Scan the full header window to
      // find Japanese, stopping at romaji sentence markers from the previous pattern.
      let prevHasJapanese = false;
      for (let k = j - 1; k >= Math.max(0, upTo - 12); k--) {
        const prev = lines[k].trim();
        if (prev === "") continue;
        if (isBoilerplate(prev) || isRomajiSentence(prev) || isNumbered(prev)) break;
        if (hasJapanese(prev)) { prevHasJapanese = true; break; }
      }
      if (prevHasJapanese) {
        parts.unshift(t);
      } else {
        break; // romaji prose from previous pattern — stop
      }
      continue;
    }

    parts.unshift(t);
    if (parts.length >= 2) break;
  }
  return parts.join(" ").trim();
}

// Parse body from startIdx (line after Meaning:) until stopIdx (next Meaning: or EOF).
function parseBody(lines: string[], startIdx: number, stopIdx: number) {
  type BodyState = "MEANING" | "FORMATION" | "JAPANESE" | "VOCAB" | "ENGLISH" | "DONE";
  let state: BodyState = "MEANING";

  const meaningParts: string[] = [];
  const formationParts: string[] = [];
  const jaSentences = new Map<number, string>();
  const enSentences = new Map<number, string>();
  const vocabulary: VocabEntry[] = [];
  let lastJaNum = -1;
  let lastEnNum = -1;

  for (let j = startIdx; j < stopIdx; j++) {
    const line = lines[j];
    const t = line.trim();

    if (state === "DONE") break;

    // Section transitions
    if (isFormation(t)) { state = "FORMATION"; continue; }
    if (isJapanese(t))  {
      state = "JAPANESE";
      // Handle sentence merged onto the same line as the section header
      const inlineJa = t.match(/\((\d+)[)）]\s*(.+)$/);
      if (inlineJa) { lastJaNum = parseInt(inlineJa[1]); jaSentences.set(lastJaNum, inlineJa[2]); }
      continue;
    }
    if (isVocab(t))     { state = "VOCAB";     continue; }
    if (isEnglish(t))   { state = "ENGLISH";   continue; }
    if (isHiragana(t) || isRomaji(t)) { state = "DONE"; break; }
    // Implicit English transition: numbered Latin sentence in VOCAB state (no section header)
    if (state === "VOCAB" && isRomajiSentence(t)) { state = "ENGLISH"; /* fall through */ }
    // Noise lines to skip
    if (t === "ことばと" || /^表現$/.test(t) || /^\/\s*Words/.test(t)) continue;

    switch (state) {
      case "MEANING":
        if (t !== "") meaningParts.push(t);
        break;

      case "FORMATION":
        if (t !== "") formationParts.push(t);
        break;

      case "JAPANESE": {
        const m = t.match(/^\((\d+)\s*[)）]\s*(.+)$/);
        if (m) {
          lastJaNum = parseInt(m[1]);
          jaSentences.set(lastJaNum, m[2]);
        } else if (lastJaNum >= 0 && t !== "") {
          // Continuation of wrapped sentence
          jaSentences.set(lastJaNum, (jaSentences.get(lastJaNum) ?? "") + t);
        }
        break;
      }

      case "VOCAB": {
        const m = t.match(/^(.+?)【(.+?)】\s*(.*)$/);
        if (m) {
          vocabulary.push({ word: m[1].trim(), reading: m[2].trim(), meaning: m[3].trim() });
        } else if (t !== "" && vocabulary.length > 0) {
          // Bare definition line with no bracket (e.g. "びくともしない to feel no fear")
          const bare = t.match(/^([^\s【]+(?:\s[^\s【]+)*)\s+(.+)$/);
          if (bare && !/^\d/.test(bare[1])) {
            vocabulary.push({ word: bare[1].trim(), reading: "", meaning: bare[2].trim() });
          }
        }
        break;
      }

      case "ENGLISH": {
        const m = t.match(/^\((\d+)\s*[)）]\s*(.+)$/);
        if (m) {
          lastEnNum = parseInt(m[1]);
          enSentences.set(lastEnNum, m[2]);
        } else if (lastEnNum >= 0 && t !== "") {
          // Continuation
          enSentences.set(lastEnNum, (enSentences.get(lastEnNum) ?? "") + " " + t);
        }
        break;
      }
    }
  }

  return { meaningParts, formationParts, jaSentences, enSentences, vocabulary };
}

function parseBook(level: string, pdfPath: string): Pattern[] {
  const text = execSync(`pdftotext "${pdfPath}" -`, {
    maxBuffer: 50 * 1024 * 1024,
  }).toString();
  const lines = text.split("\n");

  // Find all "Meaning:" line positions
  const meaningIdxs = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => isMeaning(l))
    .map(({ i }) => i);

  const patterns: Pattern[] = [];

  for (let mi = 0; mi < meaningIdxs.length; mi++) {
    const mIdx = meaningIdxs[mi];
    const nextMIdx = meaningIdxs[mi + 1] ?? lines.length;
    const mLine = lines[mIdx].trim();

    // Extract header — handle merged "header textMeaning:" on same line
    let header: string;
    if (mLine.endsWith("Meaning:") && mLine !== "Meaning:") {
      // Header is everything before "Meaning:" on the same line
      header = mLine.slice(0, mLine.lastIndexOf("Meaning:")).trim();
    } else {
      header = extractHeader(lines, mIdx);
    }

    // Extract inline meaning text from "Meaning: text" form
    const inlineMeaning = mLine.startsWith("Meaning:") && mLine !== "Meaning:"
      ? mLine.replace(/^Meaning:\s*/, "").trim()
      : "";

    const { meaningParts, formationParts, jaSentences, enSentences, vocabulary } =
      parseBody(lines, mIdx + 1, nextMIdx);

    // Prepend inline meaning if present
    if (inlineMeaning) meaningParts.unshift(inlineMeaning);

    // Build sentence pairs (sorted by sentence number)
    const sentences: SentencePair[] = [...jaSentences.entries()]
      .sort(([a], [b]) => a - b)
      .map(([num, ja]) => ({ ja, en: enSentences.get(num) ?? "" }));

    // Consistency flags
    const flags: string[] = [];
    if (header === "") flags.push("no_header");
    if (sentences.length === 0) flags.push("no_sentences");
    if (jaSentences.size !== enSentences.size)
      flags.push(`count_mismatch:ja=${jaSentences.size},en=${enSentences.size}`);
    sentences.forEach(({ en }, i) => {
      if (en === "") flags.push(`missing_en:sentence_${i + 1}`);
    });

    patterns.push({
      jlpt: level,
      header,
      meaning: meaningParts.join(" ").trim(),
      formation: formationParts.join("\n").trim(),
      sentences,
      vocabulary,
      flags,
    });
  }

  return patterns;
}

// --- Main ---

const levelArg = process.argv.find(a => a.startsWith("--level="))?.split("=")[1];
const dryRun = process.argv.includes("--dry-run");

const books = levelArg ? BOOKS.filter(b => b.level === levelArg) : BOOKS;
if (books.length === 0) {
  console.error(`Unknown level: ${levelArg}`);
  process.exit(1);
}

const all: Pattern[] = [];

for (const { level, file } of books) {
  process.stdout.write(`Parsing ${level}...`);
  const patterns = parseBook(level, file);
  const flagged = patterns.filter(p => p.flags.length > 0);
  console.log(` ${patterns.length} patterns, ${flagged.length} flagged`);
  all.push(...patterns);
}

// Stats
const flagged = all.filter(p => p.flags.length > 0);
console.log(`\nTotal: ${all.length} patterns, ${flagged.length} flagged`);

// Flag summary
const flagTypes = new Map<string, number>();
for (const p of flagged) {
  for (const f of p.flags) {
    const key = f.split(":")[0];
    flagTypes.set(key, (flagTypes.get(key) ?? 0) + 1);
  }
}
console.log("Flag breakdown:");
for (const [k, v] of [...flagTypes.entries()].sort(([,a],[,b]) => b - a)) {
  console.log(`  ${k}: ${v}`);
}

if (!dryRun) {
  mkdirSync("data/sentence-patterns", { recursive: true });
  writeFileSync("data/sentence-patterns/all.json", JSON.stringify(all, null, 2), "utf-8");
  writeFileSync("data/sentence-patterns/flagged.json", JSON.stringify(flagged, null, 2), "utf-8");
  console.log("\nSaved to data/sentence-patterns/");
}
