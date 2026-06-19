import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { tenants } from "./tenants.js";

// Per-client access role. Same shape and ordering as MatterRole (viewer <
// editor < owner); defined locally so this module doesn't depend on matters.ts
// (matters.ts already imports clients.ts — keep the dependency one-way).
export type ClientRole = "owner" | "editor" | "viewer";

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

// Who can see and work with a client. A client is visible only to its members —
// there is no org-wide default. The creator is added as `owner`; sharing grants
// a role to another tenant user. Mirrors matter_members.
export const clientMembers = pgTable(
  "client_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<ClientRole>().notNull().default("editor"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    unique("client_member_unique").on(t.clientId, t.userId),
    index("client_members_user_idx").on(t.userId),
  ]
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
export type ClientMember = typeof clientMembers.$inferSelect;
export type ClientContact = typeof clientContacts.$inferSelect;
