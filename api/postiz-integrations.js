// ═══════════════════════════════════════════════════════════
// api/postiz-integrations.js
// Returns the current user's connected social accounts (from
// Postiz), refreshing the cache if the stored copy looks stale.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const { data: connection } = await supabase
    .from("postiz_connections")
    .select("postiz_token, connected_accounts, updated_at")
    .eq("user_id", userId)
    .single();

  if (!connection) {
    return res.status(200).json({ connected: false, integrations: [] });
  }

  try {
    const liveRes = await fetch("https://api.postiz.com/public/v1/integrations", {
      headers: { Authorization: connection.postiz_token },
    });

    if (liveRes.status === 401) {
      return res.status(200).json({ connected: false, expired: true, integrations: [] });
    }

    const integrations = liveRes.ok ? await liveRes.json() : connection.connected_accounts || [];

    // Keep the cache fresh for next time
    await supabase.from("postiz_connections")
      .update({ connected_accounts: integrations })
      .eq("user_id", userId);

    res.status(200).json({ connected: true, integrations });
  } catch (err) {
    // Fall back to cached copy if Postiz is briefly unreachable
    res.status(200).json({ connected: true, integrations: connection.connected_accounts || [], stale: true });
  }
}
