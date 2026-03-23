import { describe, it, expect } from "vitest"
import {
  stripHeader,
  stripFooter,
  detectHeading,
  parseInline,
  parseAozoraDocument,
} from "./aozora"

// ─── stripHeader ─────────────────────────────────────────────────────────────

describe("stripHeader", () => {
  const SEP = "-------------------------------------------------------"

  it("strips everything up to and including the second separator", () => {
    const raw = [
      "こころ",
      "夏目漱石",
      "",
      SEP,
      "【テキスト中に現れる記号について】",
      "《》：ルビ",
      SEP,
      "",
      "本文はここから",
    ].join("\n")
    expect(stripHeader(raw)).toBe("\n\n本文はここから")
  })

  it("returns input unchanged when no separator is found", () => {
    expect(stripHeader("区切りのないテキスト")).toBe("区切りのないテキスト")
  })

  it("returns input unchanged when only one separator is found", () => {
    const raw = `前半\n${SEP}\n後半`
    expect(stripHeader(raw)).toBe(raw)
  })
})

// ─── stripFooter ─────────────────────────────────────────────────────────────

describe("stripFooter", () => {
  it("strips footer starting with 底本：", () => {
    const text = "本文内容\n\n底本：「こころ」集英社文庫\n1991年"
    expect(stripFooter(text)).toBe("本文内容\n")
  })

  it("strips footer starting with 底本: (ASCII colon)", () => {
    const text = "本文\n底本: 書名\n詳細"
    expect(stripFooter(text)).toBe("本文")
  })

  it("returns input unchanged when no footer is found", () => {
    expect(stripFooter("本文のみ")).toBe("本文のみ")
  })
})

// ─── detectHeading ───────────────────────────────────────────────────────────

describe("detectHeading", () => {
  it("detects 大見出し as level 1", () => {
    expect(
      detectHeading(
        "［＃２字下げ］上　先生と私［＃「上　先生と私」は大見出し］"
      )
    ).toEqual({ level: 1, text: "上　先生と私" })
  })

  it("detects 中見出し as level 2", () => {
    expect(
      detectHeading("［＃５字下げ］一［＃「一」は中見出し］")
    ).toEqual({ level: 2, text: "一" })
  })

  it("detects 小見出し as level 3", () => {
    expect(
      detectHeading("短い見出し［＃「短い見出し」は小見出し］")
    ).toEqual({ level: 3, text: "短い見出し" })
  })

  it("returns null for regular paragraph lines", () => {
    expect(
      detectHeading("　私はその人を常に先生と呼んでいた。")
    ).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(detectHeading("")).toBeNull()
  })

  it("returns null for a directive-only line that is not a heading", () => {
    expect(detectHeading("［＃改ページ］")).toBeNull()
  })
})

// ─── parseInline ─────────────────────────────────────────────────────────────

describe("parseInline", () => {
  it("returns plain text unchanged", () => {
    expect(parseInline("これは普通の文です。")).toEqual([
      { type: "text", text: "これは普通の文です。" },
    ])
  })

  it("parses single-kanji implicit ruby", () => {
    expect(parseInline("私《わたくし》は")).toEqual([
      { type: "ruby", base: "私", reading: "わたくし" },
      { type: "text", text: "は" },
    ])
  })

  it("parses multi-kanji implicit ruby base", () => {
    // 端書 are both kanji → both become the base
    expect(parseInline("端書《はがき》を受け取った")).toEqual([
      { type: "ruby", base: "端書", reading: "はがき" },
      { type: "text", text: "を受け取った" },
    ])
  })

  it("implicit base stops at non-kanji characters", () => {
    // Only 帽 is the trailing kanji before 《
    expect(parseInline("麦わら帽《ぼう》")).toEqual([
      { type: "text", text: "麦わら" },
      { type: "ruby", base: "帽", reading: "ぼう" },
    ])
  })

  it("parses explicit ruby with ｜ base marker", () => {
    expect(parseInline("先生一人｜麦藁帽《むぎわらぼう》を")).toEqual([
      { type: "text", text: "先生一人" },
      { type: "ruby", base: "麦藁帽", reading: "むぎわらぼう" },
      { type: "text", text: "を" },
    ])
  })

  it("explicit ruby ｜ marker overrides implicit base detection", () => {
    // Without ｜, only 館 would be the base; with ｜ all three kanji are the base
    expect(parseInline("｜図書館《としょかん》へ")).toEqual([
      { type: "ruby", base: "図書館", reading: "としょかん" },
      { type: "text", text: "へ" },
    ])
  })

  it("strips annotator directives ［＃...］", () => {
    expect(parseInline("前半［＃何かの注釈］後半")).toEqual([
      { type: "text", text: "前半後半" },
    ])
  })

  it("strips leading layout directive, leaving only text", () => {
    // Heading content after stripping directive
    expect(parseInline("［＃５字下げ］一")).toEqual([
      { type: "text", text: "一" },
    ])
  })

  it("keeps ※ gaiji marker as plain text", () => {
    expect(parseInline("前※後")).toEqual([
      { type: "text", text: "前※後" },
    ])
  })

  it("handles multiple ruby spans in one line", () => {
    expect(
      parseInline("私《わたくし》はその人を先生と呼《よ》んでいた。")
    ).toEqual([
      { type: "ruby", base: "私", reading: "わたくし" },
      { type: "text", text: "はその人を先生と" },
      { type: "ruby", base: "呼", reading: "よ" },
      { type: "text", text: "んでいた。" },
    ])
  })

  it("handles katakana ruby reading (e.g. loanword base)", () => {
    expect(parseInline("瓦斯《ガス》ストーヴ")).toEqual([
      { type: "ruby", base: "瓦斯", reading: "ガス" },
      { type: "text", text: "ストーヴ" },
    ])
  })

  it("produces empty base when 《 has no preceding kanji", () => {
    // Malformed but should not throw
    expect(parseInline("は《わたし》")).toEqual([
      { type: "text", text: "は" },
      { type: "ruby", base: "", reading: "わたし" },
    ])
  })

  it("returns empty array for empty string", () => {
    expect(parseInline("")).toEqual([])
  })

  it("handles line with only directives", () => {
    expect(parseInline("［＃改ページ］")).toEqual([])
  })

  // ── Iteration marks ──────────────────────────────────────────────────────

  it("expands unvoiced iteration mark ／＼ by repeating preceding kana", () => {
    // いろ／＼ → いろいろ
    expect(parseInline("いろ／＼な")).toEqual([
      { type: "text", text: "いろいろな" },
    ])
  })

  it("expands unvoiced iteration mark after multiple kana", () => {
    // われ／＼ → われわれ
    expect(parseInline("われ／＼が")).toEqual([
      { type: "text", text: "われわれが" },
    ])
  })

  it("expands unvoiced iteration mark after kanji+kana sequence", () => {
    // 高く／＼ → 高く高く
    expect(parseInline("高く／＼")).toEqual([
      { type: "text", text: "高く高く" },
    ])
  })

  it("expands voiced iteration mark ／″＼ with dakuten on first char", () => {
    // つく／″＼ → つくづく  (つ → づ)
    expect(parseInline("つく／″＼")).toEqual([
      { type: "text", text: "つくづく" },
    ])
  })

  it("expands voiced iteration mark with dakuten mapping", () => {
    // ぞろ／＼ → ぞろぞろ (unvoiced, ぞ has no further voicing)
    expect(parseInline("ぞろ／＼")).toEqual([
      { type: "text", text: "ぞろぞろ" },
    ])
  })

  it("stops iteration mark scan at non-kana/kanji boundary", () => {
    // 「いろ／＼」— scan stops before 「, repeats only いろ
    expect(parseInline("「いろ／＼」")).toEqual([
      { type: "text", text: "「いろいろ」" },
    ])
  })

  it("always repeats exactly the 2 preceding characters, regardless of what came before", () => {
    // が precedes 高く — unit is 高く (chars -2), not が高く
    expect(parseInline("屋根が高く／＼尖って")).toEqual([
      { type: "text", text: "屋根が高く高く尖って" },
    ])
  })

  it("repeats 2 chars even when preceded by a longer kana/kanji run", () => {
    // 幾間を隔てた遠い／＼ → 遠い遠い (not 隔てた遠い遠い)
    expect(parseInline("幾間を隔てた遠い／＼庭")).toEqual([
      { type: "text", text: "幾間を隔てた遠い遠い庭" },
    ])
  })

  it("ignores ／ that is not followed by ＼", () => {
    expect(parseInline("A／B")).toEqual([{ type: "text", text: "A／B" }])
  })
})

// ─── parseAozoraDocument ─────────────────────────────────────────────────────

describe("parseAozoraDocument", () => {
  const SEP = "-------------------------------------------------------"

  function makeDoc(body: string) {
    return [`タイトル`, `著者`, ``, SEP, `記号説明`, SEP, body].join("\n")
  }

  it("parses a document with heading and paragraphs into sections", () => {
    const raw = makeDoc(
      [
        "",
        "［＃２字下げ］上　先生と私［＃「上　先生と私」は大見出し］",
        "",
        "［＃５字下げ］一［＃「一」は中見出し］",
        "",
        "　私《わたくし》はその人を常に先生と呼んでいた。",
        "　これは二つ目の段落だ。",
      ].join("\n")
    )

    const doc = parseAozoraDocument(raw)

    expect(doc.sections).toHaveLength(2)

    expect(doc.sections[0].heading).toEqual({ level: 1, text: "上　先生と私" })
    expect(doc.sections[0].paragraphs).toHaveLength(0)

    expect(doc.sections[1].heading).toEqual({ level: 2, text: "一" })
    expect(doc.sections[1].paragraphs).toHaveLength(2)

    // First paragraph has ruby node
    expect(doc.sections[1].paragraphs[0].nodes).toContainEqual({
      type: "ruby",
      base: "私",
      reading: "わたくし",
    })
  })

  it("strips header and footer", () => {
    const raw = makeDoc("本文の一行。\n\n底本：「テスト」\n出版社\n")
    const doc = parseAozoraDocument(raw)
    const allText = doc.sections
      .flatMap((s) => s.paragraphs)
      .flatMap((p) => p.nodes)
      .filter((n) => n.type === "text")
      .map((n) => n.text)
      .join("")
    expect(allText).not.toContain("底本")
    expect(allText).toContain("本文")
  })

  it("collects preamble content (before first heading) in a null-heading section", () => {
    const raw = makeDoc(
      ["", "前書きの段落。", "", "［＃「章」は大見出し］", "", "章の内容。"].join(
        "\n"
      )
    )
    const doc = parseAozoraDocument(raw)
    expect(doc.sections[0].heading).toBeNull()
    expect(doc.sections[0].paragraphs[0].nodes[0]).toMatchObject({
      type: "text",
      text: "前書きの段落。",
    })
  })

  it("handles CRLF line endings without leaving \\r in text nodes", () => {
    const raw = makeDoc(
      ["", "一行目の内容。", "", "二行目の内容。"].join("\r\n")
    )
    const doc = parseAozoraDocument(raw)
    const texts = doc.sections
      .flatMap((s) => s.paragraphs)
      .flatMap((p) => p.nodes)
      .filter((n) => n.type === "text")
      .map((n) => n.text)
    expect(texts.every((t) => !t.includes("\r"))).toBe(true)
    expect(texts.some((t) => t.includes("一行目"))).toBe(true)
  })

  it("skips blank lines and empty-content lines", () => {
    const raw = makeDoc(["", "　", "", "実際の内容。"].join("\n"))
    const doc = parseAozoraDocument(raw)
    const paragraphs = doc.sections.flatMap((s) => s.paragraphs)
    expect(paragraphs).toHaveLength(1)
  })
})
