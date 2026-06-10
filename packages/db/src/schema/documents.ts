import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// Uploaded source documents. `markdown` holds the extracted text (via the
// markitdown MCP sidecar or a local extractor) used as LLM context.
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileType: text("file_type").notNull(),
  storagePath: text("storage_path"),
  markdown: text("markdown"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
