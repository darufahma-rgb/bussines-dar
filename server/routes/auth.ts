import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

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
    return res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return res.json({ user: { id: req.session.userId, email: req.session.userEmail, name: null } });
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
    return res.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
