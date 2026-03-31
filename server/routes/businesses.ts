import { Router } from "express";
import { db } from "../db.js";
import { businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { asc } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(businesses).orderBy(asc(businesses.name));
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
