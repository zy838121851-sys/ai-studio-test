CREATE TYPE "public"."data_rights_request_status" AS ENUM('pending', 'processing', 'completed', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "data_rights_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" varchar(30) NOT NULL,
	"status" "data_rights_request_status" DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_rights_requests" ADD CONSTRAINT "data_rights_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_rights_requests" ADD CONSTRAINT "data_rights_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_rights_requests_idempotency_unique" ON "data_rights_requests" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "data_rights_requests_workspace_idx" ON "data_rights_requests" USING btree ("workspace_id","created_at");