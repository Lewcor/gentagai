// ═══════════════════════════════════════════════════════════
// api/bishop-judge.js
// "BISHOP Multi-AI" — the judge step. The frontend fans a prompt
// out to every connected model in parallel (Claude, Gemini,
// ChatGPT — Qwen later), collects whichever answers actually came
// back, and sends them here. This endpoint has Claude pick the
// single strongest one, or merge their best specific details into
// one tighter answer, and returns ONLY that — never the raw
// candidates. The person asking only ever sees BISHOP's one answer,
// same as any other generation.
//
// Candidates are anonymized as "Option A/B/C" before judging, so
// the judge can't just default to whichever answer sounds like its
// own voice. Node runtime (not Edge) with the same duration ceiling
// as chat.js, since this is one more real Claude call on top of
// whatever the frontend already spent fanning out.
// ═══════════════════════════════════════════════════════════
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { prompt, candidates } = req.body || {};
  if (!prompt || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: "Missing prompt or candidates" });
  }

  const labeled = candidates
    .filter(c => typeof c === "string" && c.trim())
    .map((c, i) => `── OPTION ${String.fromCharCode(65 + i)} ──\n${c.trim()}`)
    .join("\n\n");

  const judgePrompt = `You were given this brief:\n\n"""${prompt}"""\n\nHere are ${candidates.length} independent answers to it from different writers:\n\n${labeled}\n\nPick whichever single option best fulfills the brief, OR combine the strongest specific details from more than one into one tighter answer if that genuinely produces a better result than any single option alone. Return ONLY the final answer, in the exact format the brief asked for. Do not mention "Option A/B/C", do not compare the options, do not explain your choice — just output the final answer as if you wrote it directly.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: judgePrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("bishop-judge Anthropic error:", response.status, data);
      return res.status(response.status).json({ error: data?.error?.message || "Judge call failed" });
    }

    const result = data.content?.map(b => b.text || "").join("") || "";
    if (!result.trim()) {
      return res.status(502).json({ error: "Judge returned an empty result" });
    }

    return res.status(200).json({ result });
  } catch (err) {
    console.error("bishop-judge error:", err);
    return res.status(500).json({ error: err.message });
  }
}
