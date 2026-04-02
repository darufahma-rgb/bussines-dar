import { Router } from "express";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse");
import { db } from "../db.js";
import { customers, customerBusinesses, businesses, interactions } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { ilike } from "drizzle-orm";
import OpenAI from "openai";
import type { CustomerStatus } from "../../shared/schema.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (["pdf", "csv", "html", "htm", "txt"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format tidak didukung. Gunakan PDF, CSV, atau HTML."));
    }
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

const VALID_STATUSES: CustomerStatus[] = ["new", "warm", "hot", "negotiation", "closed", "lost"];

function normalizeStatus(val: string): CustomerStatus {
  const s = val.trim().toLowerCase();
  if (["new", "baru", "lead baru", "prospect", "prospek", "leads"].includes(s)) return "new";
  if (["warm", "hangat", "interested", "tertarik"].includes(s)) return "warm";
  if (["hot", "panas", "ready", "siap"].includes(s)) return "hot";
  if (["negotiation", "negosiasi", "nego", "negotiating"].includes(s)) return "negotiation";
  if (["closed", "closed won", "berhasil", "won", "deal", "sukses", "done"].includes(s)) return "closed";
  if (["lost", "gagal", "cancel", "batal", "rejected", "closed lost"].includes(s)) return "lost";
  if (VALID_STATUSES.includes(s as CustomerStatus)) return s as CustomerStatus;
  return "new";
}

function cleanNumber(val: string | number): number | undefined {
  if (!val) return undefined;
  const n = Number(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(n) || n === 0 ? undefined : n;
}

/* ─── Parse PDF via AI ──────────────────────────── */
router.post("/parse-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });

    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text.slice(0, 12000).trim();

    if (!rawText) {
      return res.status(422).json({ error: "PDF tidak bisa dibaca. Mungkin file scan/gambar?" });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Kamu mengekstrak data customer dari teks PDF dan mengembalikannya sebagai JSON array.
Format tiap item: { "name": "", "phone": "", "email": "", "status": "", "estimatedValue": "", "source": "", "notes": "", "business": "" }
Rules:
- status: new/warm/hot/negotiation/closed/lost (atau terjemahan Indonesianya)
- estimatedValue: angka saja tanpa simbol, kosong jika tidak ada
- Field kosong isi ""
- Kembalikan HANYA JSON array tanpa penjelasan atau markdown.`,
        },
        { role: "user", content: rawText },
      ],
      temperature: 0,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(422).json({ error: "AI tidak bisa mengekstrak data dari PDF ini" });

    const rows = JSON.parse(jsonMatch[0]);
    res.json({ rows, total: rows.length });
  } catch (err: any) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: err.message || "Gagal membaca PDF" });
  }
});

/* ─── Bulk import customers ─────────────────────── */
router.post("/customers", async (req, res) => {
  try {
    const { rows, defaultBusinessId } = req.body as {
      rows: Array<{
        name?: string;
        email?: string;
        phone?: string;
        status?: string;
        source?: string;
        estimatedValue?: string | number;
        notes?: string;
        business?: string;
        businessId?: string;
      }>;
      defaultBusinessId?: string;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Tidak ada data untuk diimport" });
    }

    const allBusinesses = await db.select().from(businesses);

    const findBizId = (name?: string): string | null => {
      if (!name?.trim()) return defaultBusinessId || null;
      const found = allBusinesses.find((b) =>
        b.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(b.name.toLowerCase())
      );
      return found?.id || defaultBusinessId || null;
    };

    let imported = 0;
    let skipped = 0;
    const importedCustomers: Array<{ id: string; name: string }> = [];

    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) { skipped++; continue; }

      const status = row.status ? normalizeStatus(row.status) : "new";
      const estimatedValue = row.estimatedValue ? cleanNumber(row.estimatedValue) : undefined;
      const bizId = row.businessId || findBizId(row.business);

      const [inserted] = await db
        .insert(customers)
        .values({
          name,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          status,
          source: row.source?.trim() || "import",
          estimatedValue: estimatedValue?.toString() || null,
          memory: row.notes?.trim() || null,
        })
        .onConflictDoNothing()
        .returning({ id: customers.id });

      if (inserted) {
        if (bizId) {
          await db.insert(customerBusinesses).values({ customerId: inserted.id, businessId: bizId }).onConflictDoNothing();
        }
        if (row.notes?.trim()) {
          await db.insert(interactions).values({ customerId: inserted.id, type: "note", content: row.notes.trim() });
        }
        importedCustomers.push({ id: inserted.id, name });
        imported++;
      } else {
        skipped++;
      }
    }

    res.json({ imported, skipped, total: rows.length, customers: importedCustomers });
  } catch (err: any) {
    console.error("Import error:", err);
    res.status(500).json({ error: err.message || "Gagal import data" });
  }
});

export default router;
