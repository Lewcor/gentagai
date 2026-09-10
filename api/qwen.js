// ═══════════════════════════════════════════════════════════
// api/qwen.js
// Server-side Qwen proxy — built in, billed to GENTAGAI's own
// Alibaba DashScope API key, so users never need to bring their
// own. DashScope's international endpoint is OpenAI-compatible, so
// this mirrors api/openai.js almost exactly, just pointed at a
// different provider. Non-streaming, same reasoning as the others.
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

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "QWEN_API_KEY not configured" });
  }

  try {
    const payload = { ...req.body, stream: false };

    const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();

    if (!response.ok) {
      console.error("Qwen error:", response.status, data);
    }

    res.status(response.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(data);
  } catch (err) {
    console.error("qwen.js error:", err);
    return res.status(500).json({ error: err.message });
  }
}
