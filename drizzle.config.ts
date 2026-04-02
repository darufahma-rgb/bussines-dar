import { defineConfig } from "drizzle-kit";

let url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL!;

// Switch Supabase Transaction pooler (6543) → Session pooler (5432)
if (url?.includes(".pooler.supabase.com:6543")) {
  url = url.replace(".pooler.supabase.com:6543", ".pooler.supabase.com:5432");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
