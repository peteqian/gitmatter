import { config } from "dotenv";

// Load monorepo-root .env so integration tests (db, auth) see DATABASE_URL etc.
config({ path: new URL("./.env", import.meta.url).pathname });
