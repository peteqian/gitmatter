import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { tenants } from "./tenants.js";

// A client is who the firm represents. Matters (engagements) hang off a client;
// artifacts hang off a matter. Every client belongs to a tenant (the firm) — the
// root of tenant isolation; matters/artifacts copy this tenantId down.
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").$type<"organization" | "individual">().notNull().default("organization"),
    clientNumber: text("client_number").unique(),
    status: text("status").$type<"active" | "inactive">().notNull().default("active"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("clients_tenant_idx").on(t.tenantId)]
);

export const clientContacts = pgTable("client_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type ClientContact = typeof clientContacts.$inferSelect;
