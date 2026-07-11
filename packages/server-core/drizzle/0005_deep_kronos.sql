CREATE TABLE "asset_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"collection_id" uuid,
	"favorite" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_favorite_valid" CHECK ("assets"."favorite" IN (0, 1))
);
--> statement-breakpoint
ALTER TABLE "asset_collections" ADD CONSTRAINT "asset_collections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_collection_id_asset_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."asset_collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_collections_workspace_name_unique" ON "asset_collections" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "asset_collections_workspace_idx" ON "asset_collections" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_workspace_upload_unique" ON "assets" USING btree ("workspace_id","upload_id");--> statement-breakpoint
CREATE INDEX "assets_workspace_recent_idx" ON "assets" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "assets_collection_idx" ON "assets" USING btree ("workspace_id","collection_id");