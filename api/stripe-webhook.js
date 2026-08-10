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
  // "price_XXXXXXXXXXXXXX": { plan: "pro", interval: "monthly" },
  // "price_XXXXXXXXXXXXXX": { plan: "pro", interval: "annual" },
  // "price_XXXXXXXXXXXXXX": { plan: "agency", interval: "monthly" },
  // "price_XXXXXXXXXXXXXX": { plan: "agency", interval: "annual" },
};
