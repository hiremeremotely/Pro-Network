import { Router, type Request, type Response } from "express";

const router = Router();

// ── In-memory SSE client registry ─────────────────────────────────────────────
// Supports multiple tabs / connections per profile
const clients = new Map<number, Set<Response>>();

function addClient(profileId: number, res: Response) {
  if (!clients.has(profileId)) clients.set(profileId, new Set());
  clients.get(profileId)!.add(res);
}

function removeClient(profileId: number, res: Response) {
  const set = clients.get(profileId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(profileId);
}

// ── Public emitter — called by other route handlers ───────────────────────────
export function emitToUser(profileId: number, data: Record<string, unknown>) {
  const set = clients.get(profileId);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { /* client already gone */ }
  }
}

// ── GET /api/events — SSE stream for the authenticated user ──────────────────
router.get("/events", (req: Request, res: Response) => {
  const profileId = req.session.profileId;
  if (!profileId) { res.status(401).end(); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering if any
  res.flushHeaders();

  // Send an initial ping so the client knows the connection is live
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  addClient(profileId, res);

  // Heartbeat every 25s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(profileId, res);
  });
});

export default router;
