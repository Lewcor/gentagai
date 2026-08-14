// ═══════════════════════════════════════════════════════════
// api/postiz-posts.js
// Pulls the CURRENT USER'S OWN recent post captions from their
// connected Postiz account — used so BISHOP can learn a brand's
// real voice from what they've already posted, for anyone who
// doesn't have a website to scan.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, integrationId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // last 90 days of real posts

    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const postizRes = await fetch(`https://api.postiz.com/public/v1/posts?${params}`, {
      headers: { Authorization: connection.postiz_token },
    });

    const data = await postizRes.json();

    if (!postizRes.ok) {
      if (postizRes.status === 401) {
        return res.status(401).json({ error: "Postiz connection expired — please reconnect" });
      }
      return res.status(postizRes.status).json({ error: data });
    }

    const allPosts = Array.isArray(data.posts) ? data.posts : (Array.isArray(data) ? data : []);

    // Extract real caption text, optionally filtered to one connected account
    const captions = [];
    for (const post of allPosts) {
      const values = post.posts || post.value || [];
      for (const v of Array.isArray(values) ? values : [post]) {
        const belongsToIntegration = !integrationId || v.integration?.id === integrationId || post.integration?.id === integrationId;
        const text = v.content || v.value?.[0]?.content || "";
        if (text && belongsToIntegration) captions.push(text);
      }
    }

    return res.status(200).json({
      captions: captions.slice(0, 20),
      postCount: captions.length,
    });
  } catch (err) {
    console.error("Postiz posts fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}
