import { Router } from "express";
import { db } from "../db.js";
import { interactions, customers, customerBusinesses, businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, and, lte, lt, desc, inArray } from "drizzle-orm";
import type { InteractionType } from "../../shared/schema.js";
import { sql } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { type, customerId, limit: limitStr, includeCustomer } = req.query as Record<string, string>;

    const conditions = [];
    if (customerId) conditions.push(eq(interactions.customerId, customerId));
    if (type) {
      const types = type.split(",") as InteractionType[];
      conditions.push(inArray(interactions.type, types));
    }

    const rows = await db
      .select()
      .from(interactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(interactions.createdAt))
      .limit(limitStr ? parseInt(limitStr) : 1000);

    if (includeCustomer === "true") {
      const customerIds = [...new Set(rows.map((r) => r.customerId))];
      let customerMap: Record<string, { id: string; name: string; status: string }> = {};
      if (customerIds.length > 0) {
        const cRows = await db
          .select({ id: customers.id, name: customers.name, status: customers.status })
          .from(customers)
          .where(inArray(customers.id, customerIds));
        cRows.forEach((c) => { customerMap[c.id] = c; });
      }
      return res.json(rows.map((r) => ({ ...r, customers: customerMap[r.customerId] ?? null })));
    }

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/follow-ups", async (req, res) => {
  try {
    const { pending } = req.query as Record<string, string>;
    const conditions = [eq(interactions.type, "follow_up")];
    if (pending === "true") conditions.push(eq(interactions.isCompleted, false));

    const rows = await db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(interactions.followUpDate);

    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    let customerMap: Record<string, { id: string; name: string; status: string }> = {};
    if (customerIds.length > 0) {
      const cRows = await db
        .select({ id: customers.id, name: customers.name, status: customers.status })
        .from(customers)
        .where(inArray(customers.id, customerIds));
      cRows.forEach((c) => { customerMap[c.id] = c; });
    }

    return res.json(rows.map((r) => ({ ...r, customers: customerMap[r.customerId] ?? null })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [totalRes, leadsRes, todayRes, overdueRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(customers),
      db.select({ count: sql<number>`count(*)` }).from(customers).where(
        inArray(customers.status, ["new", "warm", "hot", "negotiation"])
      ),
      db.select({ count: sql<number>`count(*)` }).from(interactions).where(
        and(eq(interactions.type, "follow_up"), eq(interactions.isCompleted, false), eq(interactions.followUpDate, today))
      ),
      db.select({ count: sql<number>`count(*)` }).from(interactions).where(
        and(eq(interactions.type, "follow_up"), eq(interactions.isCompleted, false), lt(interactions.followUpDate, today))
      ),
    ]);

    return res.json({
      total: Number(totalRes[0].count),
      leads: Number(leadsRes[0].count),
      todayFollowUps: Number(todayRes[0].count),
      overdue: Number(overdueRes[0].count),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { customerId, type, content, amount, followUpDate } = req.body;
    if (!customerId || !type || !content?.trim()) {
      return res.status(400).json({ error: "customerId, type, content required" });
    }
    const [row] = await db.insert(interactions).values({
      customerId,
      type,
      content: content.trim(),
      amount: amount ? String(amount) : null,
      followUpDate: followUpDate || null,
    }).returning();

    await db.update(customers).set({ updatedAt: new Date() }).where(eq(customers.id, customerId));

    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;
    await db.update(interactions).set({ isCompleted, updatedAt: new Date() }).where(eq(interactions.id, id));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(interactions).where(eq(interactions.id, id));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
