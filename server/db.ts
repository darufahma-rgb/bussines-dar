import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

let connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL or DATABASE_URL must be set.");
}

// Supabase Transaction pooler (port 6543) doesn't support session-level operations
// (used by connect-pg-simple for sessions, Drizzle sql templates, etc).
// Automatically switch to Session pooler (port 5432) on the same host.
if (connectionString.includes(".pooler.supabase.com:6543")) {
  connectionString = connectionString.replace(".pooler.supabase.com:6543", ".pooler.supabase.com:5432");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
