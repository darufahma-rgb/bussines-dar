import { Router } from "express";
import { db } from "../db.js";
import { customers, customerBusinesses, businesses, interactions } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, ilike, desc, and, inArray, lt, isNotNull, sql, or } from "drizzle-orm";
import type { CustomerStatus } from "../../shared/schema.js";

const router = Router();
router.use(requireAuth);

function buildCustomerResponse(rows: any[], cbRows: any[]) {
  return rows.map((c) => ({
    ...c,
    customer_businesses: cbRows
      .filter((cb: any) => cb.customerId === c.id)
      .map((cb: any) => ({
        business_id: cb.businessId,
        businesses: { id: cb.businessId, name: cb.businessName, color: cb.businessColor },
      })),
  }));
}

async function fetchCbRows(customerIds: string[]) {
  if (!customerIds.length) return [];
  return db
    .select({
      customerId: customerBusinesses.customerId,
      businessId: customerBusinesses.businessId,
      businessName: businesses.name,
      businessColor: businesses.color,
    })
    .from(customerBusinesses)
    .innerJoin(businesses, eq(customerBusinesses.businessId, businesses.id))
    .where(inArray(customerBusinesses.customerId, customerIds));
}

router.get("/daily-focus", async (_req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const overdueFollowUps = await db
      .select({ customerId: interactions.customerId })
      .from(interactions)
      .where(and(
        eq(interactions.type, "follow_up"),
        eq(interactions.isCompleted, false),
        lt(interactions.followUpDate, today),
        isNotNull(interactions.followUpDate),
      ))
      .limit(20);

    const overdueIds = [...new Set(overdueFollowUps.map((r) => r.customerId))];

    const hotRows = await db
      .select()
      .from(customers)
      .where(eq(customers.status, "hot"))
      .orderBy(desc(customers.updatedAt))
      .limit(10);

    const highValueRows = await db
      .select()
      .from(customers)
      .where(and(
        isNotNull(customers.estimatedValue),
        or(
          eq(customers.status, "warm"),
          eq(customers.status, "negotiation"),
        )
      ))
      .orderBy(desc(customers.estimatedValue))
      .limit(10);

    const allIds = [...new Set([...overdueIds, ...hotRows.map((r) => r.id), ...highValueRows.map((r) => r.id)])];

    let focusRows: any[] = [];
    if (allIds.length) {
      focusRows = await db
        .select()
        .from(customers)
        .where(inArray(customers.id, allIds));
    }

    const cbRows = await fetchCbRows(focusRows.map((r) => r.id));

    const withReason = focusRows.map((c) => {
      const reasons: string[] = [];
      if (overdueIds.includes(c.id)) reasons.push("overdue_followup");
      if (c.status === "hot") reasons.push("hot_lead");
      if (c.estimatedValue && ["warm", "negotiation"].includes(c.status)) reasons.push("high_value");
      return { ...c, focusReasons: reasons };
    });

    const sorted = withReason.sort((a, b) => {
      const score = (r: any) => {
        let s = 0;
        if (r.focusReasons.includes("overdue_followup")) s += 30;
        if (r.focusReasons.includes("hot_lead")) s += 20;
        if (r.focusReasons.includes("high_value")) s += 10;
        return s;
      };
      return score(b) - score(a);
    }).slice(0, 5);

    return res.json(buildCustomerResponse(sorted, cbRows));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/revenue", async (_req, res) => {
  try {
    const [pipeline, closed] = await Promise.all([
      db
        .select({ total: sql<string>`coalesce(sum(estimated_value), 0)` })
        .from(customers)
        .where(and(
          isNotNull(customers.estimatedValue),
          inArray(customers.status, ["new", "warm", "hot", "negotiation"] as CustomerStatus[]),
        )),
      db
        .select({ total: sql<string>`coalesce(sum(estimated_value), 0)` })
        .from(customers)
        .where(and(
          isNotNull(customers.estimatedValue),
          eq(customers.status, "closed"),
        )),
    ]);

    const sourceBreakdown = await db
      .select({
        source: customers.source,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(isNotNull(customers.source))
      .groupBy(customers.source)
      .orderBy(desc(sql`count(*)`));

    const lostReasons = await db
      .select({
        reason: customers.lostReason,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(and(eq(customers.status, "lost"), isNotNull(customers.lostReason)))
      .groupBy(customers.lostReason)
      .orderBy(desc(sql`count(*)`));

    return res.json({
      pipelineValue: Number(pipeline[0].total),
      closedRevenue: Number(closed[0].total),
      sourceBreakdown,
      lostReasons,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, status, businessId } = req.query as Record<string, string>;

    let customerIds: string[] | null = null;

    if (businessId && businessId !== "all") {
      const cbRows = await db
        .select({ customerId: customerBusinesses.customerId })
        .from(customerBusinesses)
        .where(eq(customerBusinesses.businessId, businessId));
      customerIds = cbRows.map((r) => r.customerId);
      if (customerIds.length === 0) return res.json([]);
    }

    const conditions = [];
    if (search) {
      conditions.push(or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.email, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
      ));
    }
    if (status && status !== "all") conditions.push(eq(customers.status, status as CustomerStatus));
    if (customerIds !== null) conditions.push(inArray(customers.id, customerIds));

    const rows = await db
      .select()
      .from(customers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(customers.updatedAt));

    const ids = rows.map((r) => r.id);
    const cbRows = await fetchCbRows(ids);

    return res.json(buildCustomerResponse(rows, cbRows));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return res.status(404).json({ error: "Not found" });

    const cbRows = await db
      .select({
        customerId: customerBusinesses.customerId,
        businessId: customerBusinesses.businessId,
        businessName: businesses.name,
        businessColor: businesses.color,
      })
      .from(customerBusinesses)
      .innerJoin(businesses, eq(customerBusinesses.businessId, businesses.id))
      .where(eq(customerBusinesses.customerId, id));

    return res.json({
      ...customer,
      customer_businesses: cbRows.map((cb) => ({
        business_id: cb.businessId,
        businesses: { id: cb.businessId, name: cb.businessName, color: cb.businessColor },
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, status, businessIds, source, estimatedValue } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });

    const [customer] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        status: status || "new",
        source: source?.trim() || null,
        estimatedValue: estimatedValue ? String(estimatedValue) : null,
      })
      .returning();

    if (businessIds?.length) {
      await db.insert(customerBusinesses).values(
        businessIds.map((bizId: string) => ({ customerId: customer.id, businessId: bizId }))
      );
    }

    return res.json({ id: customer.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, lostReason, memory, estimatedValue, source, name, email, phone, tags, businessIds, customData, customDataKey, customDataValue } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (lostReason !== undefined) updateData.lostReason = lostReason;
    if (memory !== undefined) updateData.memory = memory;
    if (estimatedValue !== undefined) updateData.estimatedValue = estimatedValue ? String(estimatedValue) : null;
    if (source !== undefined) updateData.source = source;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (tags !== undefined) updateData.tags = tags;
    if (customData !== undefined) {
      updateData.customData = customData
        ? sql`${JSON.stringify(customData)}::jsonb`
        : null;
    }
    // Patch a single custom field key
    if (customDataKey !== undefined) {
      const [current] = await db.select({ customData: customers.customData }).from(customers).where(eq(customers.id, id)).limit(1);
      const merged = { ...(current?.customData || {}), [customDataKey]: customDataValue ?? "" };
      if (!customDataValue) delete merged[customDataKey];
      updateData.customData = Object.keys(merged).length
        ? sql`${JSON.stringify(merged)}::jsonb`
        : null;
    }

    await db.update(customers).set(updateData).where(eq(customers.id, id));

    if (Array.isArray(businessIds)) {
      await db.delete(customerBusinesses).where(eq(customerBusinesses.customerId, id));
      if (businessIds.length > 0) {
        await db.insert(customerBusinesses).values(
          businessIds.map((bizId: string) => ({ customerId: id, businessId: bizId }))
        );
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/bulk", async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids required" });
    }
    await db.delete(customers).where(inArray(customers.id, ids));
    return res.json({ deleted: ids.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(customers).where(eq(customers.id, id));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
