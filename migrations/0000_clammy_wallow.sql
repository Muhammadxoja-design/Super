CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"metadata" text,
	"payload_hash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'UZS',
	"method" text DEFAULT 'manual',
	"note" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcast_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"user_id" integer,
	"telegram_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_error_code" integer,
	"last_error_message" text,
	"next_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by_admin_id" integer NOT NULL,
	"message_text" text,
	"media_url" text,
	"mode" text DEFAULT 'copy' NOT NULL,
	"source_chat_id" text,
	"source_message_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_count" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"started_at" timestamp,
	"finished_at" timestamp,
	"correlation_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" integer,
	"telegram_id" text,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_error_code" integer,
	"last_error_message" text,
	"next_attempt_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"status_updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status_updated_by_user_id" integer,
	"status_note" text,
	"note" text,
	"proof_text" text,
	"proof_file_id" text,
	"proof_type" text,
	"proof_submitted_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"idempotency_key" text,
	"created_by_admin_id" integer NOT NULL,
	"assigned_to" integer,
	"status" text DEFAULT 'ACTIVE',
	"due_date" text,
	"target_type" text,
	"target_value" text,
	"target_count" integer DEFAULT 0,
	"template_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" text,
	"login" text,
	"username" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"region" text,
	"district" text,
	"viloyat" text,
	"tuman" text,
	"shahar" text,
	"mahalla" text,
	"address" text,
	"birth_date" text,
	"direction" text,
	"photo_url" text,
	"password_hash" text,
	"is_admin" boolean DEFAULT false,
	"role" text DEFAULT 'user' NOT NULL,
	"plan" text DEFAULT 'FREE' NOT NULL,
	"pro_until" timestamp,
	"status" text DEFAULT 'approved' NOT NULL,
	"telegram_status" text DEFAULT 'active',
	"last_seen" timestamp,
	"last_active" timestamp,
	"approved_at" timestamp,
	"approved_by" text,
	"rejected_at" timestamp,
	"rejected_by" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_logs" ADD CONSTRAINT "broadcast_logs_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_logs" ADD CONSTRAINT "broadcast_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_queue" ADD CONSTRAINT "message_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_status_updated_by_user_id_users_id_fk" FOREIGN KEY ("status_updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_assignment_id_task_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "audit_logs_dedupe_unique" ON "audit_logs" USING btree ("actor_id","action","payload_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_index" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_index" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_index" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_transactions_user_index" ON "billing_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_logs_broadcast_status_index" ON "broadcast_logs" USING btree ("broadcast_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_status_index" ON "broadcasts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_created_at_index" ON "broadcasts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_queue_status_index" ON "message_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_templates_created_at_index" ON "message_templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_token_hash_index" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assignments_user_status_index" ON "task_assignments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assignments_created_at_index" ON "task_assignments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assignments_task_status_index" ON "task_assignments" USING btree ("task_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_events_task_created_index" ON "task_events" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_idempotency_key_unique" ON "tasks" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_index" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_status_index" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_due_date_index" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_created_at_index" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_id_unique" ON "users" USING btree ("telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_login_unique" ON "users" USING btree ("login");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_index" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_seen_index" ON "users" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_index" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_index" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_direction_index" ON "users" USING btree ("direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_viloyat_index" ON "users" USING btree ("viloyat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tuman_index" ON "users" USING btree ("tuman");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_mahalla_index" ON "users" USING btree ("mahalla");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_name_index" ON "users" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_username_index" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_index" ON "users" USING btree ("phone");