// ═══════════════════════════════════════════════════════════
// api/gemini.js
// Server-side Gemini proxy — built in, billed to GENTAGAI's own
// Google API key, so users never need to bring their own. Mirrors
// api/chat.js's pattern: standard Node function (not Edge) so it
// can wait out a slow generation instead of hitting the ~25s Edge
// response-byte ceiling. Non-streaming — the frontend does its own
// typewriter reveal over the full response, same as it already does
// for Claude.
// ═══════════════════════════════════════════════════════════
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.text();

    if (!response.ok) {
      console.error("Gemini error:", response.status, data);
    }

    res.status(response.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(data);
  } catch (err) {
    console.error("gemini.js error:", err);
    return res.status(500).json({ error: err.message });
  }
}
