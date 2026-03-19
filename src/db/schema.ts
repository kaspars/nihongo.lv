import {
  boolean,
  char,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
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

// Relationship types between character forms:
//   shinjitai_kyujitai — Japanese post-war simplification (from=shinjitai, to=kyūjitai)
//   simplified_traditional — Chinese simplification (from=simplified, to=traditional)
export const characterRelationshipTypeEnum = pgEnum("character_relationship_type", [
  "shinjitai_kyujitai",
  "simplified_traditional",
]);

// --- Auth tables ---

// Provider-agnostic user identity. Created on first sign-in via any provider.
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Links a user to one or more OAuth providers (Google, GitHub, etc.)
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

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

// Relationships between different written forms of the same character.
// Direction: from = derived/simplified form, to = source/traditional form.
// Many-to-many: one simplified Chinese form can map to multiple traditional forms.
export const characterRelationships = pgTable(
  "character_relationships",
  {
    fromCharacterId: integer("from_character_id")
      .notNull()
      .references(() => characters.id),
    toCharacterId: integer("to_character_id")
      .notNull()
      .references(() => characters.id),
    type: characterRelationshipTypeEnum("type").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fromCharacterId, table.toCharacterId, table.type] }),
  ],
);

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
    // Keyword has been reviewed and approved for use in drills
    checked: boolean("checked").default(false).notNull(),
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

// --- Drill / SRS tables ---

// FSRS card states: New → Learning → Review ↔ Relearning
export const fsrsStateEnum = pgEnum("fsrs_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

// Current FSRS state per (user, item_type, item_id, drill_type).
// item_type is a string so new content types (word, sentence, …) require no schema change.
// drill_type is a string for the same reason (keyword_to_kanji, kanji_to_keyword, …).
export const userCardStates = pgTable(
  "user_card_states",
  {
    userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemType:  text("item_type").notNull(),  // 'kanji' | 'word' | 'sentence' | …
    itemId:    integer("item_id").notNull(),
    drillType: text("drill_type").notNull(), // 'keyword_to_kanji' | 'kanji_to_keyword' | …

    // FSRS algorithm state
    fsrsState:     fsrsStateEnum("fsrs_state").notNull().default("new"),
    stability:     real("stability"),      // retrieval half-life in days; null = never reviewed
    difficulty:    real("difficulty"),     // card difficulty 1–10; null = never reviewed
    elapsedDays:   integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    learningSteps: smallint("learning_steps").notNull().default(0), // progress through learning steps
    reps:          integer("reps").notNull().default(0),
    lapses:        integer("lapses").notNull().default(0),
    dueAt:         timestamp("due_at").notNull().defaultNow(),
    lastReviewAt:  timestamp("last_review_at"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemType, table.itemId, table.drillType] }),
    // Fast lookup of cards due for review for a given user + drill type
    index("user_card_states_due_idx").on(table.userId, table.drillType, table.dueAt),
  ],
);

// Append-only log of every drill attempt — full history for analytics and algorithm replay.
export const userDrillEvents = pgTable(
  "user_drill_events",
  {
    id:        serial("id").primaryKey(),
    userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemType:  text("item_type").notNull(),
    itemId:    integer("item_id").notNull(),
    drillType: text("drill_type").notNull(),
    // FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy
    rating:    smallint("rating").notNull(),
    // Raw 0–1 score from auto-evaluation (kaku-ren stroke similarity, quiz correctness).
    // null when the rating came from self-assessment.
    rawScore:  real("raw_score"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("user_drill_events_card_idx").on(table.userId, table.itemType, table.itemId),
  ],
);
