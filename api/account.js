// ═══════════════════════════════════════════════════════════
// api/account.js
// ONE serverless function for the signed-in account actions:
//   use-generation  count a generation against the plan (or peek)
//   redeem-code     staff / VIP code → Agency plan (codes in AGENCY_CODES env)
//   claim-purchase  attach a pre-signup Stripe purchase to the user
// vercel.json rewrites keep the URLs: /api/use-generation → /api/account?a=use-generation
// (Merged to stay under Vercel Hobby's 12-function limit.)
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";
import { setCors, requireUser, meter } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function useGeneration(req, res, user) {
  const peek = !!(req.body && req.body.peek);
  const m = await meter(user, peek ? "peek" : "generation");
  return res.status(m.ok ? 200 : m.status).json(m.body);
}

async function redeemCode(req, res, user) {
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

async function claimPurchase(req, res, user) {
  if (!user.email) return res.status(200).json({ claimed: false });
  const { data: pending } = await supabase
    .from("pending_stripe_customers")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();
  if (!pending) return res.status(200).json({ claimed: false });
  const { error } = await supabase.from("users").update({
    stripe_customer_id: pending.stripe_customer_id,
    stripe_subscription_id: pending.stripe_subscription_id,
    plan: pending.plan,
    billing_interval: pending.billing_interval,
  }).eq("id", user.id);
  if (error) {
    console.error("claim-purchase update failed:", error.message);
    return res.status(500).json({ error: "Couldn't attach your purchase" });
  }
  await supabase.from("pending_stripe_customers").delete().eq("email", user.email);
  return res.status(200).json({ claimed: true, plan: pending.plan, billing: pending.billing_interval });
}

const ROUTES = { "use-generation": useGeneration, "redeem-code": redeemCode, "claim-purchase": claimPurchase };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const route = ROUTES[String(req.query?.a || "")];
  if (!route) return res.status(404).json({ error: "Unknown endpoint" });
  const user = await requireUser(req, res);
  if (!user) return;
  return route(req, res, user);
}
