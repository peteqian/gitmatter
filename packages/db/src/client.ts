import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

// Single shared connection pool. `prepare: false` keeps things simple for the
// transaction-heavy commit path and is friendly to connection poolers.
export const sql = postgres(url, { max: 10 });
export const db = drizzle(sql, { schema });

export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
