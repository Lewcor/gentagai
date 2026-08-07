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
    redirect_uri: `${process.env.PUBLIC_APP_URL}/api/postiz-callback`,
    response_type: "code",
    state: userId, // carries the GENTAGAI user id through the round trip
    scope: "posts:write integrations:read",
  });

  res.redirect(302, `https://api.postiz.com/oauth/authorize?${params.toString()}`);
}
