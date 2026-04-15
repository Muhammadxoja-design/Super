CREATE TABLE IF NOT EXISTS "bot_action_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_id" text,
	"assignment_id" integer,
	"action_type" text,
	"proof_text" text,
	"simulated_ip" text,
	"execute_at" timestamp,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_action_logs_status_index" ON "bot_action_logs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_action_logs_execute_at_index" ON "bot_action_logs" USING btree ("execute_at");
