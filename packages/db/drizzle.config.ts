import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Root .env (monorepo root, two levels up from packages/db).
config({ path: "../../.env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  // Manage both the application schema (public) and the isolated auth schema.
  schemaFilter: ["public", "auth"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
