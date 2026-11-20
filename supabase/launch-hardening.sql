-- GENTAGAI launch hardening — run once in Supabase → SQL Editor.
-- Run this BEFORE deploying the launch-hardening branch.

-- 1) Server-side usage counters (monthly; reset automatically by gens_month).
alter table public.users add column if not exists gens_used  int  not null default 0;
alter table public.users add column if not exists calls_used int  not null default 0;
alter table public.users add column if not exists gens_month text;

-- 2) Stop signed-in users from editing their own plan or usage from the browser.
--    Only the server (service role) writes these now.
revoke update on public.users from anon, authenticated;
revoke all on public.pending_stripe_customers from anon, authenticated;
