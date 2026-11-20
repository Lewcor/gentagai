// ═══════════════════════════════════════════════════════════
// api/chat.js
// Proxies chat/vision/generation requests to Claude.
//
// This was previously a Vercel Edge Function. Edge Functions must
// send their FIRST response byte within ~25 seconds even on paid
// plans — a hard platform rule, not something retries or timeouts
// on our end can work around. Since this endpoint waits for
// Claude's full response before replying (no streaming), any
// generation that legitimately took longer than ~25s — a vision
// analysis, a longer caption, a slower moment on Anthropic's end —
// hit that Edge ceiling and came back as a bare 504, with nothing
// useful in the body to explain why.
//
// A standard Node serverless function (this file, now) has a much
// higher duration ceiling on the same plan, so it can actually wait
// out a slow generation instead of getting cut off by the runtime
// itself. Behavior and response shape are otherwise unchanged.
// ═══════════════════════════════════════════════════════════
import { setCors, requireUser, capTokens } from "./_auth.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const user = await requireUser(req, res);
  if (!user) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const payload = {
      ...req.body,
      max_tokens: capTokens(req.body?.max_tokens),
      model: "claude-haiku-4-5-20251001",
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();

    if (!response.ok) {
      console.error("Anthropic error:", response.status, data);
    }

    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/json");
    return res.send(data);
  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(500).json({ error: err.message });
  }
}
