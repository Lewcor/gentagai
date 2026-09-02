// ═══════════════════════════════════════════════════════════
// api/postiz-publish.js
// Publishes (or schedules) a post through the CURRENT USER'S
// OWN connected Postiz account — never a shared/global key.
//
// Postiz's /public/v1/posts endpoint has real requirements we
// weren't meeting before:
//  1. Top-level shortLink (boolean) and tags (array) are REQUIRED,
//     not optional, even when empty.
//  2. Images can't be an arbitrary external URL — Postiz rejects
//     anything not hosted on their own uploads domain. The image
//     has to go through their /public/v1/upload-from-url endpoint
//     first, which returns an {id, path} pair to reference instead.
//  3. Every post needs a platform-specific "settings" object with
//     at minimum a __type field matching the network, and several
//     networks (Instagram, TikTok) require additional fields inside
//     that settings object or Postiz rejects the whole request.
// ═══════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Builds the minimum valid settings block Postiz requires per platform.
// identifier is whatever Postiz's own /integrations list calls this
// channel (e.g. "instagram", "tiktok", "linkedin", "instagram-standalone").
function buildSettings(identifier) {
  switch (identifier) {
    case "instagram":
    case "instagram-standalone":
      return { __type: identifier, post_type: "post", is_trial_reel: false, collaborators: [] };
    case "tiktok":
      return {
        __type: "tiktok",
        title: "",
        privacy_level: "PUBLIC_TO_EVERYONE",
        duet: true,
        stitch: true,
        comment: true,
        autoAddMusic: "no",
        brand_content_toggle: false,
        brand_organic_toggle: false,
        video_made_with_ai: false,
        content_posting_method: "DIRECT_POST",
      };
    case "linkedin":
    case "linkedin-page":
      return { __type: identifier, post_as_images_carousel: false };
    case "facebook":
      return { __type: "facebook" };
    case "x":
    case "twitter":
      return { __type: "x", who_can_reply_post: "everyone", made_with_ai: false, paid_partnership: false };
    case "youtube":
      return { __type: "youtube" };
    case "pinterest":
      return { __type: "pinterest" };
    default:
      // Best-effort fallback for any platform not explicitly mapped above —
      // most networks only strictly require __type.
      return identifier ? { __type: identifier } : {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, integrationId, identifier, content, imageUrl, scheduleDate } = req.body;
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
    // Step 1 — if there's an image, it has to live on Postiz's own uploads
    // domain before a post can reference it. Upload it from our public
    // Supabase URL first.
    let image = [];
    if (imageUrl) {
      const uploadRes = await fetch("https://api.postiz.com/public/v1/upload-from-url", {
        method: "POST",
        headers: {
          Authorization: connection.postiz_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: imageUrl }),
      });
      const uploadData = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok || !uploadData?.id) {
        console.error("Postiz upload-from-url failed:", uploadRes.status, uploadData);
        return res.status(uploadRes.status || 502).json({
          error: "Couldn't upload the image to Postiz — try again in a moment.",
        });
      }
      image = [{ id: uploadData.id, path: uploadData.path }];
    }

    // Step 2 — the actual post, with a retry once on a transient 502/503/504
    // (same Postiz infrastructure flakiness we already hit on the OAuth
    // token exchange).
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
          shortLink: false,
          tags: [],
          posts: [{
            integration: { id: integrationId },
            value: [{ content, image }],
            settings: buildSettings(identifier),
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

    let data;
    try { data = bodyText !== undefined ? JSON.parse(bodyText) : await postizRes.json(); }
    catch { data = { message: bodyText || "Non-JSON response from Postiz" }; }

    if (!postizRes.ok) {
      console.error("Postiz publish rejected:", postizRes.status, JSON.stringify(data));
      if (postizRes.status === 401) {
        return res.status(401).json({ error: "Postiz connection expired — please reconnect" });
      }
      const reason = [502, 503, 504].includes(postizRes.status)
        ? "Postiz is temporarily unavailable — this is on their end, please try again in a minute."
        : Array.isArray(data.message) ? data.message.join("; ") : (data.message || data);
      return res.status(postizRes.status).json({ error: reason });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Postiz publish error:", err);
    res.status(500).json({ error: "Failed to publish" });
  }
}
