import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import app from "./app.js";

const isProd = process.env.NODE_ENV === "production";

if (!isProd) {
  app.use(cors({ origin: true, credentials: true }));
}

if (isProd) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || (isProd ? 5000 : 3001);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProd ? "production" : "development"})`);
});
