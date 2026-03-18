import { describe, it, expect } from "vitest";
import { stripTones, hasToneMarks, hasNumericTones, numericToToned } from "./pinyin";

// ─── stripTones ───────────────────────────────────────────────────────────────

describe("stripTones", () => {
  it("strips tone marks from common pinyin", () => {
    expect(stripTones("zhōng")).toBe("zhong");
    expect(stripTones("chá")).toBe("cha");
    expect(stripTones("yǔ")).toBe("yu");
    expect(stripTones("hàn")).toBe("han");
  });

  it("handles all four tones", () => {
    expect(stripTones("māmámǎmà")).toBe("mamama" + "ma");
  });

  it("passes through plain ASCII unchanged", () => {
    expect(stripTones("zhong")).toBe("zhong");
    expect(stripTones("hello")).toBe("hello");
  });

  it("handles ü with tone marks", () => {
    expect(stripTones("lǖ")).toBe("lü");
    expect(stripTones("nǚ")).toBe("nü");
  });
});

// ─── hasToneMarks ─────────────────────────────────────────────────────────────

describe("hasToneMarks", () => {
  it("returns true for strings with tone diacritics", () => {
    expect(hasToneMarks("zhōng")).toBe(true);
    expect(hasToneMarks("nǐ hǎo")).toBe(true);
    expect(hasToneMarks("hàn yǔ")).toBe(true);
  });

  it("returns false for plain pinyin", () => {
    expect(hasToneMarks("zhong")).toBe(false);
    expect(hasToneMarks("ni hao")).toBe(false);
  });

  it("returns false for plain ASCII", () => {
    expect(hasToneMarks("country")).toBe(false);
    expect(hasToneMarks("hello")).toBe(false);
  });
});

// ─── hasNumericTones ──────────────────────────────────────────────────────────

describe("hasNumericTones", () => {
  it("returns true for numeric tone notation", () => {
    expect(hasNumericTones("zhong1")).toBe(true);
    expect(hasNumericTones("cha2")).toBe(true);
    expect(hasNumericTones("yu3")).toBe(true);
    expect(hasNumericTones("han4")).toBe(true);
    expect(hasNumericTones("ni3 hao3")).toBe(true);
  });

  it("returns false for plain pinyin without digits", () => {
    expect(hasNumericTones("zhong")).toBe(false);
    expect(hasNumericTones("ni hao")).toBe(false);
  });

  it("returns false for non-pinyin strings with digits", () => {
    expect(hasNumericTones("mp3")).toBe(false);   // no vowel before digit
    expect(hasNumericTones("123")).toBe(false);
    expect(hasNumericTones("abc5")).toBe(false);  // digit 5 not a tone
  });
});

// ─── numericToToned ───────────────────────────────────────────────────────────

describe("numericToToned", () => {
  it("applies rule 1 — mark on a or e", () => {
    expect(numericToToned("cha2")).toBe("chá");
    expect(numericToToned("han4")).toBe("hàn");
    expect(numericToToned("xue2")).toBe("xué");
    expect(numericToToned("hao3")).toBe("hǎo");
  });

  it("applies rule 2 — mark on o in 'ou'", () => {
    expect(numericToToned("tou2")).toBe("tóu");
    expect(numericToToned("gou3")).toBe("gǒu");
  });

  it("applies rule 3 — mark on last vowel", () => {
    expect(numericToToned("zhong1")).toBe("zhōng");
    expect(numericToToned("yu3")).toBe("yǔ");
    expect(numericToToned("gui4")).toBe("guì");
    expect(numericToToned("liu2")).toBe("liú");
  });

  it("handles all four tones", () => {
    expect(numericToToned("ma1")).toBe("mā");
    expect(numericToToned("ma2")).toBe("má");
    expect(numericToToned("ma3")).toBe("mǎ");
    expect(numericToToned("ma4")).toBe("mà");
  });

  it("handles 'v' as ü", () => {
    expect(numericToToned("lv4")).toBe("lǜ");
    expect(numericToToned("nv3")).toBe("nǚ");
  });

  it("handles multi-syllable input", () => {
    expect(numericToToned("ni3 hao3")).toBe("nǐ hǎo");
    expect(numericToToned("han4 yu3")).toBe("hàn yǔ");
    expect(numericToToned("zhong1 guo2")).toBe("zhōng guó");
  });

  it("leaves non-toned text unchanged", () => {
    expect(numericToToned("hello")).toBe("hello");
    expect(numericToToned("mp3")).toBe("mp3");
  });
});
