export const config = { runtime: 'edge' };

// ─────────────────────────────────────────────
// AI VISIBILITY SCAN
// Checks a real site's robots.txt for AI crawler blocks, and its
// homepage for the on-page signals AI models rely on (schema markup,
// meta description, title, H1). Returns a real score + real issues —
// no fake numbers, no simulated results.
// ─────────────────────────────────────────────

const AI_CRAWLERS = [
  { id: 'gptbot', label: 'GPTBot', org: 'OpenAI (ChatGPT)' },
  { id: 'chatgpt-user', label: 'ChatGPT-User', org: 'OpenAI (ChatGPT browsing)' },
  { id: 'claudebot', label: 'ClaudeBot', org: 'Anthropic (Claude)' },
  { id: 'anthropic-ai', label: 'anthropic-ai', org: 'Anthropic (Claude)' },
  { id: 'google-extended', label: 'Google-Extended', org: 'Google (Gemini)' },
  { id: 'perplexitybot', label: 'PerplexityBot', org: 'Perplexity' },
  { id: 'ccbot', label: 'CCBot', org: 'Common Crawl (used by many AI trainers)' },
  { id: 'bytespider', label: 'Bytespider', org: 'ByteDance' },
  { id: 'applebot-extended', label: 'Applebot-Extended', org: 'Apple Intelligence' },
];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// Groups consecutive User-agent lines per the robots.txt spec, then
// attaches following Disallow rules to every agent in that group.
function parseRobots(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rules = {};
  let pendingAgents = [];
  let sawRuleSincePending = false;

  for (const raw of lines) {
    if (raw.startsWith('#')) continue;
    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim().toLowerCase();
    const val = raw.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (sawRuleSincePending) { pendingAgents = []; sawRuleSincePending = false; }
      const agent = val.toLowerCase();
      pendingAgents.push(agent);
      if (!rules[agent]) rules[agent] = [];
    } else if (key === 'disallow') {
      sawRuleSincePending = true;
      for (const a of pendingAgents) rules[a].push(val);
    } else if (key === 'allow') {
      sawRuleSincePending = true;
    }
  }
  return rules;
}

function isBlocked(rules, crawlerLower) {
  const specific = rules[crawlerLower];
  if (specific && specific.length) {
    return specific.some(p => p === '/');
  }
  const wildcard = rules['*'];
  if (wildcard && wildcard.length) {
    return wildcard.some(p => p === '/');
  }
  return false;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { url } = await req.json();
    if (!url) return json({ error: 'Missing url' }, 400);

    let target;
    try {
      target = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return json({ error: 'That doesn\'t look like a valid URL' }, 400);
    }

    const origin = target.origin;
    const fetchOpts = { headers: { 'User-Agent': 'GentagaiVisibilityBot/1.0 (+https://gentagai.com)' } };

    // ── robots.txt ──
    let robotsText = '';
    let robotsFound = false;
    try {
      const r = await fetch(`${origin}/robots.txt`, fetchOpts);
      if (r.ok) { robotsText = await r.text(); robotsFound = true; }
    } catch {}

    const rules = parseRobots(robotsText);
    const crawlers = AI_CRAWLERS.map(c => ({ ...c, blocked: isBlocked(rules, c.id) }));
    const blockedCount = crawlers.filter(c => c.blocked).length;

    // ── homepage ──
    let html = '';
    let pageFetched = false;
    try {
      const r = await fetch(target.toString(), fetchOpts);
      if (r.ok) { html = await r.text(); pageFetched = true; }
    } catch {}

    const hasSchema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
    const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const hasTitle = !!(titleMatch && titleMatch[1].trim());
    const hasH1 = /<h1[\s>]/i.test(html);

    // ── Pull real visible copy so BISHOP can learn the site's actual voice ──
    let siteCopy = '';
    if (pageFetched && html) {
      const noScripts = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');
      const textOnly = noScripts
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      siteCopy = textOnly.slice(0, 3000);
    }

    let score = 100;
    score -= blockedCount * 8;
    if (!hasSchema) score -= 15;
    if (!hasMetaDescription) score -= 10;
    if (!hasTitle) score -= 5;
    if (!hasH1) score -= 5;
    if (!robotsFound) score -= 5;
    if (!pageFetched) score -= 20;
    score = Math.max(0, Math.min(100, score));

    const issues = [];
    if (blockedCount > 0) issues.push(`${blockedCount} AI crawler${blockedCount > 1 ? 's are' : ' is'} explicitly blocked in robots.txt`);
    if (!hasSchema) issues.push('No structured data (schema.org / JSON-LD) found — AI models rely on this to understand your content');
    if (!hasMetaDescription) issues.push('No meta description found — AI tools often use this to summarize your page');
    if (!hasTitle) issues.push('No page title found');
    if (!hasH1) issues.push('No H1 heading found — helps AI identify your main topic');
    if (!robotsFound) issues.push('No robots.txt found — AI crawlers have no explicit confirmation they\'re welcome');
    if (!pageFetched) issues.push('Could not fetch the homepage — the site may be blocking automated requests entirely');

    return json({
      url: target.toString(),
      score,
      robotsFound,
      pageFetched,
      crawlers,
      hasSchema,
      hasMetaDescription,
      hasTitle,
      hasH1,
      issues,
      siteCopy,
      pageTitle: hasTitle ? titleMatch[1].trim() : '',
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
