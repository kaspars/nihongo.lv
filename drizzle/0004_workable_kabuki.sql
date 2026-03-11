CREATE TYPE "public"."character_relationship_type" AS ENUM('shinjitai_kyujitai', 'simplified_traditional');--> statement-breakpoint
CREATE TABLE "character_relationships" (
	"from_character_id" integer NOT NULL,
	"to_character_id" integer NOT NULL,
	"type" character_relationship_type NOT NULL,
	CONSTRAINT "character_relationships_from_character_id_to_character_id_type_pk" PRIMARY KEY("from_character_id","to_character_id","type")
);
--> statement-breakpoint
ALTER TABLE "character_relationships" ADD CONSTRAINT "character_relationships_from_character_id_characters_id_fk" FOREIGN KEY ("from_character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_relationships" ADD CONSTRAINT "character_relationships_to_character_id_characters_id_fk" FOREIGN KEY ("to_character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;