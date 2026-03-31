import "dotenv/config";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import customerRoutes from "./routes/customers.js";
import interactionRoutes from "./routes/interactions.js";
import aiRoutes from "./routes/ai.js";
import statsRoutes from "./routes/stats.js";

const app = express();
const PgSession = connectPgSimple(session);

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "crm-hub-secret-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
  },
}));

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
