CREATE TABLE "client_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_member_unique" UNIQUE("client_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_members_user_idx" ON "client_members" USING btree ("user_id");--> statement-breakpoint
-- Backfill: clients become membership-gated. Make each existing client's creator
-- its owner so it stays visible to that user (no org-wide default anymore).
INSERT INTO "client_members" ("client_id", "user_id", "role")
SELECT "id", "created_by", 'owner' FROM "clients" WHERE "created_by" IS NOT NULL
ON CONFLICT ("client_id", "user_id") DO NOTHING;