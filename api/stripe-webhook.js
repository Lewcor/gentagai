// ==========================================================
// api/stripe-webhook.js
// Vercel Serverless Function — receives events from Stripe
// whenever a subscription is created, updated, or cancelled.
// This is what makes "plan" real and server-verified instead
// of something the browser just assumes after a redirect.
// ==========================================================

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY is missing or empty');
}
const stripe = new Stripe(stripeKey);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role = full write access, server-only
);

// Map your 4 real Stripe Price IDs to plan + billing interval.
// Fill these in from Stripe Dashboard → Product catalog → each price's ID (starts with "price_").
const PRICE_MAP = {
  "price_1TzlSbLCObk4zWm60tnChZHf": { plan: "pro",    billing_interval: "monthly" },
  "price_1TzmfJLCObk4zWm6WGFzuBXc": { plan: "pro",    billing_interval: "yearly"  },
  "price_1TzmprLCObk4zWm6kb6JC0zO": { plan: "agency", billing_interval: "monthly" },
  "price_1TzmvcLCObk4zWm69h4Aj5PK": { plan: "agency", billing_interval: "yearly"  },
  "price_1U2OssLCObk4zWm6TLy2hLMa": { plan: "pro",    billing_interval: "monthly" }, // TEMP TEST — remove after verifying
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  const rawBody = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;
        const stripeCustomerId = session.customer;
        const subscriptionId = session.subscription;

        if (!customerEmail) break;

        // Pull the price ID from the subscription to know which plan they bought
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const mapped = PRICE_MAP[priceId];
        if (!mapped) {
          console.error("Unrecognized price ID on checkout:", priceId);
          break;
        }

        // Find or create the user by email, then set their plan.
        // (They may not have signed up / logged in via magic link yet —
        // this upserts by email so plan is ready the moment they do.)
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();

        if (existing) {
          await supabase.from("users").update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscriptionId,
            plan: mapped.plan,
            billing_interval: mapped.billing_interval,
          }).eq("id", existing.id);
        } else {
          // No auth account yet — stash a pending record keyed by email.
          await supabase.from("pending_stripe_customers").upsert({
            email: customerEmail,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscriptionId,
            plan: mapped.plan,
            billing_interval: mapped.billing_interval,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price?.id;
        const mapped = PRICE_MAP[priceId];
        if (!mapped) break;

        await supabase.from("users")
          .update({ plan: mapped.plan, billing_interval: mapped.billing_interval })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabase.from("users")
          .update({ plan: "free", billing_interval: null })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        break; // ignore events we don't care about
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
