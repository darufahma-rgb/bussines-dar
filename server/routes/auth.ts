import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diset");
  return createClient(url, key);
}

const BUCKET = "customer-files";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar yang diperbolehkan"));
  },
});

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Email and password (min 6 chars) required" });
  }
  try {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ email, password: hashed }).returning();
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    return res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    return res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/signout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    return res.json({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch {
    return res.json({ user: { id: req.session.userId, email: req.session.userEmail, name: null, avatar: null } });
  }
});

router.put("/profile", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { name, currentPassword, newPassword } = req.body;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name || null;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Password lama wajib diisi" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: "Password lama salah" });
      if (newPassword.length < 6) return res.status(400).json({ error: "Password baru minimal 6 karakter" });
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length === 0) return res.json({ ok: true });

    const [updated] = await db.update(users).set(updates).where(eq(users.id, req.session.userId)).returning();
    return res.json({ user: { id: updated.id, email: updated.email, name: updated.name, avatar: updated.avatar } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/avatar", avatarUpload.single("avatar"), async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const file = req.file;
  if (!file) return res.status(400).json({ error: "File diperlukan" });

  try {
    const supabase = getSupabase();

    // Delete old avatar from storage if it exists
    const [current] = await db.select({ avatar: users.avatar }).from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (current?.avatar) {
      // Extract storage path from full URL if needed
      const oldUrl = current.avatar;
      const storagePrefix = `/storage/v1/object/public/${BUCKET}/`;
      const idx = oldUrl.indexOf(storagePrefix);
      if (idx !== -1) {
        const oldPath = oldUrl.slice(idx + storagePrefix.length);
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    const ext = path.extname(file.originalname);
    const storagePath = `avatars/${req.session.userId}-${Date.now()}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase avatar upload error:", uploadError);
      return res.status(500).json({ error: "Upload avatar gagal: " + uploadError.message });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const [updated] = await db
      .update(users)
      .set({ avatar: publicUrl })
      .where(eq(users.id, req.session.userId))
      .returning();

    return res.json({ user: { id: updated.id, email: updated.email, name: updated.name, avatar: updated.avatar } });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;
