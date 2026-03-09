/**
 * Migrates kanji data from the old nihongo_old database into the new schema.
 *
 * Reads from: nihongo_old.kanji (Sequelize model with JSON properties blob)
 * Writes to:  nihongo.characters, nihongo.japanese_kanji,
 *             nihongo.character_readings, nihongo.character_meanings
 *
 * Usage: npx tsx scripts/migrate-kanji.ts [--dry-run]
 */

import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

const DATABASE_URL = process.env.DATABASE_URL!;
// Derive old DB URL by replacing database name
const OLD_DATABASE_URL = DATABASE_URL.replace(/\/nihongo$/, "/nihongo_old");

interface OldKanji {
  id: number;
  kanji: string;
  properties: {
    keyword?: string;
    meanings?: string[];
    onyomi?: string[];
    kunyomi?: string[];
    radical?: string;
    strokes?: number;
    grade?: string;
    jlpt?: string;
    jouyou?: boolean;
    jinmei?: boolean;
    hyougai?: boolean;
    checked?: boolean;
    sort?: {
      heisig?: number;
      tuttle?: number;
      kodansha?: number;
      joyo?: number;
    };
    examples?: { word: string; meaning: string }[];
    components?: string[];
    dailyKanjiDate?: string;
  };
  created_at: Date;
  updated_at: Date;
}

// Map radical character to kangxi radical number
// Includes both classical and shinjitai forms
const RADICAL_CHAR_TO_NUMBER: Record<string, number> = {
  "一": 1, "丨": 2, "丶": 3, "丿": 4, "乙": 5, "亅": 6, "二": 7, "亠": 8,
  "人": 9, "儿": 10, "入": 11, "八": 12, "冂": 13, "冖": 14, "冫": 15,
  "几": 16, "凵": 17, "刀": 18, "力": 19, "勹": 20, "匕": 21, "匚": 22,
  "匸": 23, "十": 24, "卜": 25, "卩": 26, "厂": 27, "厶": 28, "又": 29,
  "口": 30, "囗": 31, "土": 32, "士": 33, "夂": 34, "夊": 35, "夕": 36,
  "大": 37, "女": 38, "子": 39, "宀": 40, "寸": 41, "小": 42, "尢": 43,
  "尸": 44, "屮": 45, "山": 46, "巛": 47, "工": 48, "己": 49, "巾": 50,
  "干": 51, "幺": 52, "广": 53, "廴": 54, "廾": 55, "弋": 56, "弓": 57,
  "彐": 58, "彡": 59, "彳": 60, "心": 61, "戈": 62, "戶": 63, "手": 64,
  "支": 65, "攴": 66, "文": 67, "斗": 68, "斤": 69, "方": 70, "无": 71,
  "日": 72, "曰": 73, "月": 74, "木": 75, "欠": 76, "止": 77, "歹": 78,
  "殳": 79, "毋": 80, "比": 81, "毛": 82, "氏": 83, "气": 84, "水": 85,
  "火": 86, "爪": 87, "父": 88, "爻": 89, "爿": 90, "片": 91, "牙": 92,
  "牛": 93, "犬": 94, "玄": 95, "玉": 96, "瓜": 97, "瓦": 98, "甘": 99,
  "生": 100, "用": 101, "田": 102, "疋": 103, "疒": 104, "癶": 105,
  "白": 106, "皮": 107, "皿": 108, "目": 109, "矛": 110, "矢": 111,
  "石": 112, "示": 113, "禸": 114, "禾": 115, "穴": 116, "立": 117,
  "竹": 118, "米": 119, "糸": 120, "缶": 121, "网": 122, "羊": 123,
  "羽": 124, "老": 125, "而": 126, "耒": 127, "耳": 128, "聿": 129,
  "肉": 130, "臣": 131, "自": 132, "至": 133, "臼": 134, "舌": 135,
  "舛": 136, "舟": 137, "艮": 138, "色": 139, "艸": 140, "虍": 141,
  "虫": 142, "血": 143, "行": 144, "衣": 145, "襾": 146, "見": 147,
  "角": 148, "言": 149, "谷": 150, "豆": 151, "豕": 152, "豸": 153,
  "貝": 154, "赤": 155, "走": 156, "足": 157, "身": 158, "車": 159,
  "辛": 160, "辰": 161, "辵": 162, "邑": 163, "酉": 164, "釆": 165,
  "里": 166, "金": 167, "長": 168, "門": 169, "阜": 170, "隶": 171,
  "隹": 172, "雨": 173, "靑": 174, "非": 175, "面": 176, "革": 177,
  "韋": 178, "韭": 179, "音": 180, "頁": 181, "風": 182, "飛": 183,
  "食": 184, "首": 185, "香": 186, "馬": 187, "骨": 188, "高": 189,
  "髟": 190, "鬥": 191, "鬯": 192, "鬲": 193, "鬼": 194, "魚": 195,
  "鳥": 196, "鹵": 197, "鹿": 198, "麥": 199, "麻": 200, "黃": 201,
  "黍": 202, "黑": 203, "黹": 204, "黽": 205, "鼎": 206, "鼓": 207,
  "鼠": 208, "鼻": 209, "齊": 210, "齒": 211, "龍": 212, "龜": 213,
  "龠": 214,
  // Shinjitai forms
  "亀": 213, "竜": 212, "麦": 199, "黄": 201, "黒": 203, "歯": 211, "斉": 210,
};

function radicalCharToNumber(char: string): number | null {
  return RADICAL_CHAR_TO_NUMBER[char] ?? null;
}

function getCategory(
  props: OldKanji["properties"],
): "jouyou" | "jinmei" | "hyougai" | null {
  if (props.jouyou) return "jouyou";
  if (props.jinmei) return "jinmei";
  if (props.hyougai) return "hyougai";
  return null;
}

function parseJlpt(jlpt: string | undefined): number | null {
  if (!jlpt) return null;
  // Old format: "N1", "N2", etc.
  const match = jlpt.match(/^N(\d)$/);
  return match ? parseInt(match[1]) : null;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== MIGRATING ===");

  const oldSql = postgres(OLD_DATABASE_URL);
  const newSql = postgres(DATABASE_URL);
  const db = drizzle(newSql, { schema });

  // Read all kanji from old database
  const oldKanji = await oldSql<OldKanji[]>`SELECT * FROM kanji ORDER BY id`;
  console.log(`Found ${oldKanji.length} kanji in old database`);

  let stats = {
    characters: 0,
    japaneseKanji: 0,
    readings: 0,
    meanings: 0,
    skipped: 0,
    errors: 0,
  };

  for (const k of oldKanji) {
    const props = k.properties;

    try {
      if (DRY_RUN) {
        stats.characters++;
        stats.japaneseKanji++;
        if (props.onyomi?.length || props.kunyomi?.length) stats.readings++;
        if (props.keyword || props.meanings?.length) stats.meanings++;
        continue;
      }

      // 1. Insert into characters
      await db
        .insert(schema.characters)
        .values({
          id: k.id,
          literal: k.kanji,
          strokeCount: props.strokes ?? null,
          radical: props.radical ? radicalCharToNumber(props.radical) : null,
        })
        .onConflictDoNothing();
      stats.characters++;

      // 2. Insert into japanese_kanji
      await db
        .insert(schema.japaneseKanji)
        .values({
          characterId: k.id,
          grade: props.grade ?? null,
          jlpt: parseJlpt(props.jlpt),
          category: getCategory(props),
          sortHeisig: props.sort?.heisig ?? null,
          sortTuttle: props.sort?.tuttle ?? null,
          sortKodansha: props.sort?.kodansha ?? null,
          sortJoyo: props.sort?.joyo ?? null,
        })
        .onConflictDoNothing();
      stats.japaneseKanji++;

      // 3. Insert readings
      if (props.onyomi) {
        for (let i = 0; i < props.onyomi.length; i++) {
          const value = props.onyomi[i].trim();
          if (!value) continue;
          await db
            .insert(schema.characterReadings)
            .values({
              characterId: k.id,
              language: "ja",
              type: "onyomi",
              value,
              position: i,
            })
            .onConflictDoNothing();
          stats.readings++;
        }
      }
      if (props.kunyomi) {
        for (let i = 0; i < props.kunyomi.length; i++) {
          const value = props.kunyomi[i].trim();
          if (!value) continue;
          await db
            .insert(schema.characterReadings)
            .values({
              characterId: k.id,
              language: "ja",
              type: "kunyomi",
              value,
              position: i,
            })
            .onConflictDoNothing();
          stats.readings++;
        }
      }

      // 4. Insert meanings (Latvian, source = Japanese)
      const keyword = props.keyword?.trim() || null;
      const meanings = props.meanings?.filter((m) => m.trim().length > 0) ?? [];

      if (keyword || meanings.length > 0) {
        await db
          .insert(schema.characterMeanings)
          .values({
            characterId: k.id,
            sourceLanguage: "ja",
            meaningLanguage: "lv",
            keyword,
            meanings: meanings.length > 0 ? meanings : null,
          })
          .onConflictDoNothing();
        stats.meanings++;
      }
    } catch (err) {
      stats.errors++;
      console.error(`Error migrating kanji ${k.id} (${k.kanji}):`, err);
    }
  }

  console.log("\n=== Results ===");
  console.log(`Characters:      ${stats.characters}`);
  console.log(`Japanese kanji:  ${stats.japaneseKanji}`);
  console.log(`Readings:        ${stats.readings}`);
  console.log(`Meanings:        ${stats.meanings}`);
  console.log(`Errors:          ${stats.errors}`);

  await oldSql.end();
  await newSql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
