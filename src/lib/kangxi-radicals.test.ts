import { describe, expect, it } from "vitest";
import {
  KANGXI_RADICALS,
  getRadical,
  getRadicalDisplay,
  radicalCharToNumber,
} from "./kangxi-radicals";

describe("kangxi-radicals", () => {
  it("has exactly 215 entries (0-placeholder + 214 radicals)", () => {
    expect(KANGXI_RADICALS).toHaveLength(215);
  });

  it("has correct numbering for all entries", () => {
    for (let i = 0; i <= 214; i++) {
      expect(KANGXI_RADICALS[i].number).toBe(i);
    }
  });

  describe("getRadical", () => {
    it("returns correct data for known radicals", () => {
      const water = getRadical(85);
      expect(water).toMatchObject({
        number: 85,
        classical: "水",
        strokes: 4,
        name: "water",
      });
    });

    it("returns shinjitai form when available", () => {
      const wheat = getRadical(199);
      expect(wheat?.classical).toBe("麥");
      expect(wheat?.shinjitai).toBe("麦");
    });

    it("returns undefined for out-of-range numbers", () => {
      expect(getRadical(0)).toBeUndefined();
      expect(getRadical(215)).toBeUndefined();
      expect(getRadical(-1)).toBeUndefined();
    });
  });

  describe("getRadicalDisplay", () => {
    it("returns classical form by default", () => {
      expect(getRadicalDisplay(199)).toBe("麥");
    });

    it("returns shinjitai when requested and available", () => {
      expect(getRadicalDisplay(199, "shinjitai")).toBe("麦");
    });

    it("falls back to classical when shinjitai is not available", () => {
      expect(getRadicalDisplay(85, "shinjitai")).toBe("水");
    });
  });

  describe("radicalCharToNumber", () => {
    it("resolves classical forms", () => {
      expect(radicalCharToNumber("水")).toBe(85);
      expect(radicalCharToNumber("金")).toBe(167);
    });

    it("resolves shinjitai forms", () => {
      expect(radicalCharToNumber("麦")).toBe(199);
      expect(radicalCharToNumber("黒")).toBe(203);
      expect(radicalCharToNumber("亀")).toBe(213);
    });

    it("returns undefined for non-radical characters", () => {
      expect(radicalCharToNumber("食べ")).toBeUndefined();
      expect(radicalCharToNumber("A")).toBeUndefined();
    });
  });
});
