import { Router } from "express";
import multer from "multer";
import { createRequire } from "module";

// pdf-parse uses pdfjs-dist which needs DOMMatrix (browser API) — polyfill for Node.js
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    constructor() { return this; }
    static fromMatrix() { return new (globalThis as any).DOMMatrix(); }
  };
}
if (typeof (globalThis as any).DOMPoint === "undefined") {
  (globalThis as any).DOMPoint = class DOMPoint { constructor() {} };
}

const require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse");
import { db } from "../db.js";
import { customers, customerBusinesses, businesses, interactions } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { ilike, sql } from "drizzle-orm";
import { getOpenAI, getAIModel } from "../lib/aiClient.js";
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

/* ─── AI Column Mapping ─────────────────────────── */
router.post("/ai-map", async (req, res) => {
  try {
    const { headers, samples } = req.body as {
      headers: string[];
      samples: Record<string, string>[];
    };
    if (!headers?.length) return res.status(400).json({ error: "Tidak ada kolom" });

    const sampleText = samples.slice(0, 3).map((row, i) =>
      `Baris ${i + 1}: ${headers.map(h => `${h}="${row[h] || ""}"`).join(", ")}`
    ).join("\n");

    const completion = await getOpenAI().chat.completions.create({
      model: getAIModel(),
      messages: [
        {
          role: "system",
          content: `Kamu memetakan kolom dari file ekspor ke field CRM customer.
Field CRM yang tersedia: name, phone, email, status, estimatedValue, source, tags, notes, business, custom, skip
- name: nama customer (WAJIB ada)
- phone: nomor telepon/HP/WhatsApp
- email: alamat email
- status: status lead (new/warm/hot/negotiation/closed/lost)
- estimatedValue: nilai transaksi utama — harga bayar, harga jual, total, nominal, budget
- source: sumber lead (referral, iklan, media sosial)
- tags: kategori/segmen/tipe — segmen customer, jenis produk, kategori
- notes: catatan/komentar bebas dari user
- business: nama unit bisnis / agen / brand
- custom: kolom domain spesifik yang BUKAN catatan bebas, punya nama kolom yang bermakna — maskapai, airline, margin, profit, keberangkatan, destinasi, rute, kota, paket, nama produk spesifik, dll. Data ini akan disimpan sebagai field tersendiri dengan nama kolom aslinya.
- skip: HANYA untuk kolom sistem teknis (ID, timestamp, nomor urut, UUID)

PENTING: Kolom dengan data bisnis spesifik yang tidak masuk ke field standard → gunakan "custom", BUKAN "notes" dan BUKAN "skip".

Kembalikan JSON object: { "nama_kolom_asli": "field_target" }
Kembalikan HANYA JSON, tanpa penjelasan.`,
        },
        {
          role: "user",
          content: `Kolom: ${headers.join(", ")}\n\nContoh data:\n${sampleText}\n\nPetakan setiap kolom ke field CRM yang paling sesuai.`,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: "AI gagal memetakan kolom" });

    const mapping = JSON.parse(jsonMatch[0]);
    const validFields = ["name", "phone", "email", "status", "estimatedValue", "source", "tags", "notes", "business", "custom", "skip"];
    const cleaned: Record<string, string> = {};
    for (const [col, field] of Object.entries(mapping)) {
      cleaned[col] = validFields.includes(field as string) ? (field as string) : "skip";
    }

    res.json({ mapping: cleaned });
  } catch (err: any) {
    console.error("AI map error:", err);
    res.status(500).json({ error: err.message || "Gagal AI auto-map" });
  }
});

/* ─── Parse PDF via AI ──────────────────────────── */
router.post("/parse-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });

    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text.slice(0, 12000).trim();

    if (!rawText) {
      return res.status(422).json({ error: "PDF tidak bisa dibaca. Mungkin file scan/gambar?" });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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
        customData?: Record<string, string>;
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

    // Convert JS string array → PostgreSQL array literal e.g. {"tag1","tag 2"}
    const toPgTextArray = (arr: string[]): string =>
      "{" + arr.map((s) => '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"').join(",") + "}";

    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) { skipped++; continue; }

      const status = row.status ? normalizeStatus(row.status) : "new";
      const estimatedValue = row.estimatedValue ? cleanNumber(row.estimatedValue) : undefined;
      const bizId = row.businessId || findBizId(row.business);

      // Parse tags from comma-separated string
      const tagsRaw = row.tags?.trim() || row.kategori?.trim() || row.category?.trim() || "";
      const tagsArr = tagsRaw ? tagsRaw.split(/[,;|]/).map((t: string) => t.trim()).filter(Boolean) : [];

      const hasCustomData = row.customData && Object.keys(row.customData).length > 0;

      try {
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
            // Explicit cast to avoid node-postgres array type mismatch
            tags: sql`${toPgTextArray(tagsArr)}::text[]` as any,
            // Explicit cast to avoid node-postgres JSONB type mismatch
            customData: hasCustomData ? (sql`${JSON.stringify(row.customData)}::jsonb` as any) : null,
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
      } catch (rowErr: any) {
        console.error(`Import row error [${name}]:`, rowErr?.message, rowErr?.detail, rowErr?.code);
        throw new Error(`Gagal simpan "${name}": ${rowErr?.message || rowErr}`);
      }
    }

    res.json({ imported, skipped, total: rows.length, customers: importedCustomers });
  } catch (err: any) {
    console.error("Import error:", err);
    res.status(500).json({ error: err.message || "Gagal import data" });
  }
});

export default router;
