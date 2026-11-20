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
