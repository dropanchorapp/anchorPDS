// Main entry point for Anchor PDS backend
import { Hono } from "https://esm.sh/hono@3.11.7";
import { initializeDatabase } from "./database/migrations.ts";
import atprotoRoutes from "./routes/atproto.ts";
import anchorRoutes from "./routes/anchor.ts";

const app = new Hono();

// Unwrap Hono errors to see original error details
app.onError((err, _c) => {
  throw err;
});

// Initialize database on startup
await initializeDatabase();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "anchor-pds" });
});

// Mount XRPC routes
app.route("/xrpc", atprotoRoutes);
app.route("/xrpc", anchorRoutes);

// Handle 404s
app.notFound((c) => {
  return c.json({ error: "NotFound", message: "Endpoint not found" }, 404);
});

// This is the entry point for HTTP vals
export default app.fetch;
