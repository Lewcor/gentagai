// ═══════════════════════════════════════════════════════════
// api/postiz-callback.js
// Postiz redirects here after the user approves the connection.
// Exchanges the auth code for a pos_ token and saves it against
// their GENTAGAI account.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_error=${encodeURIComponent(error)}`);
  }
  if (!code || !userId) {
    return res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_error=missing_params`);
  }

  try {
    const tokenRes = await fetch("https://api.postiz.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: process.env.POSTIZ_CLIENT_ID,
        client_secret: process.env.POSTIZ_CLIENT_SECRET,
        redirect_uri: `${process.env.PUBLIC_APP_URL}/api/postiz-callback`,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Postiz token exchange failed:", errText);
      return res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    // tokenData.access_token is the pos_... token

    // Pull their connected accounts right away so the UI has something to show
    const integrationsRes = await fetch("https://api.postiz.com/public/v1/integrations", {
      headers: { Authorization: tokenData.access_token },
    });
    const integrations = integrationsRes.ok ? await integrationsRes.json() : [];

    await supabase.from("postiz_connections").upsert({
      user_id: userId,
      postiz_token: tokenData.access_token,
      postiz_refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      connected_accounts: integrations,
    });

    res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_connected=true`);
  } catch (err) {
    console.error("Postiz callback error:", err);
    res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_error=server_error`);
  }
}
