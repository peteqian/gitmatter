import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// Per-user defaults. `jurisdiction` is the user's default; individual artifacts
// may override it.
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  jurisdiction: text("jurisdiction"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
