// ═══════════════════════════════════════════════════════════
// api/redeem-code.js
// Staff / VIP access codes, checked on the server. Codes live in the
// AGENCY_CODES environment variable (comma-separated) — never in the
// app bundle or the repo.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";
import { setCors, requireUser } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const user = await requireUser(req, res);
  if (!user) return;

  const entered = String(req.body?.code || "").trim().toUpperCase();
  const valid = (process.env.AGENCY_CODES || "")
    .split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
  if (!entered || !valid.includes(entered)) {
    return res.status(403).json({ error: "That code isn't valid" });
  }

  const { data, error } = await supabase
    .from("users")
    .update({ plan: "agency", billing_interval: "yearly" })
    .eq("id", user.id)
    .select("plan");
  if (error || !data?.length) {
    console.error("redeem-code update failed:", error?.message || "no row");
    return res.status(500).json({ error: "Couldn't apply the code. Try again." });
  }
  return res.status(200).json({ plan: "agency", billing: "yearly" });
}
