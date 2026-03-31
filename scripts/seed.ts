import "dotenv/config";
import { db } from "../server/db.js";
import { businesses } from "../shared/schema.js";

await db.insert(businesses).values([
  { name: "Temantiket", color: "#F59E0B" },
  { name: "SYMP Studio", color: "#3B82F6" },
  { name: "Darcia", color: "#EC4899" },
  { name: "AIGYPT", color: "#10B981" },
]).onConflictDoNothing();

console.log("Businesses seeded!");
process.exit(0);
