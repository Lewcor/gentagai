// ═══════════════════════════════════════════════════════════
// api/ai.js
// ONE serverless function for every paid-model proxy (Claude, Gemini,
// ChatGPT, Qwen, and the BISHOP judge). Vercel's Hobby plan allows at
// most 12 functions per deployment, so these used to be five separate
// files and blew the limit. vercel.json rewrites keep the old URLs
// working: /api/chat → /api/ai?p=chat, and so on.
//
// Every call: must be signed in, is metered against the user's plan,
// and has its token ask capped (see _auth.js).
// ═══════════════════════════════════════════════════════════
import { setCors, guardCall, capTokens } from "./_auth.js";

export const config = { maxDuration: 60 };

async function callClaude(req, res) {

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

async function callGemini(req, res) {

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

async function callOpenAI(req, res) {

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

async function callQwen(req, res) {

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "QWEN_API_KEY not configured" });
  }

  try {
    const payload = { ...req.body, stream: false, max_tokens: capTokens(req.body?.max_tokens) };

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

async function callJudge(req, res) {

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

const ROUTES = { chat: callClaude, gemini: callGemini, openai: callOpenAI, qwen: callQwen, judge: callJudge };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const route = ROUTES[String(req.query?.p || "")];
  if (!route) return res.status(404).json({ error: "Unknown endpoint" });
  const user = await guardCall(req, res);
  if (!user) return;
  return route(req, res);
}
