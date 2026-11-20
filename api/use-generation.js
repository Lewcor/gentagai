// ═══════════════════════════════════════════════════════════
// api/use-generation.js
// Called when the user presses Generate. Counts it against their
// plan on the server (so the limit can't be bypassed in the
// browser). POST {} to claim one; POST {"peek":true} to just read.
// ═══════════════════════════════════════════════════════════
import { setCors, requireUser, meter } from "./_auth.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const user = await requireUser(req, res);
  if (!user) return;
  const peek = !!(req.body && req.body.peek);
  const m = await meter(user, peek ? "peek" : "generation");
  return res.status(m.ok ? 200 : m.status).json(m.body);
}
