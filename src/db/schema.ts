import {
  char,
  integer,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// --- Enums ---

// Languages: ja = Japanese, ko = Korean, cmn = Mandarin Chinese, yue = Cantonese, vi = Vietnamese
// Character classes: zhs = Simplified Chinese, zht = Traditional Chinese
// zhs/zht are used as namespaces for character-class-specific data (e.g. Heisig keywords).
// Language codes (cmn, yue, ...) are used for readings and meanings in a specific language context.
export const cjkLanguageEnum = pgEnum("cjk_language", [
  "ja",
  "ko",
  "cmn",
  "yue",
  "vi",
  "zhs",
  "zht",
]);

// onyomi/kunyomi = Japanese, pinyin = Mandarin, jyutping = Cantonese,
// hangul = Korean, hanviet = Sino-Vietnamese
export const readingTypeEnum = pgEnum("reading_type", [
  "onyomi",
  "kunyomi",
  "pinyin",
  "jyutping",
  "hangul",
  "hanviet",
]);

// Jouyou = standard use, Jinmei = name kanji, Hyougai = non-standard
export const kanjiCategoryEnum = pgEnum("kanji_category", [
  "jouyou",
  "jinmei",
  "hyougai",
]);

// Language of meaning/translation text
export const meaningLanguageEnum = pgEnum("meaning_language", ["lv", "en"]);

// --- Tables ---

// Base CJK character table — shared across all languages
export const characters = pgTable("characters", {
  // Unicode codepoint (e.g. 食 = 39135)
  id: integer("id").primaryKey(),
  // The character itself
  literal: char("literal", { length: 1 }).notNull().unique(),
  strokeCount: smallint("stroke_count"),
  // Kangxi radical number (1-214). Display forms resolved via static lookup.
  radical: smallint("radical"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Japanese-specific kanji properties
export const japaneseKanji = pgTable("japanese_kanji", {
  characterId: integer("character_id")
    .primaryKey()
    .references(() => characters.id),
  // Japanese school grade ("1"-"6", "S" for secondary)
  grade: varchar("grade", { length: 4 }),
  // JLPT level (1-5)
  jlpt: smallint("jlpt"),
  category: kanjiCategoryEnum("category"),
  // Index in "Remembering the Kanji" by James Heisig, 6th edition (vol. 1)
  sortHeisig: integer("sort_heisig"),
  // Index in "The Complete Guide to Japanese Kanji" (Seely, Henshall, Fan), 2017
  sortTuttle: integer("sort_tuttle"),
  // Index in "The Kodansha Kanji Learner's Dictionary", 2nd edition (Jack Halpern)
  sortKodansha: integer("sort_kodansha"),
  // Order in the official Jouyou kanji list (Japanese Ministry of Education)
  sortJoyo: integer("sort_joyo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Simplified Chinese hanzi properties (Mainland China standard)
export const simplifiedHanzi = pgTable("simplified_hanzi", {
  characterId: integer("character_id")
    .primaryKey()
    .references(() => characters.id),
  // HSK 2.0 (2010 revision), levels 1-6
  hsk2Level: smallint("hsk2_level"),
  // HSK 3.0 (2021 revision), levels 1-9 (3 stages × 3 levels)
  hsk3Level: smallint("hsk3_level"),
  // Index in "Remembering Simplified Hanzi" by Heisig & Richardson
  sortHeisig: integer("sort_heisig"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Traditional Chinese hanzi properties
export const traditionalHanzi = pgTable("traditional_hanzi", {
  characterId: integer("character_id")
    .primaryKey()
    .references(() => characters.id),
  // Index in "Remembering Traditional Hanzi" by Heisig & Richardson
  sortHeisig: integer("sort_heisig"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Language-specific readings for characters
export const characterReadings = pgTable(
  "character_readings",
  {
    id: serial("id").primaryKey(),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id),
    language: cjkLanguageEnum("language").notNull(),
    type: readingTypeEnum("type").notNull(),
    // e.g. "ショク", "た.べる" — dot separates kanji portion from okurigana in kun'yomi
    value: varchar("value", { length: 30 }).notNull(),
    // Display order within same character+language+type
    position: smallint("position").notNull().default(0),
  },
  (table) => [
    unique("character_readings_unique").on(
      table.characterId,
      table.language,
      table.type,
      table.value,
    ),
  ],
);

// Language-specific meanings for characters
// source_language = the language context (e.g. Japanese use of the character)
// meaning_language = the language of the meaning text (e.g. Latvian)
export const characterMeanings = pgTable(
  "character_meanings",
  {
    id: serial("id").primaryKey(),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id),
    sourceLanguage: cjkLanguageEnum("source_language").notNull(),
    meaningLanguage: meaningLanguageEnum("meaning_language").notNull(),
    // Unique mnemonic keyword for Heisig-style drills
    keyword: varchar("keyword", { length: 50 }),
    // Meaning strings ordered by relevance
    meanings: text("meanings").array(),
  },
  (table) => [
    unique("character_meanings_unique").on(
      table.characterId,
      table.sourceLanguage,
      table.meaningLanguage,
    ),
    unique("character_meanings_keyword_unique").on(
      table.sourceLanguage,
      table.meaningLanguage,
      table.keyword,
    ),
  ],
);
