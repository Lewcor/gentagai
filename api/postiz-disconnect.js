// ═══════════════════════════════════════════════════════════
// api/postiz-disconnect.js
// Disconnects a single connected platform (Postiz "integration")
// from the user's account, then refreshes the cached list in
// Supabase so postiz-integrations.js reflects it immediately.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, integrationId } = req.body || {};
  if (!userId || !integrationId) {
    return res.status(400).json({ error: "Missing userId or integrationId" });
  }

  const { data: connection, error: fetchError } = await supabase
    .from("postiz_connections")
    .select("postiz_token, connected_accounts")
    .eq("user_id", userId)
    .single();

  if (fetchError || !connection) {
    return res.status(404).json({ error: "No Postiz account connected for this user" });
  }

  try {
    const delRes = await fetch(`https://api.postiz.com/public/v1/integrations/${integrationId}`, {
      method: "DELETE",
      headers: { Authorization: connection.postiz_token },
    });

    // A 404 here means it's already gone on Postiz's side — treat that as
    // success rather than an error, same as any other delete-is-idempotent case.
    if (!delRes.ok && delRes.status !== 404) {
      const errText = await delRes.text();
      console.error("Postiz disconnect failed:", delRes.status, errText);
      return res.status(502).json({ error: "Couldn't disconnect that account — try again." });
    }

    const remaining = (connection.connected_accounts || []).filter(i => i.id !== integrationId);
    const { error: updateError } = await supabase.from("postiz_connections")
      .update({ connected_accounts: remaining })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update cached integrations after disconnect:", updateError.message);
      // The disconnect itself still succeeded on Postiz's side, so don't
      // report this as a failure — the next status refetch will self-correct.
    }

    return res.status(200).json({ connected: remaining.length > 0, integrations: remaining });
  } catch (err) {
    console.error("Postiz disconnect error:", err);
    return res.status(500).json({ error: "Failed to disconnect — try again." });
  }
}
