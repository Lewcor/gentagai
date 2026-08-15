// ═══════════════════════════════════════════════════════════
// api/postiz-connect.js
// Starts the "Connect via Postiz" OAuth flow for a logged-in
// GENTAGAI user. Redirects them to Postiz's authorization page.
// ═══════════════════════════════════════════════════════════
export default async function handler(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const params = new URLSearchParams({
    client_id: process.env.POSTIZ_CLIENT_ID,
    response_type: "code",
    state: userId, // carries the GENTAGAI user id through the round trip
  });

  // NOTE: authorize lives on platform.postiz.com (user-facing),
  // NOT api.postiz.com (backend/API-only — returns JSON, no consent screen).
  // redirect_uri isn't passed here — it's fixed per-app in the Postiz
  // dashboard under Settings → Developers → Apps.
  res.redirect(302, `https://platform.postiz.com/oauth/authorize?${params.toString()}`);
}
