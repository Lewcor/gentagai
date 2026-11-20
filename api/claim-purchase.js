// ═══════════════════════════════════════════════════════════
// api/claim-purchase.js
// If someone paid on Stripe before creating an account, the webhook
// parked their plan under their email. When they sign in (magic link
// proves they own that email), this attaches the plan to their user.
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
  if (!user || !user.email) return;

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
