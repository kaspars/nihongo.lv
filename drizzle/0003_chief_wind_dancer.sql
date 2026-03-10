CREATE TABLE "traditional_hanzi" (
	"character_id" integer PRIMARY KEY NOT NULL,
	"sort_heisig" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_meanings" ALTER COLUMN "source_language" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "character_readings" ALTER COLUMN "language" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."cjk_language";--> statement-breakpoint
CREATE TYPE "public"."cjk_language" AS ENUM('ja', 'ko', 'cmn', 'yue', 'vi', 'zhs', 'zht');--> statement-breakpoint
UPDATE "character_meanings" SET "source_language" = 'cmn' WHERE "source_language" = 'zh';--> statement-breakpoint
UPDATE "character_readings" SET "language" = 'cmn' WHERE "language" = 'zh';--> statement-breakpoint
ALTER TABLE "character_meanings" ALTER COLUMN "source_language" SET DATA TYPE "public"."cjk_language" USING "source_language"::"public"."cjk_language";--> statement-breakpoint
ALTER TABLE "character_readings" ALTER COLUMN "language" SET DATA TYPE "public"."cjk_language" USING "language"::"public"."cjk_language";--> statement-breakpoint
ALTER TABLE "simplified_hanzi" ADD COLUMN "sort_heisig" integer;--> statement-breakpoint
ALTER TABLE "traditional_hanzi" ADD CONSTRAINT "traditional_hanzi_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;