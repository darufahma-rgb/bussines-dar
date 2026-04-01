import { Router } from "express";
import { db } from "../db.js";
import { customers, customerBusinesses, businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, ilike } from "drizzle-orm";
import type { CustomerStatus } from "../../shared/schema.js";

const router = Router();
router.use(requireAuth);

const VALID_STATUSES: CustomerStatus[] = ["new", "warm", "hot", "negotiation", "closed", "lost"];

function normalizeStatus(val: string): CustomerStatus {
  const s = val.trim().toLowerCase();
  if (s === "new" || s === "baru" || s === "lead baru") return "new";
  if (s === "warm" || s === "hangat") return "warm";
  if (s === "hot" || s === "panas") return "hot";
  if (s === "negotiation" || s === "negosiasi") return "negotiation";
  if (s === "closed" || s === "closed won" || s === "berhasil" || s === "won") return "closed";
  if (s === "lost" || s === "gagal") return "lost";
  if (VALID_STATUSES.includes(s as CustomerStatus)) return s as CustomerStatus;
  return "new";
}

function cleanNumber(val: string): number | undefined {
  if (!val) return undefined;
  const n = Number(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) || n === 0 ? undefined : n;
}

router.post("/customers", async (req, res) => {
  try {
    const { rows, businessName } = req.body as {
      rows: Array<{
        name?: string;
        email?: string;
        phone?: string;
        status?: string;
        source?: string;
        estimatedValue?: string;
        notes?: string;
      }>;
      businessName?: string;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Tidak ada data untuk diimport" });
    }

    let businessId: string | null = null;
    if (businessName?.trim()) {
      const existing = await db
        .select()
        .from(businesses)
        .where(ilike(businesses.name, businessName.trim()))
        .limit(1);
      if (existing.length) {
        businessId = existing[0].id;
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) { skipped++; continue; }

      const status = row.status ? normalizeStatus(row.status) : "new";
      const estimatedValue = row.estimatedValue ? cleanNumber(row.estimatedValue) : undefined;

      const [inserted] = await db
        .insert(customers)
        .values({
          name,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          status,
          source: row.source?.trim() || null,
          estimatedValue: estimatedValue?.toString() || null,
          memory: row.notes?.trim() || null,
        })
        .onConflictDoNothing()
        .returning({ id: customers.id });

      if (inserted && businessId) {
        await db
          .insert(customerBusinesses)
          .values({ customerId: inserted.id, businessId })
          .onConflictDoNothing();
      }

      if (inserted) imported++;
      else skipped++;
    }

    res.json({ imported, skipped, total: rows.length });
  } catch (err: any) {
    console.error("Import error:", err);
    res.status(500).json({ error: err.message || "Gagal import data" });
  }
});

export default router;
