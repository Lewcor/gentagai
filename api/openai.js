// ═══════════════════════════════════════════════════════════
// api/openai.js
// Server-side ChatGPT proxy — built in, billed to GENTAGAI's own
// OpenAI API key, so users never need to bring their own. Same
// pattern as api/chat.js. Non-streaming (stream forced off even if
// the frontend payload asks for it) — the frontend's typewriter
// reveal handles the "typing" feel over the full response.
// ═══════════════════════════════════════════════════════════
import { setCors, requireUser, capTokens } from "./_auth.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const user = await requireUser(req, res);
  if (!user) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const payload = { ...req.body, stream: false, max_tokens: capTokens(req.body?.max_tokens) };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();

    if (!response.ok) {
      console.error("OpenAI error:", response.status, data);
    }

    res.status(response.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(data);
  } catch (err) {
    console.error("openai.js error:", err);
    return res.status(500).json({ error: err.message });
  }
}
