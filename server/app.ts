import "dotenv/config";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import customerRoutes from "./routes/customers.js";
import interactionRoutes from "./routes/interactions.js";
import aiRoutes from "./routes/ai.js";
import statsRoutes from "./routes/stats.js";

const app = express();
const PgSession = connectPgSimple(session);
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "AI rate limit exceeded, try again in a minute" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "50kb" }));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "crm-hub-secret-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
  },
}));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

export default app;
