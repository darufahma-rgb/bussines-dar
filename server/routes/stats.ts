import { Router } from "express";
import { db } from "../db.js";
import { customers, interactions, customerBusinesses, businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { sql, and, eq, gte, lt, lte, inArray, desc } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d;
}

function startOfMonth(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + offset);
  return d;
}

router.get("/weekly", async (_req, res) => {
  try {
    const weekStart = startOfWeek();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStr = new Date().toISOString().split("T")[0];

    const [newLeads, hotLeads, closedDeals, missedFollowUps, weekInteractions] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(customers).where(gte(customers.createdAt, weekStart)),
      db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.status, "hot")),
      db.select({ count: sql<number>`count(*)` }).from(customers).where(
        and(eq(customers.status, "closed"), gte(customers.updatedAt, weekStart))
      ),
      db.select({ count: sql<number>`count(*)` }).from(interactions).where(
        and(eq(interactions.type, "follow_up"), eq(interactions.isCompleted, false), lt(interactions.followUpDate, todayStr))
      ),
      db.select({
        id: interactions.id,
        type: interactions.type,
        content: interactions.content,
        createdAt: interactions.createdAt,
        customerId: interactions.customerId,
      })
        .from(interactions)
        .where(gte(interactions.createdAt, weekStart))
        .orderBy(desc(interactions.createdAt))
        .limit(50),
    ]);

    const customerIds = [...new Set(weekInteractions.map((i) => i.customerId))];
    let customerMap: Record<string, string> = {};
    if (customerIds.length) {
      const cRows = await db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, customerIds));
      cRows.forEach((c) => { customerMap[c.id] = c.name; });
    }

    return res.json({
      newLeads: Number(newLeads[0].count),
      hotLeads: Number(hotLeads[0].count),
      closedDeals: Number(closedDeals[0].count),
      missedFollowUps: Number(missedFollowUps[0].count),
      weekInteractions: weekInteractions.map((i) => ({
        ...i,
        customerName: customerMap[i.customerId] || "Unknown",
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/monthly", async (_req, res) => {
  try {
    const thisMonthStart = startOfMonth(0);
    const lastMonthStart = startOfMonth(-1);
    const nextMonthStart = startOfMonth(1);

    const getMonthStats = async (start: Date, end: Date) => {
      const [newCustomers, closedDeals, totalInteractions, followUpsDone, followUpsMissed] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(customers).where(and(gte(customers.createdAt, start), lt(customers.createdAt, end))),
        db.select({ count: sql<number>`count(*)` }).from(customers).where(and(eq(customers.status, "closed"), gte(customers.updatedAt, start), lt(customers.updatedAt, end))),
        db.select({ count: sql<number>`count(*)` }).from(interactions).where(and(gte(interactions.createdAt, start), lt(interactions.createdAt, end))),
        db.select({ count: sql<number>`count(*)` }).from(interactions).where(and(eq(interactions.type, "follow_up"), eq(interactions.isCompleted, true), gte(interactions.updatedAt, start), lt(interactions.updatedAt, end))),
        db.select({ count: sql<number>`count(*)` }).from(interactions).where(and(eq(interactions.type, "follow_up"), eq(interactions.isCompleted, false), lt(interactions.followUpDate, end.toISOString().split("T")[0]), gte(interactions.followUpDate, start.toISOString().split("T")[0]))),
      ]);
      return {
        newCustomers: Number(newCustomers[0].count),
        closedDeals: Number(closedDeals[0].count),
        totalInteractions: Number(totalInteractions[0].count),
        followUpsDone: Number(followUpsDone[0].count),
        followUpsMissed: Number(followUpsMissed[0].count),
      };
    };

    const [currentMonth, previousMonth, bizRows] = await Promise.all([
      getMonthStats(thisMonthStart, nextMonthStart),
      getMonthStats(lastMonthStart, thisMonthStart),
      db.select().from(businesses),
    ]);

    const byBusiness = await Promise.all(
      bizRows.map(async (biz) => {
        const cbRows = await db.select({ customerId: customerBusinesses.customerId }).from(customerBusinesses).where(eq(customerBusinesses.businessId, biz.id));
        const customerIds = cbRows.map((r) => r.customerId);

        let newCustomers = 0, totalInteractions = 0;
        if (customerIds.length) {
          const [nc, ti] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(customers).where(and(inArray(customers.id, customerIds), gte(customers.createdAt, thisMonthStart))),
            db.select({ count: sql<number>`count(*)` }).from(interactions).where(and(inArray(interactions.customerId, customerIds), gte(interactions.createdAt, thisMonthStart))),
          ]);
          newCustomers = Number(nc[0].count);
          totalInteractions = Number(ti[0].count);
        }
        return { id: biz.id, name: biz.name, color: biz.color, newCustomers, totalInteractions, totalCustomers: customerIds.length };
      })
    );

    return res.json({ current: currentMonth, previous: previousMonth, byBusiness });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
