// ═══════════════════════════════════════════════════════════
// api/_auth.js  (underscore = shared helper, not a public route)
// Every paid-model endpoint (Claude, Gemini, ChatGPT, Qwen, judge)
// bills to GENTAGAI's own keys, so each call must come from a
// signed-in user. The browser sends its Supabase access token as
// "Authorization: Bearer <token>"; we verify it server-side.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_ORIGINS = [
  "https://gentagai.com",
  "https://www.gentagai.com",
  "https://gentagai.vercel.app",
];

// Same-origin calls need no CORS. Only echo an origin we trust.
export function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Returns the verified user, or sends 401 and returns null.
export async function requireUser(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return null;
  }
  return data.user;
}

// Hard ceiling so one request can't run up a huge bill.
export function capTokens(value, max = 4096) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : max;
}

// ── Plans & metering ───────────────────────────────────────
// Server-side source of truth for "how many generations does this
// person get". The browser's counter is for display only.
export const PLAN_LIMITS = { free: 5, pro: 200, agency: Infinity };
// One "generation" in the UI can fan out into several model calls
// (5-part amplify, multi-AI fan-out + judge). This is the ceiling on
// raw calls per generation so direct-API abuse stays bounded.
export const CALLS_PER_GEN = 30;

const monthKey = () => new Date().toISOString().slice(0, 7); // "2026-11"

async function readUsage(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("plan, gens_used, calls_used, gens_month")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const fresh = data.gens_month === monthKey();
  const plan = PLAN_LIMITS[data.plan] !== undefined ? data.plan : "free";
  return {
    plan,
    limit: PLAN_LIMITS[plan],
    gens: fresh ? data.gens_used || 0 : 0,
    calls: fresh ? data.calls_used || 0 : 0,
  };
}

async function writeUsage(userId, gens, calls) {
  const { error } = await supabase
    .from("users")
    .update({ gens_used: gens, calls_used: calls, gens_month: monthKey() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

// kind "generation": the user pressed Generate (counts toward the plan limit).
// kind "call": one raw model call (must stay within the per-plan call budget).
// kind "peek": just read usage.
// Returns { ok, status, body } — body is safe to send straight to the client.
export async function meter(user, kind) {
  try {
    const u = await readUsage(user.id);
    if (!u) return { ok: false, status: 404, body: { error: "Account not found" } };
    const view = { plan: u.plan, used: u.gens, limit: u.limit === Infinity ? null : u.limit };
    if (u.limit === Infinity) return { ok: true, body: view }; // agency: unlimited
    if (kind === "peek") return { ok: true, body: view };
    if (kind === "generation") {
      if (u.gens >= u.limit) return { ok: false, status: 402, body: { error: "Generation limit reached", ...view } };
      await writeUsage(user.id, u.gens + 1, u.calls);
      return { ok: true, body: { ...view, used: u.gens + 1 } };
    }
    // raw call
    if (u.calls >= u.limit * CALLS_PER_GEN) {
      return { ok: false, status: 402, body: { error: "Usage limit reached", ...view } };
    }
    await writeUsage(user.id, u.gens, u.calls + 1);
    return { ok: true, body: view };
  } catch (err) {
    console.error("meter error:", err.message);
    return { ok: false, status: 500, body: { error: "Usage check failed" } };
  }
}

// Convenience for the model proxies: verify user + charge one call.
export async function guardCall(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const m = await meter(user, "call");
  if (!m.ok) { res.status(m.status).json(m.body); return null; }
  return user;
}
