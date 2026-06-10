CREATE INDEX "matter_members_user_idx" ON "matter_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "matters_client_idx" ON "matters" USING btree ("client_id");