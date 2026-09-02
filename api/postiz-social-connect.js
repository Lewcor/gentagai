// ═══════════════════════════════════════════════════════════
// api/postiz-social-connect.js
// Once a user has completed the one-time Postiz account link
// (postiz-connect.js), this jumps them STRAIGHT into a single
// platform's own OAuth screen — Instagram, TikTok, X, etc. —
// instead of Postiz's generic "pick a platform" picker.
// Uses Postiz's GET /public/v1/social/{integration} endpoint,
// which needs the org-level pos_ token we already stored.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { userId, platform } = req.query;
  if (!userId || !platform) {
    return res.status(400).send("Missing userId or platform");
  }

  const { data: connection, error: fetchError } = await supabase
    .from("postiz_connections")
    .select("postiz_token")
    .eq("user_id", userId)
    .single();

  if (fetchError || !connection) {
    // No org-level token yet — that one-time handshake has to happen first.
    return res.redirect(302, `/api/postiz-connect?userId=${userId}`);
  }

  try {
    const urlRes = await fetch(`https://api.postiz.com/public/v1/social/${encodeURIComponent(platform)}`, {
      headers: { Authorization: connection.postiz_token },
    });
    const data = await urlRes.json();

    if (!urlRes.ok || !data.url) {
      console.error("postiz-social-connect failed:", urlRes.status, data);
      return res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_error=platform_connect_failed`);
    }

    return res.redirect(302, data.url);
  } catch (err) {
    console.error("postiz-social-connect error:", err);
    return res.redirect(302, `${process.env.PUBLIC_APP_URL}/?postiz_error=platform_connect_failed`);
  }
}
