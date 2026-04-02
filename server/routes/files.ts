import { Router } from "express";
import multer from "multer";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { db } from "../db.js";
import { customerFiles, customers } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, desc } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

const BUCKET = "customer-files";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diset");
  return createClient(url, key);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp", "image/heic",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipe file tidak didukung. Gunakan JPG, PNG, PDF, atau DOCX."));
  },
});

router.get("/:customerId/files", async (req, res) => {
  try {
    const { customerId } = req.params;
    const files = await db
      .select()
      .from(customerFiles)
      .where(eq(customerFiles.customerId, customerId))
      .orderBy(desc(customerFiles.uploadedAt));

    const supabase = getSupabase();
    const filesWithUrls = await Promise.all(files.map(async (f) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.fileName);
      return { ...f, url: data.publicUrl };
    }));

    return res.json(filesWithUrls);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/:customerId/files", upload.single("file"), async (req, res) => {
  try {
    const { customerId } = req.params;
    const { category } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "File diperlukan" });

    const [exists] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!exists) return res.status(404).json({ error: "Customer tidak ditemukan" });

    const supabase = getSupabase();

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname);
    const storagePath = `${customerId}/${unique}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: "Upload ke storage gagal: " + uploadError.message });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const [inserted] = await db.insert(customerFiles).values({
      customerId,
      fileName: storagePath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: String(file.size),
      category: category || "berkas",
    }).returning();

    return res.json({ ...inserted, url: publicUrl });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Upload gagal" });
  }
});

router.delete("/:customerId/files/:fileId", async (req, res) => {
  try {
    const { customerId, fileId } = req.params;
    const [record] = await db
      .select()
      .from(customerFiles)
      .where(eq(customerFiles.id, fileId))
      .limit(1);

    if (!record || record.customerId !== customerId) {
      return res.status(404).json({ error: "File tidak ditemukan" });
    }

    const supabase = getSupabase();
    const { error: deleteError } = await supabase.storage.from(BUCKET).remove([record.fileName]);
    if (deleteError) console.warn("Storage delete warning:", deleteError.message);

    await db.delete(customerFiles).where(eq(customerFiles.id, fileId));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
