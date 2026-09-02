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
    // Postiz's own API is known to occasionally return a transient 502
    // ("Application failed to respond") — same infrastructure hiccup we
    // already hit and fixed on the OAuth token exchange earlier tonight.
    // A 502/503/504 is Postiz's server failing to respond, not a
    // rejection of this specific post, so it's safe to retry once
    // before actually telling the user it failed.
    let postizRes, bodyText;
    for (let attempt = 0; attempt < 2; attempt++) {
      postizRes = await fetch("https://api.postiz.com/public/v1/posts", {
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
      if (postizRes.ok) break;
      bodyText = await postizRes.text();
      const isTransient = [502, 503, 504].includes(postizRes.status);
      if (!isTransient || attempt === 1) break;
      console.warn(`Postiz publish got ${postizRes.status}, retrying once:`, bodyText);
      await new Promise(r => setTimeout(r, 900));
    }

    // A transient 502/503 can come back as an HTML error page rather than
    // JSON — parse defensively instead of letting a bad parse mask the
    // real status behind a generic 500.
    let data;
    try { data = bodyText !== undefined ? JSON.parse(bodyText) : await postizRes.json(); }
    catch { data = { message: bodyText || "Non-JSON response from Postiz" }; }

    if (!postizRes.ok) {
      console.error("Postiz publish rejected:", postizRes.status, JSON.stringify(data));
      // Token may have expired — surface a clear signal to the frontend
      // so it can prompt a reconnect instead of a generic error.
      if (postizRes.status === 401) {
        return res.status(401).json({ error: "Postiz connection expired — please reconnect" });
      }
      const reason = [502, 503, 504].includes(postizRes.status)
        ? "Postiz is temporarily unavailable — this is on their end, please try again in a minute."
        : data;
      return res.status(postizRes.status).json({ error: reason });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Postiz publish error:", err);
    res.status(500).json({ error: "Failed to publish" });
  }
}
