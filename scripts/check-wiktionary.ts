/**
 * Cross-references our stroke/radical mismatches against both KANJIDIC2
 * and Wiktionary, showing a comparison table.
 *
 * Usage: npx tsx scripts/check-wiktionary.ts
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

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

// Parse KANJIDIC2
function parseKanjidic(): Map<number, { strokes: number | null; radical: string | null; radicalNum: number | null }> {
  const xml = readFileSync("data/kanjidic2.xml", "utf-8");
  const map = new Map();
  const charRegex = /<character>([\s\S]*?)<\/character>/g;
  let m;
  while ((m = charRegex.exec(xml)) !== null) {
    const block = m[1];
    const literal = block.match(/<literal>(.*?)<\/literal>/)?.[1];
    if (!literal) continue;
    const cp = literal.codePointAt(0)!;
    const sc = block.match(/<stroke_count>(\d+)<\/stroke_count>/);
    const rad = block.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/);
    const radNum = rad ? parseInt(rad[1]) : null;
    map.set(cp, {
      strokes: sc ? parseInt(sc[1]) : null,
      radical: radNum ? (KANGXI_RADICALS[radNum] ?? null) : null,
      radicalNum: radNum,
    });
  }
  return map;
}

// Fetch Han char data from Wiktionary API
async function fetchWiktionary(char: string): Promise<{ strokes: number | null; radical: string | null; radicalNum: number | null }> {
  const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(char)}&prop=wikitext&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "nihongo.lv-migration/1.0" },
  });
  if (!res.ok) return { strokes: null, radical: null, radicalNum: null };

  const data = await res.json() as { parse?: { wikitext?: { "*"?: string } } };
  const wikitext = data.parse?.wikitext?.["*"] ?? "";

  // Parse {{Han char|rn=23|rad=匸|as=05|sn=7|...}}
  const hanChar = wikitext.match(/\{\{Han char\|([^}]+)\}\}/);
  if (!hanChar) return { strokes: null, radical: null, radicalNum: null };

  const params = hanChar[1];
  const snMatch = params.match(/sn=(\d+)/);
  const rnMatch = params.match(/rn=(\d+)/);
  const radMatch = params.match(/rad=([^|}]+)/);

  const radNum = rnMatch ? parseInt(rnMatch[1]) : null;

  return {
    strokes: snMatch ? parseInt(snMatch[1]) : null,
    radical: radMatch ? radMatch[1].trim() : null,
    radicalNum: radNum,
  };
}

// Rate-limit helper
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const kanjidic = parseKanjidic();
  console.log(`Parsed ${kanjidic.size} entries from KANJIDIC2`);

  const sql = postgres(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, literal, stroke_count, radical
    FROM characters
    WHERE radical IS NOT NULL OR stroke_count IS NOT NULL
  `;

  // Find all mismatches
  interface Mismatch {
    literal: string;
    code: string;
    field: "strokes" | "radical";
    ours: string;
    kanjidic: string;
  }

  const mismatches: Mismatch[] = [];
  for (const row of rows) {
    const ref = kanjidic.get(row.id);
    if (!ref) continue;
    const code = `U+${row.id.toString(16).toUpperCase().padStart(4, "0")}`;

    if (row.stroke_count !== null && ref.strokes !== null && row.stroke_count !== ref.strokes) {
      mismatches.push({ literal: row.literal, code, field: "strokes", ours: String(row.stroke_count), kanjidic: String(ref.strokes) });
    }
    if (row.radical !== null && ref.radical !== null && row.radical !== ref.radical) {
      mismatches.push({ literal: row.literal, code, field: "radical", ours: row.radical, kanjidic: ref.radical });
    }
  }

  console.log(`Found ${mismatches.length} mismatches, fetching Wiktionary data...\n`);

  // Table header
  console.log("| # | Char | Code | Field | Ours | KANJIDIC | Wiktionary | Agreement |");
  console.log("|---|------|------|-------|------|----------|------------|-----------|");

  for (let i = 0; i < mismatches.length; i++) {
    const m = mismatches[i];
    const wiki = await fetchWiktionary(m.literal);

    let wikiValue: string;
    if (m.field === "strokes") {
      wikiValue = wiki.strokes !== null ? String(wiki.strokes) : "?";
    } else {
      wikiValue = wiki.radical ?? "?";
    }

    // Determine agreement
    let agreement: string;
    const allThree = m.ours === m.kanjidic && m.kanjidic === wikiValue;
    const kanjidicWiki = m.kanjidic === wikiValue;
    const oursWiki = m.ours === wikiValue;
    const oursKanjidic = m.ours === m.kanjidic;

    if (kanjidicWiki && !oursWiki) {
      agreement = "KANJIDIC=Wiki";
    } else if (oursWiki && !kanjidicWiki) {
      agreement = "Ours=Wiki";
    } else if (wikiValue === "?") {
      agreement = "No wiki data";
    } else {
      agreement = "All differ";
    }

    console.log(`| ${i + 1} | ${m.literal} | ${m.code} | ${m.field} | ${m.ours} | ${m.kanjidic} | ${wikiValue} | ${agreement} |`);

    // Be polite to Wiktionary API
    if (i < mismatches.length - 1) {
      await delay(200);
    }
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
