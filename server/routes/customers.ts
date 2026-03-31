import { Router } from "express";
import { db } from "../db.js";
import { customers, customerBusinesses, businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, ilike, desc, and, inArray } from "drizzle-orm";
import type { CustomerStatus } from "../../shared/schema.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { search, status, businessId } = req.query as Record<string, string>;

    const conditions = [];
    if (search) conditions.push(ilike(customers.name, `%${search}%`));
    if (status && status !== "all") conditions.push(eq(customers.status, status as CustomerStatus));

    const rows = await db
      .select()
      .from(customers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(customers.updatedAt));

    const customerIds = rows.map((r) => r.id);
    let cbRows: Array<{ customerId: string; businessId: string; businessName: string | null; businessColor: string | null }> = [];

    if (customerIds.length > 0) {
      cbRows = await db
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

    let result = rows.map((c) => ({
      ...c,
      customer_businesses: cbRows
        .filter((cb) => cb.customerId === c.id)
        .map((cb) => ({
          business_id: cb.businessId,
          businesses: { id: cb.businessId, name: cb.businessName, color: cb.businessColor },
        })),
    }));

    if (businessId && businessId !== "all") {
      result = result.filter((c) =>
        c.customer_businesses.some((cb) => cb.business_id === businessId)
      );
    }

    return res.json(result);
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
    const { name, email, phone, status, businessIds } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });

    const [customer] = await db
      .insert(customers)
      .values({ name: name.trim(), email: email?.trim() || null, phone: phone?.trim() || null, status: status || "new" })
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
    const { status } = req.body;
    await db.update(customers).set({ status, updatedAt: new Date() }).where(eq(customers.id, id));
    return res.json({ ok: true });
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
