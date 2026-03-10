CREATE TABLE "simplified_hanzi" (
	"character_id" integer PRIMARY KEY NOT NULL,
	"hsk2_level" smallint,
	"hsk3_level" smallint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "simplified_hanzi" ADD CONSTRAINT "simplified_hanzi_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;