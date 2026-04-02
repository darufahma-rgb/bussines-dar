import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db.js";
import { customerFiles, customers } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, desc } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

const UPLOADS_DIR = process.env.NODE_ENV === "production"
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "uploads");

try {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {
  console.warn("Could not create uploads directory:", e);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
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
    return res.json(files);
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

    const [inserted] = await db.insert(customerFiles).values({
      customerId,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: String(file.size),
      category: category || "berkas",
    }).returning();

    return res.json(inserted);
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

    const filePath = path.join(UPLOADS_DIR, record.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.delete(customerFiles).where(eq(customerFiles.id, fileId));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
