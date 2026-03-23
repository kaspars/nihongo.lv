/**
 * Parser for Aozora Bunko ruby text format.
 *
 * Aozora ruby markup:
 *   私《わたくし》        — implicit base: trailing kanji run before 《
 *   ｜麦藁帽《むぎわらぼう》 — explicit base: text between ｜ and 《
 *   ［＃...］             — annotator directives (never rendered)
 *   ※                   — gaiji placeholder (kept as-is)
 *   ／＼                 — iteration mark: repeat preceding kana/kanji unit
 *   ／″＼                — voiced iteration mark: repeat with dakuten on first char
 */

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "ruby"; base: string; reading: string }

export interface Heading {
  level: 1 | 2 | 3
  text: string
}

export interface Paragraph {
  nodes: InlineNode[]
}

export interface Section {
  heading: Heading | null
  paragraphs: Paragraph[]
}

export interface AozoraDocument {
  sections: Section[]
}

// CJK Unified Ideographs and common extension ranges
export function isKanji(char: string): boolean {
  const cp = char.codePointAt(0)!
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
    (cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
    (cp >= 0x2a700 && cp <= 0x2b73f) || // CJK Extension C
    (cp >= 0x2b740 && cp <= 0x2b81f) || // CJK Extension D
    (cp >= 0x2b820 && cp <= 0x2ceaf) || // CJK Extension E
    (cp >= 0x2ceb0 && cp <= 0x2ebef) || // CJK Extension F
    (cp >= 0x30000 && cp <= 0x3134f) || // CJK Extension G
    (cp >= 0x31350 && cp <= 0x323af) || // CJK Extension H
    (cp >= 0xf900 && cp <= 0xfaff) // CJK Compatibility Ideographs
  )
}

function isKana(char: string): boolean {
  const cp = char.codePointAt(0)!
  return (
    (cp >= 0x3040 && cp <= 0x309f) || // hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) // katakana
  )
}


// Maps kana to their dakuten (voiced) equivalents.
const DAKUTEN: Record<string, string> = {
  // hiragana
  か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご",
  さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ",
  た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど",
  は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ",
  // katakana
  カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
  サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
  タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
  ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ",
}

function addDakuten(char: string): string {
  return DAKUTEN[char] ?? char
}

const HEADER_SEP = "-------------------------------------------------------"

/**
 * Strip the Aozora symbol-guide header block.
 * The header is bracketed by two lines of 55 dashes.
 */
export function stripHeader(raw: string): string {
  const first = raw.indexOf(HEADER_SEP)
  if (first === -1) return raw
  const second = raw.indexOf(HEADER_SEP, first + HEADER_SEP.length)
  if (second === -1) return raw
  return raw.slice(second + HEADER_SEP.length)
}

/**
 * Strip the Aozora footer block (source/copyright info starting with 底本：).
 */
export function stripFooter(text: string): string {
  const idx = text.search(/\n底本[：:]/)
  return idx === -1 ? text : text.slice(0, idx)
}

/**
 * Detect whether a line is a heading directive.
 * Returns level (1=大, 2=中, 3=小) and the heading text, or null.
 *
 * Example: ［＃２字下げ］上　先生と私［＃「上　先生と私」は大見出し］
 * → { level: 1, text: "上　先生と私" }
 */
export function detectHeading(line: string): Heading | null {
  const m = line.match(/［＃「([^」]*)」は(大|中|小)見出し］/)
  if (!m) return null
  const levelMap: Record<string, 1 | 2 | 3> = { 大: 1, 中: 2, 小: 3 }
  return { level: levelMap[m[2]], text: m[1] }
}

/**
 * Parse a single line of Aozora text into inline nodes.
 *
 * Handles:
 *   - Implicit ruby: kanji《reading》 — base is trailing kanji run before 《
 *   - Explicit ruby: ｜base《reading》 — base is text between ｜ and 《
 *   - Annotator directives ［＃...］ — stripped entirely
 *   - Gaiji marker ※ — kept as plain text character
 */
export function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const chars = [...line] // Unicode-safe iteration
  let buf: string[] = []
  let i = 0

  function flushBuf(splitAt?: number) {
    const text =
      splitAt !== undefined
        ? buf.slice(0, splitAt).join("")
        : buf.join("")
    if (text) nodes.push({ type: "text", text })
    buf = splitAt !== undefined ? buf.slice(splitAt) : []
  }

  while (i < chars.length) {
    const ch = chars[i]

    // Strip annotator directives ［＃...］
    if (ch === "［" && chars[i + 1] === "＃") {
      let j = i + 2
      while (j < chars.length && chars[j] !== "］") j++
      i = j + 1
      continue
    }

    // Explicit ruby: ｜base《reading》
    if (ch === "｜") {
      flushBuf()
      i++
      const base: string[] = []
      while (i < chars.length && chars[i] !== "《") {
        base.push(chars[i++])
      }
      if (chars[i] === "《") {
        i++ // skip 《
        const reading: string[] = []
        while (i < chars.length && chars[i] !== "》") {
          reading.push(chars[i++])
        }
        i++ // skip 》
        nodes.push({ type: "ruby", base: base.join(""), reading: reading.join("") })
      } else {
        // Malformed: ｜ without matching 《》 — emit base as text
        nodes.push({ type: "text", text: base.join("") })
      }
      continue
    }

    // Implicit ruby: kanji《reading》
    // Base is the trailing kanji run in buf.
    if (ch === "《") {
      i++
      const reading: string[] = []
      while (i < chars.length && chars[i] !== "》") {
        reading.push(chars[i++])
      }
      i++ // skip 》

      // Find start of trailing kanji run
      let baseStart = buf.length
      while (baseStart > 0 && isKanji(buf[baseStart - 1])) {
        baseStart--
      }

      flushBuf(baseStart)
      const base = buf.join("")
      buf = []

      nodes.push({ type: "ruby", base, reading: reading.join("") })
      continue
    }

    // Iteration marks: ／＼ (unvoiced) or ／″＼ (voiced)
    // Repeat the preceding kana/kanji unit, optionally with dakuten on the first char.
    if (ch === "／") {
      let voiced = false
      let advance = 0
      if (chars[i + 1] === "″" && chars[i + 2] === "＼") {
        voiced = true
        advance = 3
      } else if (chars[i + 1] === "＼") {
        advance = 2
      }

      if (advance > 0) {
        i += advance
        // ／＼ is the "double iteration mark" (二倍の踊り字): repeats the
        // 2 preceding characters. e.g. いろ／＼ → いろいろ, 高く／＼ → 高く高く.
        //
        // Known limitation: in rare cases the mark is used for phrase-level
        // repetition, e.g. 「イエ何デモアリマセン／＼」 in Tanizaki's 鍵, where
        // the entire phrase 何デモアリマセン is intended to repeat. The 2-char
        // rule gives 何デモアリマセンセン there — wrong, but unavoidable without
        // morphological analysis. Such cases are uncommon.
        const unit = buf.slice(Math.max(0, buf.length - 2))
        if (unit.length > 0) {
          const repeated = voiced
            ? [addDakuten(unit[0]), ...unit.slice(1)]
            : [...unit]
          buf.push(...repeated)
        }
        continue
      }
    }

    buf.push(ch)
    i++
  }

  flushBuf()
  return nodes
}

/**
 * Parse a complete Aozora document into sections.
 *
 * Structure:
 *   - Heading directives (大/中/小見出し) delimit sections.
 *   - Each non-blank, non-heading line becomes a paragraph.
 *   - Content before the first heading is placed in a null-heading section.
 */
export function parseAozoraDocument(raw: string): AozoraDocument {
  const body = stripFooter(stripHeader(raw)).replace(/\r\n/g, "\n")
  const lines = body.split("\n")

  const sections: Section[] = []
  let current: Section = { heading: null, paragraphs: [] }

  for (const line of lines) {
    if (line.trim() === "") continue

    const heading = detectHeading(line)
    if (heading) {
      if (current.heading !== null || current.paragraphs.length > 0) {
        sections.push(current)
      }
      current = { heading, paragraphs: [] }
      continue
    }

    const nodes = parseInline(line)
    const hasContent = nodes.some(
      (n) => n.type !== "text" || n.text.trim() !== ""
    )
    if (hasContent) {
      current.paragraphs.push({ nodes })
    }
  }

  if (current.heading !== null || current.paragraphs.length > 0) {
    sections.push(current)
  }

  return { sections }
}
