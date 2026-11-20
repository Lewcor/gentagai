# Launch steps (do in this order)

1. Supabase → SQL Editor → run `supabase/launch-hardening.sql`.
2. Vercel → Project → Settings → Environment Variables → add `AGENCY_CODES`
   (comma-separated staff/VIP codes). Make sure `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` already exist (the webhook uses them).
3. Merge `launch-hardening` into `main` (Vercel auto-deploys).
4. Test: sign out → Start free → you should be asked to sign in; sign in →
   generate → counter goes up; redeem a new staff code.
