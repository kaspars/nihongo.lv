CREATE TYPE "public"."cjk_language" AS ENUM('ja', 'ko', 'zh', 'yue', 'vi');--> statement-breakpoint
CREATE TYPE "public"."kanji_category" AS ENUM('jouyou', 'jinmei', 'hyougai');--> statement-breakpoint
CREATE TYPE "public"."meaning_language" AS ENUM('lv', 'en');--> statement-breakpoint
CREATE TYPE "public"."reading_type" AS ENUM('onyomi', 'kunyomi', 'pinyin', 'jyutping', 'hangul', 'hanviet');--> statement-breakpoint
CREATE TABLE "character_meanings" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"source_language" "cjk_language" NOT NULL,
	"meaning_language" "meaning_language" NOT NULL,
	"keyword" varchar(50),
	"meanings" text[],
	CONSTRAINT "character_meanings_unique" UNIQUE("character_id","source_language","meaning_language"),
	CONSTRAINT "character_meanings_keyword_unique" UNIQUE("source_language","meaning_language","keyword")
);
--> statement-breakpoint
CREATE TABLE "character_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"language" "cjk_language" NOT NULL,
	"type" "reading_type" NOT NULL,
	"value" varchar(30) NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "character_readings_unique" UNIQUE("character_id","language","type","value")
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" integer PRIMARY KEY NOT NULL,
	"literal" char(1) NOT NULL,
	"stroke_count" smallint,
	"radical" char(1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "characters_literal_unique" UNIQUE("literal")
);
--> statement-breakpoint
CREATE TABLE "japanese_kanji" (
	"character_id" integer PRIMARY KEY NOT NULL,
	"grade" varchar(4),
	"jlpt" smallint,
	"category" "kanji_category",
	"sort_heisig" integer,
	"sort_tuttle" integer,
	"sort_kodansha" integer,
	"sort_joyo" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_meanings" ADD CONSTRAINT "character_meanings_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_readings" ADD CONSTRAINT "character_readings_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "japanese_kanji" ADD CONSTRAINT "japanese_kanji_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;