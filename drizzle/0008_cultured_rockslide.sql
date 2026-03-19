CREATE TYPE "public"."fsrs_state" AS ENUM('new', 'learning', 'review', 'relearning');--> statement-breakpoint
CREATE TABLE "user_card_states" (
	"user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"drill_type" text NOT NULL,
	"fsrs_state" "fsrs_state" DEFAULT 'new' NOT NULL,
	"stability" real,
	"difficulty" real,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" smallint DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp DEFAULT now() NOT NULL,
	"last_review_at" timestamp,
	CONSTRAINT "user_card_states_user_id_item_type_item_id_drill_type_pk" PRIMARY KEY("user_id","item_type","item_id","drill_type")
);
--> statement-breakpoint
CREATE TABLE "user_drill_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"drill_type" text NOT NULL,
	"rating" smallint NOT NULL,
	"raw_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_card_states" ADD CONSTRAINT "user_card_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_drill_events" ADD CONSTRAINT "user_drill_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_card_states_due_idx" ON "user_card_states" USING btree ("user_id","drill_type","due_at");--> statement-breakpoint
CREATE INDEX "user_drill_events_card_idx" ON "user_drill_events" USING btree ("user_id","item_type","item_id");