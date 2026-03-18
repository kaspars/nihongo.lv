/**
 * Pinyin utilities: tone detection and numeric↔diacritic conversion.
 *
 * Tone mark placement follows standard pinyin rules:
 *   1. If syllable has 'a' or 'e', mark goes there.
 *   2. If syllable has 'ou', mark goes on 'o'.
 *   3. Otherwise mark goes on the last vowel.
 *
 * 'v' is accepted as an alternative input form for 'ü' (e.g., lv4 → lǜ).
 */

const TONE_MARKS: Record<string, [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "ü", "v"]);

/**
 * Strip pinyin tone marks from a string (e.g., "zhōng" → "zhong", "lǖ" → "lü").
 * Preserves the umlaut dieresis (U+0308) so that ü is not collapsed to u.
 */
export function stripTones(s: string): string {
  // Decompose, remove all combining marks except dieresis (U+0308 = ü's dots), recompose.
  return s.normalize("NFD").replace(/[\u0300-\u0307\u0309-\u036f]/g, "").normalize("NFC");
}

/** Returns true if the string contains pinyin tone diacritics. */
export function hasToneMarks(s: string): boolean {
  return stripTones(s) !== s;
}

/**
 * Returns true if the string contains numeric tone notation.
 * Matches a vowel-containing cluster followed by a digit 1–4
 * (e.g., "zhong1", "cha2", "ni3 hao3").
 */
export function hasNumericTones(s: string): boolean {
  return /[aeiouüvAEIOUÜV][a-züvA-ZÜV]*[1-4]/.test(s);
}

/** Apply a tone (1–4) to a single syllable string. */
function applySyllableTone(syllable: string, tone: number): string {
  const lower = syllable.toLowerCase();

  // Rule 1: 'a' or 'e' gets the mark
  const aeIdx = lower.search(/[ae]/);
  if (aeIdx >= 0) {
    const marks = TONE_MARKS[lower[aeIdx]];
    return syllable.slice(0, aeIdx) + marks[tone - 1] + syllable.slice(aeIdx + 1);
  }

  // Rule 2: 'ou' → mark on 'o'
  const ouIdx = lower.indexOf("ou");
  if (ouIdx >= 0) {
    const marks = TONE_MARKS["o"];
    return syllable.slice(0, ouIdx) + marks[tone - 1] + syllable.slice(ouIdx + 1);
  }

  // Rule 3: mark on the last vowel
  let lastVowelIdx = -1;
  for (let i = lower.length - 1; i >= 0; i--) {
    if (VOWELS.has(lower[i])) { lastVowelIdx = i; break; }
  }
  if (lastVowelIdx >= 0) {
    const marks = TONE_MARKS[lower[lastVowelIdx]];
    if (marks) {
      return syllable.slice(0, lastVowelIdx) + marks[tone - 1] + syllable.slice(lastVowelIdx + 1);
    }
  }

  return syllable;
}

/**
 * Convert numeric tone notation to diacritic pinyin.
 * Handles single and multi-syllable input, including spaces.
 *
 * Examples:
 *   "zhong1"    → "zhōng"
 *   "cha2"      → "chá"
 *   "ni3 hao3"  → "nǐ hǎo"
 *   "han4 yu3"  → "hàn yǔ"
 *   "lv4"       → "lǜ"
 */
export function numericToToned(input: string): string {
  return input.replace(
    /([a-züvA-ZÜV]*[aeiouüvAEIOUÜV][a-züvA-ZÜV]*)([1-4])/g,
    (_, syllable: string, toneNum: string) =>
      applySyllableTone(syllable, parseInt(toneNum)),
  );
}
