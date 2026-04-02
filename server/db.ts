import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

// Data queries → Supabase Transaction pooler (port 6543, unlimited concurrency)
const dataUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dataUrl) throw new Error("SUPABASE_DB_URL or DATABASE_URL must be set.");

export const pool = new Pool({ connectionString: dataUrl, max: 10 });
export const db = drizzle(pool, { schema });

// Session store → Replit's built-in PostgreSQL (avoids Supabase client limits)
const sessionUrl = process.env.DATABASE_URL;
export const sessionPool = sessionUrl
  ? new Pool({ connectionString: sessionUrl, max: 5 })
  : pool; // fallback to same pool if no separate DB
