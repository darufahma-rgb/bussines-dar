import type { IncomingMessage, ServerResponse } from "http";

// Lazy-load the app to catch initialization errors
let handler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let initError: Error | null = null;

async function getHandler() {
  if (initError) throw initError;
  if (handler) return handler;
  try {
    const { default: app } = await import("../server/app.js");
    handler = app;
    return handler;
  } catch (err: any) {
    initError = err;
    throw err;
  }
}

export default async function (req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getHandler();
    app(req, res);
  } catch (err: any) {
    console.error("Handler initialization error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Internal server error" }));
  }
}
