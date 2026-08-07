// ═══════════════════════════════════════════════════════════
// api/postiz-publish.js
// Publishes (or schedules) a post through the CURRENT USER'S
// OWN connected Postiz account — never a shared/global key.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, integrationId, content, imageUrl, scheduleDate } = req.body;
  if (!userId || !integrationId || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data: connection, error: fetchError } = await supabase
    .from("postiz_connections")
    .select("postiz_token")
    .eq("user_id", userId)
    .single();

  if (fetchError || !connection) {
    return res.status(404).json({ error: "No Postiz account connected for this user" });
  }

  try {
    const postizRes = await fetch("https://api.postiz.com/public/v1/posts", {
      method: "POST",
      headers: {
        Authorization: connection.postiz_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: scheduleDate ? "schedule" : "now",
        date: scheduleDate || new Date().toISOString(),
        posts: [{
          integration: { id: integrationId },
          value: [{ content, image: imageUrl ? [{ path: imageUrl }] : [] }],
        }],
      }),
    });

    const data = await postizRes.json();

    if (!postizRes.ok) {
      // Token may have expired — surface a clear signal to the frontend
      // so it can prompt a reconnect instead of a generic error.
      if (postizRes.status === 401) {
        return res.status(401).json({ error: "Postiz connection expired — please reconnect" });
      }
      return res.status(postizRes.status).json({ error: data });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Postiz publish error:", err);
    res.status(500).json({ error: "Failed to publish" });
  }
}
