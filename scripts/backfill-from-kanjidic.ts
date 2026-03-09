/**
 * Backfills missing stroke_count and radical in the characters table
 * using data from KANJIDIC2 XML file.
 *
 * Usage: npx tsx scripts/backfill-from-kanjidic.ts [--dry-run]
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, isNull, or } from "drizzle-orm";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const KANJIDIC_PATH = "data/kanjidic2.xml";

// Classical kangxi radical number → radical character
// https://en.wikipedia.org/wiki/Kangxi_radical
const KANGXI_RADICALS: Record<number, string> = {
  1: "一", 2: "丨", 3: "丶", 4: "丿", 5: "乙", 6: "亅", 7: "二", 8: "亠",
  9: "人", 10: "儿", 11: "入", 12: "八", 13: "冂", 14: "冖", 15: "冫",
  16: "几", 17: "凵", 18: "刀", 19: "力", 20: "勹", 21: "匕", 22: "匚",
  23: "匸", 24: "十", 25: "卜", 26: "卩", 27: "厂", 28: "厶", 29: "又",
  30: "口", 31: "囗", 32: "土", 33: "士", 34: "夂", 35: "夊", 36: "夕",
  37: "大", 38: "女", 39: "子", 40: "宀", 41: "寸", 42: "小", 43: "尢",
  44: "尸", 45: "屮", 46: "山", 47: "巛", 48: "工", 49: "己", 50: "巾",
  51: "干", 52: "幺", 53: "广", 54: "廴", 55: "廾", 56: "弋", 57: "弓",
  58: "彐", 59: "彡", 60: "彳", 61: "心", 62: "戈", 63: "戶", 64: "手",
  65: "支", 66: "攴", 67: "文", 68: "斗", 69: "斤", 70: "方", 71: "无",
  72: "日", 73: "曰", 74: "月", 75: "木", 76: "欠", 77: "止", 78: "歹",
  79: "殳", 80: "毋", 81: "比", 82: "毛", 83: "氏", 84: "气", 85: "水",
  86: "火", 87: "爪", 88: "父", 89: "爻", 90: "爿", 91: "片", 92: "牙",
  93: "牛", 94: "犬", 95: "玄", 96: "玉", 97: "瓜", 98: "瓦", 99: "甘",
  100: "生", 101: "用", 102: "田", 103: "疋", 104: "疒", 105: "癶",
  106: "白", 107: "皮", 108: "皿", 109: "目", 110: "矛", 111: "矢",
  112: "石", 113: "示", 114: "禸", 115: "禾", 116: "穴", 117: "立",
  118: "竹", 119: "米", 120: "糸", 121: "缶", 122: "网", 123: "羊",
  124: "羽", 125: "老", 126: "而", 127: "耒", 128: "耳", 129: "聿",
  130: "肉", 131: "臣", 132: "自", 133: "至", 134: "臼", 135: "舌",
  136: "舛", 137: "舟", 138: "艮", 139: "色", 140: "艸", 141: "虍",
  142: "虫", 143: "血", 144: "行", 145: "衣", 146: "襾", 147: "見",
  148: "角", 149: "言", 150: "谷", 151: "豆", 152: "豕", 153: "豸",
  154: "貝", 155: "赤", 156: "走", 157: "足", 158: "身", 159: "車",
  160: "辛", 161: "辰", 162: "辵", 163: "邑", 164: "酉", 165: "釆",
  166: "里", 167: "金", 168: "長", 169: "門", 170: "阜", 171: "隶",
  172: "隹", 173: "雨", 174: "靑", 175: "非", 176: "面", 177: "革",
  178: "韋", 179: "韭", 180: "音", 181: "頁", 182: "風", 183: "飛",
  184: "食", 185: "首", 186: "香", 187: "馬", 188: "骨", 189: "高",
  190: "髟", 191: "鬥", 192: "鬯", 193: "鬲", 194: "鬼", 195: "魚",
  196: "鳥", 197: "鹵", 198: "鹿", 199: "麥", 200: "麻", 201: "黃",
  202: "黍", 203: "黑", 204: "黹", 205: "黽", 206: "鼎", 207: "鼓",
  208: "鼠", 209: "鼻", 210: "齊", 211: "齒", 212: "龍", 213: "龜",
  214: "龠",
};

interface KanjidicEntry {
  literal: string;
  codepoint: number;
  strokeCount: number | null;
  radicalNumber: number | null;
}

function parseKanjidic(xmlContent: string): Map<number, KanjidicEntry> {
  const entries = new Map<number, KanjidicEntry>();

  // Simple regex-based parsing — faster than full XML parser for our needs
  const charRegex = /<character>([\s\S]*?)<\/character>/g;
  let match;

  while ((match = charRegex.exec(xmlContent)) !== null) {
    const block = match[1];

    const literal = block.match(/<literal>(.*?)<\/literal>/)?.[1];
    if (!literal) continue;

    const codepoint = literal.codePointAt(0)!;

    const strokeCount = block.match(/<stroke_count>(\d+)<\/stroke_count>/);
    const radicalMatch = block.match(
      /<rad_value rad_type="classical">(\d+)<\/rad_value>/,
    );

    entries.set(codepoint, {
      literal,
      codepoint,
      strokeCount: strokeCount ? parseInt(strokeCount[1]) : null,
      radicalNumber: radicalMatch ? parseInt(radicalMatch[1]) : null,
    });
  }

  return entries;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== BACKFILLING ===");

  const xmlContent = readFileSync(KANJIDIC_PATH, "utf-8");
  const kanjidic = parseKanjidic(xmlContent);
  console.log(`Parsed ${kanjidic.size} entries from KANJIDIC2`);

  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Find characters missing stroke_count or radical
  const missing = await db
    .select()
    .from(schema.characters)
    .where(
      or(
        isNull(schema.characters.strokeCount),
        isNull(schema.characters.radical),
      ),
    );

  console.log(`Found ${missing.length} characters with missing data`);

  let stats = { updated: 0, notInKanjidic: 0, noNewData: 0 };

  for (const char of missing) {
    const entry = kanjidic.get(char.id);

    if (!entry) {
      stats.notInKanjidic++;
      continue;
    }

    const newStrokeCount =
      char.strokeCount === null ? entry.strokeCount : null;
    const newRadical =
      char.radical === null && entry.radicalNumber
        ? entry.radicalNumber
        : null;

    if (!newStrokeCount && !newRadical) {
      stats.noNewData++;
      continue;
    }

    if (!DRY_RUN) {
      const updates: Partial<typeof schema.characters.$inferInsert> = {};
      if (newStrokeCount) updates.strokeCount = newStrokeCount;
      if (newRadical) updates.radical = newRadical;

      await db
        .update(schema.characters)
        .set(updates)
        .where(eq(schema.characters.id, char.id));
    }

    stats.updated++;
  }

  console.log("\n=== Results ===");
  console.log(`Updated:          ${stats.updated}`);
  console.log(`Not in KANJIDIC:  ${stats.notInKanjidic}`);
  console.log(`No new data:      ${stats.noNewData}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
