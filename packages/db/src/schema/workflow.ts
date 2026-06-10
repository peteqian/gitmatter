import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import type { TabularColumn } from "./tabular.js";

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  type: text("type").$type<"assistant" | "tabular">().notNull(),
  promptMd: text("prompt_md").notNull(),
  columnsConfig: jsonb("columns_config").$type<TabularColumn[]>(),
  practice: text("practice"),
  isSystem: boolean("is_system").default(false).notNull(),
  headCommitId: uuid("head_commit_id"),
  // Blame map: { "field/title": commitId, "field/prompt_md": commitId, ... }
  fieldCommits: jsonb("field_commits").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
