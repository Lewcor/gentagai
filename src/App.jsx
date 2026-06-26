/* eslint-disable */
import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────
// CONFIG — paste your Stripe Payment Links here
// ─────────────────────────────────────────────
const STRIPE_LINKS = {
  pro_monthly:    "https://buy.stripe.com/YOUR_PRO_MONTHLY_LINK",
  pro_yearly:     "https://buy.stripe.com/YOUR_PRO_YEARLY_LINK",
  agency_monthly: "https://buy.stripe.com/YOUR_AGENCY_MONTHLY_LINK",
  agency_yearly:  "https://buy.stripe.com/YOUR_AGENCY_YEARLY_LINK",
};
const DOMAIN = "gentagai.com";
const VERSION = "1.0.0";
const STORAGE_KEY = "gentagai_v1";

// ─────────────────────────────────────────────
// AGENCY ACCESS CODES — staff free access
// ─────────────────────────────────────────────
const AGENCY_CODES = [
  "GNTG-STAFF-001",
  "GNTG-STAFF-002",
  "GNTG-STAFF-003",
  "GNTG-STAFF-004",
  "GNTG-STAFF-005",
  "GNTG-STAFF-006",
  "GNTG-STAFF-007",
  "GNTG-STAFF-008",
  "GNTG-STAFF-009",
  "GNTG-LEWCOR-VIP",
];

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────
const PLANS = {
  free: {
    id:"free", name:"Starter", price:0, priceYear:0,
    color:"#6a8aa8", badge:"FREE",
    gens: 5,
    features:["5 generations / month","Copy Engine only","Instagram & TikTok","3 tones","Basic hooks & captions","Community support"],
    locked:["Image Prompt Engine","Video Ads Engine","A/B Testing + AI Scoring","All 8 platforms","Email campaigns","SEO & product launch","Session history","Priority support"],
  },
  pro: {
    id:"pro", name:"Pro", price:29, priceYear:19,
    color:"#f0b429", badge:"PRO",
    gens: 200,
    features:["200 generations / month","All 4 engine modes","All 8 platforms","All 6 tones","Full content library","Image prompts (4 AI tools)","Video Ads (6 formats + tools)","A/B Testing + AI scoring","Session auto-save (50 sessions)","Email support"],
    locked:["Unlimited generations","White-label exports","Team seats","API access","Dedicated manager"],
  },
  agency: {
    id:"agency", name:"Agency", price:49, priceYear:34,
    color:"#7c83fd", badge:"AGENCY",
    gens: Infinity,
    features:["Unlimited generations","Everything in Pro","White-label exports","5 team seats","API access","Priority + dedicated manager","Custom brand presets","Bulk content calendar","Advanced analytics"],
    locked:[],
  },
};

// ─────────────────────────────────────────────
// DATA CONSTANTS
// ─────────────────────────────────────────────
const PLATFORMS = [
  {id:"instagram",label:"Instagram",icon:"◈",free:true},
  {id:"tiktok",label:"TikTok",icon:"◎",free:true},
  {id:"twitter",label:"X / Twitter",icon:"✕",free:false},
  {id:"facebook",label:"Facebook",icon:"◉",free:false},
  {id:"linkedin",label:"LinkedIn",icon:"▣",free:false},
  {id:"email",label:"Email",icon:"◻",free:false},
  {id:"youtube",label:"YouTube",icon:"▷",free:false},
  {id:"pinterest",label:"Pinterest",icon:"◈",free:false},
];
const CONTENT_TYPES = [
  {id:"viral_hook",label:"Viral Hook",desc:"Algorithm-triggering openers",free:true},
  {id:"caption",label:"Post Caption",desc:"Full caption + hashtags",free:true},
  {id:"email",label:"Email Campaign",desc:"Subject + full copy",free:false},
  {id:"ad_copy",label:"Ad Copy",desc:"Paid ad scripts",free:false},
  {id:"seo_blog",label:"SEO Blog Intro",desc:"Google-optimized opening",free:false},
  {id:"story",label:"Story / Reel Script",desc:"Short-form video script",free:false},
  {id:"product_launch",label:"Product Launch",desc:"Full launch suite",free:false},
  {id:"cta",label:"CTA Bundle",desc:"10 high-converting CTAs",free:false},
];
const IMAGE_TYPES = [
  {id:"img_product",label:"Product Shot",desc:"Hero product photography"},
  {id:"img_editorial",label:"Editorial / Lookbook",desc:"Fashion editorial scene"},
  {id:"img_lifestyle",label:"Lifestyle Campaign",desc:"Aspirational lifestyle"},
  {id:"img_ad",label:"Paid Ad Visual",desc:"High-converting creative"},
  {id:"img_story",label:"Story Background",desc:"Full-screen backdrop"},
  {id:"img_brand",label:"Brand Scene",desc:"Branded environment"},
];
const IMAGE_TOOLS = [
  {id:"midjourney",label:"Midjourney",color:"#7c83fd"},
  {id:"dalle",label:"DALL-E 3",color:"#00e5ff"},
  {id:"firefly",label:"Adobe Firefly",color:"#ff7c00"},
  {id:"stable",label:"Stable Diffusion",color:"#00ff88"},
];
const VIDEO_AD_TYPES = [
  {id:"tiktok_ad",label:"TikTok / Reels Ad",desc:"15-60s vertical ad"},
  {id:"youtube_pre",label:"YouTube Pre-Roll",desc:"6-30s skippable ad"},
  {id:"fb_video",label:"Facebook / IG Feed",desc:"Square or landscape"},
  {id:"story_ad",label:"Story Ad",desc:"9:16 full-screen"},
  {id:"brand_film",label:"Brand Mini-Film",desc:"60-90s cinematic story"},
  {id:"product_demo",label:"Product Demo",desc:"Feature showcase"},
];
const VIDEO_TOOLS = [
  {id:"runway",label:"Runway Gen-4",color:"#00e5ff"},
  {id:"pika",label:"Pika 2.0",color:"#ff6eb4"},
  {id:"sora",label:"Sora",color:"#00ff88"},
  {id:"kling",label:"Kling AI",color:"#f0b429"},
  {id:"heygen",label:"HeyGen",color:"#7c83fd"},
  {id:"capcut",label:"CapCut AI",color:"#ff4500"},
];

// ─────────────────────────────────────────────
// AI BRAIN OPTIONS — for analysis & prompts
// ─────────────────────────────────────────────
const AI_BRAINS = [
  {
    id:"claude",label:"Claude",sub:"Anthropic",color:"#f0b429",icon:"◈",
    desc:"Built-in · No key needed",
    model:"claude-3-5-sonnet-20241022",free:true,
    link:"https://claude.ai",
  },
  {
    id:"gemini",label:"Gemini",sub:"Google",color:"#4285f4",icon:"✦",
    desc:"Requires Gemini API key",
    model:"gemini-1.5-pro",free:false,
    link:"https://aistudio.google.com/apikey",
    apiEndpoint:"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
  },
  {
    id:"chatgpt",label:"ChatGPT",sub:"OpenAI",color:"#10a37f",icon:"★",
    desc:"Requires OpenAI API key",
    model:"gpt-4o",free:false,
    link:"https://platform.openai.com/api-keys",
    apiEndpoint:"https://api.openai.com/v1/chat/completions",
  },
];
const TONES = [
  {id:"hype",label:"🔥 Hype",color:"#ff4500",free:true},
  {id:"luxury",label:"✦ Luxury",color:"#f0b429",free:true},
  {id:"raw",label:"⚡ Raw & Real",color:"#00e5ff",free:true},
  {id:"professional",label:"◈ Professional",color:"#7c83fd",free:false},
  {id:"playful",label:"★ Playful",color:"#ff6eb4",free:false},
  {id:"urgency",label:"⚠ FOMO",color:"#ff2d2d",free:false},
];
const AB_VARIABLES = [
  {id:"tone",label:"Luxury vs Street",desc:"Aspirational vs raw voice"},
  {id:"hook_angle",label:"Curiosity vs Controversy",desc:"Intrigue vs bold claim"},
  {id:"length",label:"Short vs Long Form",desc:"Punchy vs story-driven"},
  {id:"cta_style",label:"Soft Sell vs Urgent",desc:"Invite vs FOMO pressure"},
  {id:"audience",label:"Fans vs Cold Traffic",desc:"Insiders vs new discovery"},
];
const NICHE_PRESETS = [
  "Streetwear / Fashion","Fitness & Wellness","Tech & SaaS","Food & Beverage",
  "Real Estate","Beauty & Skincare","Music & Entertainment","E-Commerce / DTC",
  "Finance & Crypto","Travel & Lifestyle","Education & Coaching","NFT & Web3",
];

// ─────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────
const toneDesc={hype:"high-energy, hype culture, explosive",luxury:"sophisticated, exclusive, premium luxury",raw:"authentic, raw, unfiltered, relatable",professional:"polished, authoritative, expert-level",playful:"witty, fun, personality-driven",urgency:"urgent, scarcity-driven, FOMO-inducing"};
const pCtx={instagram:"Instagram (saves, shares, carousel, hashtags)",tiktok:"TikTok (watch time, comments, trending audio)",twitter:"X/Twitter (retweets, replies, threads)",facebook:"Facebook (shares, comments, virality)",linkedin:"LinkedIn (professional engagement)",email:"Email (open rate, conversions)",youtube:"YouTube (watch time, SEO titles)",pinterest:"Pinterest (saves, SEO descriptions)"};
const pRatio={instagram:"4:5 or 1:1",tiktok:"9:16 vertical",twitter:"16:9",facebook:"1.91:1",linkedin:"1.91:1",email:"600px banner",youtube:"16:9",pinterest:"2:3 portrait"};

function getTask(ct,p,kw){
  const pc=pCtx[p]||p;
  return({viral_hook:`Generate 5 VIRAL hooks for ${pc}. Each stops scroll in 2 seconds. Format: TYPE → Hook → Why it works.`,caption:`Full platform-native caption for ${pc}: opener, body, CTA, 25+ hashtags.`,email:`Email campaign:\n1. SUBJECT LINES (3 options)\n2. PREVIEW TEXT\n3. FULL BODY (hook, value, story, CTA)\n4. P.S. LINE`,ad_copy:`Ad copy for ${pc}:\n1. HEADLINES (3)\n2. BODY (50-word + 150-word)\n3. CTA BUTTONS (5)\n4. TARGETING\nFrameworks: AIDA, PAS, BAB.`,seo_blog:`SEO blog intro:\n1. SEO TITLE\n2. META DESCRIPTION\n3. H1\n4. INTRO (E-E-A-T)\n5. 10 LSI KEYWORDS\n6. H2 OUTLINE\nKeywords: ${kw||"from niche"}`,story:`60-90s video script for ${pc}:\n[0-3s] HOOK · [3-15s] SETUP · [15-45s] CONTENT · [45-60s] PAYOFF · [60-90s] CTA\nText overlays, B-roll, audio cues.`,product_launch:`Full launch suite:\n1. ANNOUNCEMENT\n2. COUNTDOWN (48h/24h/1h)\n3. LAUNCH DAY CAPTION\n4. EMAIL BLAST\n5. 5 VIRAL HOOKS\n6. SCARCITY COPY\n7. POST-LAUNCH\nEnergy: Supreme/Kith/FOG.`,cta:`10 platform-native CTAs for ${pc}. Each: TEXT + trigger + goal.`})[ct]||"Generate viral marketing content.";
}
const buildCopy=({brand,niche,platform,contentType,tone,audience,goal,keywords,productName,productDesc,productType,productPrice})=>{
  const productBlock=productDesc?`\nPRODUCT INTEL:\n- Product: ${productName||"Unnamed product"}${productType?` (${productType})`:""}\n- Description: ${productDesc}${productPrice?`\n- Price / Value: ${productPrice}`:""}\nUse these product details to make the content hyper-specific, benefit-driven, and conversion-ready. Reference the product naturally — don't just list features, make people WANT it.`:"";
  return `You are GENTAGAI — elite AI marketing engine.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35 urban"} | GOAL: ${goal||"awareness+sales"} | TONE: ${toneDesc[tone]} | KEYWORDS: ${keywords||"from niche"}${productBlock}\nTASK: ${getTask(contentType,platform,keywords)}\nRULES: Zero filler. Creative director energy. Platform-native. Copy-paste ready.\nFORMAT: Clear headers with ── separators.`;
};
const buildImage=({brand,niche,imageType,platform,tone,audience,imageTool,productName,productDesc,productType})=>{
  const productBlock=productDesc?`\nPRODUCT: ${productName||""}${productType?` (${productType})`:""} — ${productDesc.slice(0,150)}\nMake the product the visual hero. Every prompt should make this specific product irresistible.`:"";
  const s={img_product:"hero product shot",img_editorial:"high-fashion editorial scene",img_lifestyle:"aspirational lifestyle moment",img_ad:"scroll-stopping paid ad visual",img_story:"immersive story background",img_brand:"branded architectural scene"};
  const st={hype:"raw energy, motion blur, urban grit, high contrast",luxury:"soft diffused light, editorial elegance, minimal composition",raw:"handheld documentary, candid, natural light, 35mm grain",professional:"clean studio light, commercial polish",playful:"vibrant palette, dynamic angles, bold color",urgency:"dramatic chiaroscuro, high contrast, cinematic urgency"};
  const tn={midjourney:"End with: --ar [ratio] --style raw --v 6.1 --q 2  Use --no for negatives.",dalle:"Describe exact lighting, lens mm, color grade, mood.",firefly:"Label: [Subject] [Setting] [Lighting] [Style] [Color]",stable:"Positive then NEGATIVE PROMPT: section. Add: masterpiece, 8k, photorealistic"};
  return `You are GENTAGAI Visual — expert AI image prompt engineer.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | TOOL: ${imageTool} | STYLE: ${st[tone]||st.hype} | RATIO: ${pRatio[platform]||"1:1"}${productBlock}\nSUBJECT: ${s[imageType]}\nGenerate 4 DISTINCT prompts for ${imageTool}:\n── PROMPT [N]: [Title]\nFULL PROMPT: [technical, paste-ready]\nSTYLE MODIFIERS: [lighting/lens/mood/color]\nTOOL PARAMS: [${tn[imageTool]||tn.midjourney}]\nNEGATIVE PROMPT: [exclusions]\nDEPLOY AS: [post/ad/story]\nVisual DNA: Kith, Fear of God, Supreme, Off-White, Palace.`;
};
const buildVideo=({brand,niche,videoAdType,platform,tone,audience,goal,videoTool,productName,productDesc,productType,productPrice})=>{
  const productBlock=productDesc?`\n\nPRODUCT INTEL:\n- Product: ${productName||""}${productType?` (${productType})`:""}\n- Description: ${productDesc}\n${productPrice?`- Price / Value: ${productPrice}\n`:""}\nEvery shot, every word of script, and every CTA must be built around THIS specific product. Make the viewer need it.`:"";
  const sp={tiktok_ad:{dur:"15-60s",ratio:"9:16",pace:"fast cuts every 2-3s"},youtube_pre:{dur:"6-30s",ratio:"16:9",pace:"brand in first 5s"},fb_video:{dur:"15-30s",ratio:"1:1 or 4:5",pace:"silent-ready, text overlays essential"},story_ad:{dur:"5-15s",ratio:"9:16",pace:"single message, instant impact"},brand_film:{dur:"60-90s",ratio:"16:9",pace:"emotional arc, slow build"},product_demo:{dur:"15-45s",ratio:"1:1",pace:"feature-first, benefit-driven"}};
  const spec=sp[videoAdType]||sp.tiktok_ad;
  const tg={runway:"[Scene] [Camera motion: dolly/handheld/aerial] [Lighting] [Style] [Duration]",pika:"[Scene as living photo] [Motion intensity: subtle/medium/intense] [What moves] [Cinematic style]",sora:"[Film director language: lens, DOF, color grade, time of day, subject blocking]",kling:"[Subject] [Environment] [Motion] [Mood] [Cinematic reference]",heygen:"[Presenter style] [Background] [Clothing] [Speech tone] [Lower-third text]",capcut:"[Mood] [Music energy] [Transition style] [Text overlay positions] [Color filter]"};
  return `You are GENTAGAI Video — elite AI video ad director.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | GOAL: ${goal||"conversions"} | TONE: ${toneDesc[tone]} | FORMAT: ${spec.dur} ${spec.ratio} | TOOL: ${videoTool} | PLATFORM: ${platform}${productBlock}\n\nCreate a COMPLETE video ad production package:\n\n── 1. CONCEPT & STRATEGY\nLogline, core emotion, psychological hook, why it works for ${platform}.\n\n── 2. FULL SCRIPT\nEvery word. [HOOK 0-3s] [PROBLEM/DESIRE] [SOLUTION] [PROOF] [CTA]. Pacing: ${spec.pace}\n\n── 3. SHOT-BY-SHOT STORYBOARD\nShot # | Duration | Scene | Camera | On-screen text | Audio (min 6 shots)\n\n── 4. AI VIDEO PROMPTS FOR ${videoTool.toUpperCase()}\n3 prompts for key scenes. Format: ${tg[videoTool]||tg.runway}\n\n── 5. ON-SCREEN TEXT OVERLAYS\nTiming, position, copy, style for each text element.\n\n── 6. AUDIO DIRECTION\nMusic genre/BPM, SFX, VO tone, silence moments.\n\n── 7. CTA PACKAGE\nEnd card, CTA button (3 options), URL/handle, final frame.\n\n── 8. PERFORMANCE FORECAST\nExpected watch rate, engagement triggers, algorithm signals.\n\nMake it feel like a $50,000 production brief.`;
};
const buildAB=({brand,niche,platform,contentType,tone,audience,goal,keywords,abVariable,variant,productName,productDesc,productType,productPrice})=>{
  const productBlock=productDesc?`\nPRODUCT: ${productName||""}${productType?` (${productType})`:""} — ${productDesc.slice(0,120)}${productPrice?` · ${productPrice}`:""}\nBuild the content specifically around this product.`:"";
  const v={tone:{A:"LUXURY / ASPIRATIONAL — sophisticated, exclusive, premium.",B:"RAW / STREET AUTHENTIC — gritty, unfiltered, from the culture."},hook_angle:{A:"CURIOSITY GAP — tease without revealing. Mystery and intrigue.",B:"BOLD CLAIM — polarizing, share-worthy, makes people react."},length:{A:"SHORT & PUNCHY — under 80 words. Every word load-bearing.",B:"LONG-FORM STORY — 200+ words. Emotional journey."},cta_style:{A:"SOFT SELL — community-first, value-forward, invite don't demand.",B:"DIRECT / URGENT — scarcity, exclusivity, not clicking = loss."},audience:{A:"EXISTING FANS — insiders, brand language, loyalty rewards.",B:"COLD AUDIENCE — first impression, instant credibility."}};
  return `You are GENTAGAI — elite AI marketing engine.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | GOAL: ${goal||"awareness+sales"} | TONE: ${toneDesc[tone]}${productBlock}\nVARIANT ${variant}: ${v[abVariable]?.[variant]||v.tone[variant]}\nTASK: ${getTask(contentType,platform,keywords)}\nRULES: No filler. Platform-native for ${pCtx[platform]||platform}. Copy-paste ready.\nFORMAT: Start with "── VARIANT ${variant}" header. Use ── separators.`;
};
const buildScoring=(vA,vB,ct,p)=>`Senior marketing strategist. Score two variants for ${p}.\nVARIANT A: ${vA.slice(0,700)}\nVARIANT B: ${vB.slice(0,700)}\nScore 0-100: emotional impact, scroll-stop, clarity, CTA strength, algorithm potential.\nRESPOND ONLY IN JSON (no markdown):\n{"variantA":{"emotional":0,"scrollStop":0,"clarity":0,"cta":0,"algorithm":0,"totalScore":0,"verdict":"one sentence"},"variantB":{"emotional":0,"scrollStop":0,"clarity":0,"cta":0,"algorithm":0,"totalScore":0,"verdict":"one sentence"},"winner":"A","winnerReason":"two sentences"}`;

// ── AMPLIFY PROMPT BUILDER ─────────────────────
// Used when customer uploads an already-made image or video
// AI Brain generates marketing content FROM the uploaded asset
function buildAmplifyPrompt({type,brand,niche,platform,tone,audience,goal,keywords,productName,productDesc,productType,productPrice,mediaType,mediaName,mediaSize}){
  const brandCtx=`BRAND: ${brand||"The Brand"} | NICHE: ${niche||"Fashion & Lifestyle"} | PLATFORM: ${platform} | TONE: ${toneDesc[tone]||"hype"} | AUDIENCE: ${audience||"18-35 urban"}`;
  const productCtx=productDesc?`\nPRODUCT: ${productName||"Product"}${productType?` (${productType})`:""} — ${productDesc}${productPrice?` · ${productPrice}`:""}`:goal?`\nGOAL: ${goal}`:"";
  const mediaCtx=mediaType==="image"
    ?`\nUPLOADED IMAGE: "${mediaName||"image"}" — The customer's actual finished image. Study every detail: subject, colors, lighting, composition, mood, and energy before generating.`
    :`\nUPLOADED VIDEO: "${mediaName||"video"}" (${mediaSize||"?"}MB) — The customer's actual finished video. Base everything on this specific video's context, brand, and product.`;
  const seoKW=keywords?`\nSEO KEYWORDS: ${keywords}`:"";

  const tasks={
    viral_hooks:
`Write exactly 3 VIRAL scroll-stopping hooks for this ${mediaType} on ${platform}.
Each one must stop the scroll in 2 seconds. Make them specific to this brand and product — no generic hooks.

── HOOK 1
[hook text]
TYPE: [Curiosity/Shock/FOMO/Social Proof/Controversy/Story]
WHY IT WORKS: [1-line psychology]

── HOOK 2
[hook text]
TYPE: [type]
WHY IT WORKS: [reason]

── HOOK 3
[hook text]
TYPE: [type]
WHY IT WORKS: [reason]

── BEST FOR PAID ADS
[Which of the 3 hooks works best as a paid ad opener and why]`,

    caption_pack:
`Write exactly 2 copy-paste-ready captions for this ${mediaType} on ${platform}.

── CAPTION 1: HYPE + ENGAGEMENT
[High-energy, 100-150 words, written to maximize comments and shares]
HASHTAGS: [25 hashtags — mix of niche, trending, and branded]

── CAPTION 2: SHORT & PUNCHY
[Under 20 words. Maximum impact. Minimum words. Leaves them wanting more.]
HASHTAGS: [15 hashtags]

── BEST POSTING TIME for ${platform}
── FIRST COMMENT TIP (hashtag stacking strategy)`,

    seo_suite:
`Create a focused SEO package for this ${mediaType} — everything needed to get it found.

── OPTIMIZED FILE NAME
[SEO-friendly filename]

── ALT TEXT (under 125 chars)
[Accessibility + SEO alt text — write it out]

── META DESCRIPTION (155 chars)
[For website/blog use — write it out]

── ${platform==="youtube"?"YOUTUBE: Video title (best option) + 20 tags":"PLATFORM: Post title + 10 hashtags ranked by reach"}

── TOP 10 SEO KEYWORDS
[List them, short-tail and long-tail mixed, ranked by opportunity]`,

    ad_copy:
`Write a complete paid ad copy pack for this ${mediaType}.

── FACEBOOK / INSTAGRAM AD
Primary Headline (3 options):
Ad Body (150 words):
Description line:
CTA Button: [5 options]
Targeting suggestion:

── TIKTOK SPARK AD
Hook overlay text:
Caption:
CTA overlay:
Hashtags:

── GOOGLE DISPLAY AD
Headline 1 | Headline 2 | Headline 3:
Description 1 | Description 2:
CTA:

── YOUTUBE AD (30 seconds)
[0-5s unskippable hook]:
[Full script]:

── RETARGETING COPY
[Ad copy for warm audience who already saw this ${mediaType}]`,

    trending_strategy:
`Create a complete trending + viral content strategy for this ${mediaType}.

── TREND ALIGNMENT
Current trends on ${platform} this ${mediaType} fits
Audio/sound recommendations for max algorithmic reach
Challenge or format to piggyback on

── ALGORITHM TRIGGERS
First 60 minutes action plan after posting:
- Step 1: [action]
- Step 2: [action]
- Step 3: [action]
Engagement triggers that boost reach

── CONTENT SERIES
5 follow-up pieces that build on this ${mediaType}
30-day content calendar structure

── CROSS-PLATFORM REPURPOSE
TikTok → [specific adaptation]
Instagram Reels → [specific adaptation]
YouTube Shorts → [specific adaptation]
Pinterest → [specific adaptation]
Twitter/X → [specific adaptation]

── VIRAL ACCELERATION
3 collab/duet/stitch ideas
Influencer outreach template`,

    full_suite:
`You are GENTAGAI — maximum power mode. Generate a clean, complete marketing package. Be specific and copy-paste ready. No fluff.

════════════════════════════
SECTION 1 — 3 VIRAL HOOKS
════════════════════════════
HOOK 1: [text] | TYPE: [type] | WHY: [reason]
HOOK 2: [text] | TYPE: [type] | WHY: [reason]
HOOK 3: [text] | TYPE: [type] | WHY: [reason]

════════════════════════════
SECTION 2 — 2 CAPTIONS
════════════════════════════
── HYPE CAPTION (100-130 words):
[Write it]
HASHTAGS: [25 tags]

── SHORT & PUNCHY (under 20 words):
[Write it]
HASHTAGS: [15 tags]

════════════════════════════
SECTION 3 — SEO
════════════════════════════
File name: [optimized]
Alt text: [under 125 chars]
Meta description: [155 chars]
Top 10 keywords: [list]

════════════════════════════
SECTION 4 — AD COPY
════════════════════════════
Facebook/IG — Headline: [text] | Body (60 words): [write it] | CTA: [text]
TikTok — Hook overlay: [text] | Caption: [text]

════════════════════════════
SECTION 5 — TRENDING STRATEGY
════════════════════════════
Trend alignment: [name it]
Best time to post on ${platform}: [time]
First 60-min action plan: [3 steps]`,
  };

  return `You are GENTAGAI — elite AI marketing engine. Maximum power. Zero filler.
${brandCtx}${productCtx}${mediaCtx}${seoKW}

${mediaType==="image"
  ?"IMPORTANT: You are looking at the customer's actual uploaded image. Study it carefully — the exact subject, colors, composition, lighting, mood, and energy. Every word you generate must be SPECIFICALLY tailored to what you actually see in this image. Do NOT write generic content."
  :"IMPORTANT: The customer has uploaded their actual finished video. Use all brand, product, and context details provided. Everything you generate must be built around this specific video and brand."}

TASK:
${tasks[type]||tasks.full_suite}

RULES: No filler. No generic placeholders. Write like a top creative director who has studied this exact ${mediaType}. Make every output copy-paste ready.`;
}

// ─────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────
async function streamAPI(prompt,onChunk){
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:4096,messages:[{role:"user",content:prompt}]})});
    if(!res.ok){
      const err=await res.text();
      let msg="⚠ Error "+res.status;
      try{const j=JSON.parse(err);msg="⚠ "+( j.error?.message||j.error||err.slice(0,200));}catch{}
      onChunk(msg);return msg;
    }
    const data=await res.json();
    const full=data.content?.map(b=>b.text||"").join("")||data.error?.message||"⚠ No response received";
    onChunk(full);
    return full;
  }catch(e){const msg="⚠ Connection error: "+e.message;onChunk(msg);return msg;}
}
async function callAPI(prompt){
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:4096,messages:[{role:"user",content:prompt}]})});
    if(!res.ok){const err=await res.text();return "⚠ Error: "+err.slice(0,100);}
    const data=await res.json();
    return data.content?.map(b=>b.text||"").join("")||"";
  }catch(e){return "⚠ Error: "+e.message;}
}

// Gemini text-only
async function callGemini(prompt,apiKey,onChunk){
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?alt=sse&key=${apiKey}`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:4096}})
  });
  const reader=res.body.getReader(),dec=new TextDecoder();let full="";
  while(true){
    const{done,value}=await reader.read();if(done)break;
    for(const line of dec.decode(value).split("\n")){
      if(!line.startsWith("data: "))continue;
      try{const p=JSON.parse(line.slice(6));const t=p.candidates?.[0]?.content?.parts?.[0]?.text||"";if(t){full+=t;onChunk(full);}}catch{}
    }
  }
  return full;
}

// Gemini vision (image + text)
async function callGeminiVision(prompt,base64,mimeType,apiKey,onChunk){
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?alt=sse&key=${apiKey}`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:mimeType,data:base64}},{text:prompt}]}],generationConfig:{maxOutputTokens:4096}})
  });
  const reader=res.body.getReader(),dec=new TextDecoder();let full="";
  while(true){
    const{done,value}=await reader.read();if(done)break;
    for(const line of dec.decode(value).split("\n")){
      if(!line.startsWith("data: "))continue;
      try{const p=JSON.parse(line.slice(6));const t=p.candidates?.[0]?.content?.parts?.[0]?.text||"";if(t){full+=t;onChunk(full);}}catch{}
    }
  }
  return full;
}

// ChatGPT text-only
async function callChatGPT(prompt,apiKey,onChunk){
  const res=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
    body:JSON.stringify({model:"gpt-4o",max_tokens:4096,stream:true,messages:[{role:"user",content:prompt}]})
  });
  const reader=res.body.getReader(),dec=new TextDecoder();let full="";
  while(true){
    const{done,value}=await reader.read();if(done)break;
    for(const line of dec.decode(value).split("\n")){
      if(!line.startsWith("data: "))continue;const d=line.slice(6);if(d==="[DONE]")continue;
      try{const p=JSON.parse(d);const t=p.choices?.[0]?.delta?.content||"";if(t){full+=t;onChunk(full);}}catch{}
    }
  }
  return full;
}

// ChatGPT vision
async function callChatGPTVision(prompt,base64,mimeType,apiKey,onChunk){
  const res=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
    body:JSON.stringify({model:"gpt-4o",max_tokens:4096,stream:true,messages:[{role:"user",content:[
      {type:"image_url",image_url:{url:`data:${mimeType};base64,${base64}`}},
      {type:"text",text:prompt}
    ]}]})
  });
  const reader=res.body.getReader(),dec=new TextDecoder();let full="";
  while(true){
    const{done,value}=await reader.read();if(done)break;
    for(const line of dec.decode(value).split("\n")){
      if(!line.startsWith("data: "))continue;const d=line.slice(6);if(d==="[DONE]")continue;
      try{const p=JSON.parse(d);const t=p.choices?.[0]?.delta?.content||"";if(t){full+=t;onChunk(full);}}catch{}
    }
  }
  return full;
}

// ─────────────────────────────────────────────
// SCORE BAR
// ─────────────────────────────────────────────
function ScoreBar({label,value,color}){return(<div style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,letterSpacing:2,color:"#6a8aa8",textTransform:"uppercase"}}>{label}</span><span style={{fontSize:12,color:color||"#f0b429",fontWeight:500}}>{value}</span></div><div style={{height:2,background:"#243650",borderRadius:1,overflow:"hidden"}}><div style={{height:"100%",background:color||"#f0b429",width:`${value}%`,transition:"width 1.2s ease"}}/></div></div>);}

// ─────────────────────────────────────────────
// PRICING PAGE
// ─────────────────────────────────────────────
function PricingPage({onSelect,currentPlan,billing,setBilling}){
  const plans=["free","pro","agency"];
  const highlights={free:"Perfect to explore",pro:"Most popular — full power",agency:"For teams & client work"};
  const [agencyCode,setAgencyCode]=useState("");
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a1628 0%,#0d1e38 100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px 60px",fontFamily:"'DM Mono','Courier New',monospace"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');html,body,#root{height:100%;margin:0;padding:0;}
        @media(max-width:768px){
          .gbtn{font-size:13px!important;padding:15px 0!important;letter-spacing:2px!important;}
          .inp{font-size:13px!important;padding:12px 14px!important;}
          .ctc{padding:12px 14px!important;}
          .chip{font-size:11px!important;padding:9px 12px!important;}
          .mbtn{font-size:11px!important;padding:8px 12px!important;}
          .sm{font-size:11px!important;padding:7px 12px!important;}
          .toolc{font-size:11px!important;padding:9px 12px!important;}
          .nt{font-size:10px!important;padding:5px 9px!important;}
        }*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12}}>
          <div style={{display:"flex",gap:4}}>{["#ff2d2d","#f0b429","#7c83fd"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:2,background:c}}/>)}</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:3,color:"#fff"}}>GENTAGAI</div>
        </div>
        <div style={{fontSize:12,letterSpacing:5,color:"#5a7a98",textTransform:"uppercase",marginBottom:20}}>gentagai.com — AI Marketing Engine</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:32,color:"#fff",lineHeight:1.2,maxWidth:480,margin:"0 auto"}}>
          The engine that makes every brand go viral.
        </div>
        <div style={{fontSize:15,color:"#6a8aa8",marginTop:12,letterSpacing:.5}}>Copy · Images · Video Ads · A/B Testing · SEO — all in one engine.</div>
      </div>

      {/* Billing Toggle */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:36,background:"#162030",border:"1px solid #2e4a64",borderRadius:99,padding:"6px 8px"}}>
        <button onClick={()=>setBilling("monthly")} style={{padding:"7px 20px",borderRadius:99,border:"none",background:billing==="monthly"?"#253a56":"transparent",color:billing==="monthly"?"#fff":"#6a8aa8",fontSize:14,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>Monthly</button>
        <button onClick={()=>setBilling("yearly")} style={{padding:"7px 20px",borderRadius:99,border:"none",background:billing==="yearly"?"#253a56":"transparent",color:billing==="yearly"?"#fff":"#6a8aa8",fontSize:14,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>
          Yearly <span style={{fontSize:12,color:"#00ff88",marginLeft:4}}>SAVE 35%</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16,width:"100%",maxWidth:860,marginBottom:40}}>
        {plans.map(pid=>{
          const plan=PLANS[pid];
          const isCurrentPlan=currentPlan===pid;
          const price=billing==="yearly"&&pid!=="free"?plan.priceYear:plan.price;
          const isFeatured=pid==="pro";
          return(
            <div key={pid} style={{background:isFeatured?"#172236":"#0f1928",border:`1px solid ${isFeatured?plan.color+"55":"#253a56"}`,borderRadius:12,padding:"28px 24px",position:"relative",display:"flex",flexDirection:"column"}}>
              {isFeatured&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#000",fontSize:12,letterSpacing:3,padding:"4px 16px",borderRadius:99,textTransform:"uppercase",fontWeight:500,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={{fontSize:11,letterSpacing:4,color:plan.color,textTransform:"uppercase",marginBottom:6}}>{plan.badge}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#fff"}}>{plan.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:32,color:"#fff"}}>{price===0?"Free":`$${price}`}</div>
                  {price>0&&<div style={{fontSize:12,color:"#5a7a98"}}>/ mo{billing==="yearly"?" billed yearly":""}</div>}
                </div>
              </div>
              <div style={{fontSize:13,color:"#6a8aa8",marginBottom:20,fontStyle:"italic"}}>{highlights[pid]}</div>
              <div style={{flex:1,marginBottom:24}}>
                {plan.features.map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
                    <div style={{width:14,height:14,borderRadius:"50%",background:plan.color+"22",border:`1px solid ${plan.color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <div style={{width:4,height:4,borderRadius:"50%",background:plan.color}}/>
                    </div>
                    <span style={{fontSize:14,color:"#bccfe0",lineHeight:1.5}}>{f}</span>
                  </div>
                ))}
                {plan.locked.length>0&&plan.locked.slice(0,3).map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8,opacity:.3}}>
                    <div style={{width:14,height:14,borderRadius:"50%",border:"1px solid #4a6a88",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <div style={{fontSize:12,color:"#6a8aa8",lineHeight:1}}>—</div>
                    </div>
                    <span style={{fontSize:14,color:"#6a8aa8",lineHeight:1.5}}>{f}</span>
                  </div>
                ))}
              </div>
              {pid==="agency"&&(
                <div style={{marginBottom:8}}>
                  <input
                    placeholder="Have a staff code? Enter it here"
                    value={agencyCode}
                    onChange={e=>setAgencyCode(e.target.value)}
                    style={{width:"100%",padding:"14px 16px",background:"#152033",border:"1px solid #3d5e7a",color:"#ddd",fontFamily:"'DM Mono',monospace",fontSize:14,letterSpacing:"0.06em",outline:"none",borderRadius:6,marginBottom:4}}
                  />
                  {agencyCode&&<div style={{fontSize:12,color:"#7c83fd",letterSpacing:1}}>↑ Enter code then click below</div>}
                </div>
              )}
              <button onClick={()=>onSelect(pid,billing,pid==="agency"?agencyCode:null)} style={{width:"100%",padding:"13px 0",border:`1px solid ${isFeatured||isCurrentPlan?plan.color:plan.color+"44"}`,background:isFeatured?plan.color:"transparent",color:isFeatured?"#000":plan.color,fontSize:14,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",fontWeight:500,transition:"all .2s",borderRadius:6}}>
                {isCurrentPlan?"Current Plan":pid==="free"?"Start Free":agencyCode&&pid==="agency"?"Activate Staff Code":`Subscribe — $${price}/mo`}
              </button>
              {pid!=="free"&&<div style={{fontSize:12,color:"#4a6a88",textAlign:"center",marginTop:8,letterSpacing:.5}}>Powered by Stripe · Cancel anytime</div>}
            </div>
          );
        })}
      </div>

      {/* Feature compare strip */}
      <div style={{width:"100%",maxWidth:860,background:"#0f1928",border:"1px solid #253a56",borderRadius:10,padding:"20px 24px",marginBottom:32}}>
        <div style={{fontSize:11,letterSpacing:4,color:"#5a7a98",textTransform:"uppercase",marginBottom:16}}>What's included in every plan</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
          {["Claude Sonnet AI","Algorithm optimization","Platform-native copy","Stripe secure billing","Auto-save sessions","Cancel anytime"].map(f=>(
            <div key={f} style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#f0b429",flexShrink:0}}/>
              <span style={{fontSize:13,color:"#6a8aa8"}}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{fontSize:13,color:"#4a6a88",letterSpacing:1}}>© 2026 {DOMAIN} · All rights reserved</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// UPGRADE MODAL
// ─────────────────────────────────────────────
function UpgradeModal({onClose,onUpgrade,featureName}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#162030",border:"1px solid #f0b42944",borderRadius:12,padding:"32px 28px",maxWidth:400,width:"100%",textAlign:"center",fontFamily:"'DM Mono','Courier New',monospace"}}>
        <div style={{fontSize:11,letterSpacing:4,color:"#f0b429",textTransform:"uppercase",marginBottom:12}}>Pro Feature</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#fff",marginBottom:10}}>Unlock {featureName}</div>
        <div style={{fontSize:15,color:"#6a8aa8",lineHeight:1.8,marginBottom:24}}>This feature requires a Pro or Agency plan. Upgrade to access the full GENTAGAI engine.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={onClose} style={{padding:"10px 20px",border:"1px solid #2d4464",background:"transparent",color:"#6a8aa8",fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",borderRadius:4}}>Not now</button>
          <button onClick={onUpgrade} style={{padding:"10px 24px",border:"none",background:"linear-gradient(135deg,#f0b429,#ff8c00)",color:"#000",fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",fontWeight:500,borderRadius:4}}>Upgrade Now</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ACCOUNT PANEL
// ─────────────────────────────────────────────
function AccountPanel({plan,billing,gensUsed,gensLimit,onManage,onLogout,onClose}){
  const p=PLANS[plan]||PLANS.free;
  const pct=gensLimit===Infinity?0:Math.min(100,Math.round((gensUsed/gensLimit)*100));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#162030",border:"1px solid #2e4a64",borderLeft:"1px solid #2e4a64",width:300,height:"100vh",padding:"24px 20px",display:"flex",flexDirection:"column",fontFamily:"'DM Mono','Courier New',monospace",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontSize:12,letterSpacing:4,color:"#6a8aa8",textTransform:"uppercase"}}>Account</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#5a7a98",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
        </div>

        <div style={{background:"#1e2d42",border:`1px solid ${p.color}33`,borderRadius:8,padding:"16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,letterSpacing:3,color:p.color,textTransform:"uppercase"}}>{p.badge} Plan</span>
            <span style={{fontSize:12,color:"#5a7a98"}}>{billing}</span>
          </div>
          <div style={{fontSize:18,color:"#fff",fontWeight:500,marginBottom:12}}>{p.name}</div>
          <div style={{fontSize:12,color:"#6a8aa8",marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Generations this month</div>
          <div style={{height:3,background:"#253a56",borderRadius:2,marginBottom:5,overflow:"hidden"}}>
            <div style={{height:"100%",background:pct>80?"#ff2d2d":p.color,width:`${pct}%`,transition:"width .8s ease"}}/>
          </div>
          <div style={{fontSize:12,color:"#6a8aa8"}}>{gensUsed} / {gensLimit===Infinity?"∞":gensLimit} used</div>
        </div>

        <div style={{fontSize:11,letterSpacing:3,color:"#4a6a88",textTransform:"uppercase",marginBottom:10}}>Plan Features</div>
        {p.features.slice(0,5).map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:p.color,flexShrink:0}}/>
            <span style={{fontSize:13,color:"#8bacc8"}}>{f}</span>
          </div>
        ))}

        <div style={{flex:1}}/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:20}}>
          {plan!=="free"&&<button onClick={onManage} style={{padding:"10px",border:"1px solid #2e4a64",background:"transparent",color:"#8bacc8",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"}}>Manage Billing ↗</button>}
          {plan==="free"&&<button onClick={onManage} style={{padding:"10px",border:`1px solid ${PLANS.pro.color}55`,background:"transparent",color:PLANS.pro.color,fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"}}>Upgrade Plan</button>}
          <button onClick={onLogout} style={{padding:"10px",border:"1px solid #253a56",background:"transparent",color:"#5a7a98",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN ENGINE
// ─────────────────────────────────────────────
export default function Gentagai(){
  // ── Subscription state ──────────────────────
  const [screen,setScreen]=useState("pricing"); // pricing | app
  const [plan,setPlan]=useState("free");
  const [billing,setBilling]=useState("monthly");
  const [gensUsed,setGensUsed]=useState(0);
  const [showAccount,setShowAccount]=useState(false);
  const [upgradeModal,setUpgradeModal]=useState(null);
  const [saveFlash,setSaveFlash]=useState(false);
  const [lastSaved,setLastSaved]=useState(null);

  // ── Engine state ────────────────────────────
  const [mode,setMode]=useState("copy");
  const [abTab,setAbTab]=useState("variants");
  const [platform,setPlatform]=useState("instagram");
  const [contentType,setContentType]=useState("viral_hook");
  const [imageType,setImageType]=useState("img_product");
  const [imageTool,setImageTool]=useState("");
  const [videoAdType,setVideoAdType]=useState("");
  const [videoTool,setVideoTool]=useState("");
  const [tone,setTone]=useState("hype");
  const [abVar,setAbVar]=useState("tone");
  const [brand,setBrand]=useState("");
  const [niche,setNiche]=useState("");
  const [audience,setAudience]=useState("");
  const [goal,setGoal]=useState("");
  const [keywords,setKeywords]=useState("");
  const [productName,setProductName]=useState("");
  const [productDesc,setProductDesc]=useState("");
  const [productPrice,setProductPrice]=useState("");
  const [productType,setProductType]=useState("");

  // ── Flow state (generate vs amplify) ────────
  const [imageFlow,setImageFlow]=useState("generate"); // generate | amplify
  const [videoFlow,setVideoFlow]=useState("generate"); // generate | amplify
  const [amplifyType,setAmplifyType]=useState("full_suite"); // what AI Brain creates from upload
  const [step,setStep]=useState("idle");
  const [output,setOutput]=useState("");
  const [abA,setAbA]=useState("");
  const [abB,setAbB]=useState("");
  const [scores,setScores]=useState(null);
  const [scoring,setScoring]=useState(false);
  const [copied,setCopied]=useState("");
  const [history,setHistory]=useState([]);
  const [histActive,setHistActive]=useState(null);

  // ── Upload state ─────────────────────────────
  const [uploadedImage,setUploadedImage]=useState(null);
  const [uploadedVideo,setUploadedVideo]=useState(null);
  const [uploadMode,setUploadMode]=useState("generate"); // eslint-disable-line
  const [imgDrag,setImgDrag]=useState(false);
  const [vidDrag,setVidDrag]=useState(false);
  const imgInputRef=useRef(null);
  const vidInputRef=useRef(null);

  // ── AI Brain state ───────────────────────────
  const [aiBrain,setAiBrain]=useState("claude");          // claude | gemini | chatgpt
  const [geminiKey,setGeminiKey]=useState(()=>{ try{return localStorage.getItem("gentagai_gemini_key")||"";}catch{return "";} });
  const [chatgptKey,setChatgptKey]=useState(()=>{ try{return localStorage.getItem("gentagai_chatgpt_key")||"";}catch{return "";} });
  const [showKeyInput,setShowKeyInput]=useState(null);    // "gemini" | "chatgpt" | null
  const [keyDraft,setKeyDraft]=useState("");

  function saveKey(brain){
    if(brain==="gemini"){setGeminiKey(keyDraft);try{localStorage.setItem("gentagai_gemini_key",keyDraft);}catch{}}
    if(brain==="chatgpt"){setChatgptKey(keyDraft);try{localStorage.setItem("gentagai_chatgpt_key",keyDraft);}catch{}}
    setShowKeyInput(null);setKeyDraft("");
  }
  function clearKey(brain){
    if(brain==="gemini"){setGeminiKey("");try{localStorage.removeItem("gentagai_gemini_key");}catch{}}
    if(brain==="chatgpt"){setChatgptKey("");try{localStorage.removeItem("gentagai_chatgpt_key");}catch{}}
  }
  function selectBrain(id){
    if(id==="gemini"&&!geminiKey){setShowKeyInput("gemini");setKeyDraft("");return;}
    if(id==="chatgpt"&&!chatgptKey){setShowKeyInput("chatgpt");setKeyDraft("");return;}
    setAiBrain(id);setShowKeyInput(null);
  }

  const outRef=useRef(null);
  const outputRef=useRef(""); // Keep output in ref for reliable access
  const running=step==="running";
  const currentPlan=PLANS[plan]||PLANS.free;

  // ── Load from storage ───────────────────────
  useEffect(()=>{
    try{
      const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      if(d.plan){setPlan(d.plan);setBilling(d.billing||"monthly");setGensUsed(d.gensUsed||0);}
      if(d.screen==="app"){setScreen("app");}
      if(d.history){setHistory(d.history);}
      if(d.lastSaved){setLastSaved(d.lastSaved);}
    }catch{}
    // Load saved platform URLs
    try{
      const urls=JSON.parse(localStorage.getItem("gentagai_platform_urls")||"{}");
      if(Object.keys(urls).length>0) setPlatformURLs(urls);
    }catch{}
  },[]);

  // ── Auto-save ───────────────────────────────
  useEffect(()=>{
    if(screen==="idle")return;
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify({plan,billing,gensUsed,screen,history:history.slice(0,20),lastSaved:new Date().toLocaleTimeString(),version:VERSION}));
      setLastSaved(new Date().toLocaleTimeString());
      setSaveFlash(true);setTimeout(()=>setSaveFlash(false),1500);
    }catch{}
  },[history,plan,billing,gensUsed,screen]);

  useEffect(()=>{if(outRef.current&&running)outRef.current.scrollTop=outRef.current.scrollHeight;},[output,abA,abB,running]);

  // ── MOBILE DETECTION ────────────────────────────────────
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  const [mobileTab,setMobileTab]=useState("config"); // config | output
  useEffect(()=>{
    const fn=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);

  // ── Plan selection / Stripe ─────────────────
  function handlePlanSelect(pid,bill,enteredCode){
    // ── Agency code check ──
    if(enteredCode&&AGENCY_CODES.includes(enteredCode.trim().toUpperCase())){
      setPlan("agency");setBilling("yearly");setScreen("app");return;
    }
    if(pid==="free"){setPlan("free");setScreen("app");return;}
    const linkKey=`${pid}_${bill==="yearly"?"yearly":"monthly"}`;
    const link=STRIPE_LINKS[linkKey];
    if(link&&!link.includes("YOUR_")){window.open(link,"_blank");}
    else{
      // Demo mode — activate plan directly (remove in production, use Stripe webhook)
      setPlan(pid);setBilling(bill);setScreen("app");
    }
  }

  // ── Feature gate ────────────────────────────
  function canUse(feature){
    if(plan==="agency")return true;
    if(plan==="pro")return feature!=="unlimited";
    // free tier
    return feature==="basic";
  }

  function gated(featureName,isPaidOnly=true){
    if(!isPaidOnly||plan!=="free")return false;
    setUpgradeModal(featureName);return true;
  }

  function handleModeSwitch(m){
    const gatedModes={image:"Image Prompts",video:"Video Ads Engine",ab:"A/B Testing"};
    if(m!=="copy"&&plan==="free"){setUpgradeModal(gatedModes[m]);return;}
    if(m==="video"){setVideoAdType("");setVideoTool("");}
    if(m==="image"){setImageTool("");}
    setMode(m);reset();
  }

  // ── Generation ──────────────────────────────
  function reset(){setStep("idle");setOutput("");setAbA("");setAbB("");setScores(null);setHistActive(null);setAbTab("variants");}

  // ── Upload helpers ───────────────────────────
  function handleImageFile(file){
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=e=>{
      const base64=e.target.result.split(",")[1];
      setUploadedImage({name:file.name,url:e.target.result,base64,size:(file.size/1024).toFixed(0),type:file.type});
    };
    reader.readAsDataURL(file);
  }
  function handleVideoFile(file){
    if(!file||!file.type.startsWith("video/"))return;
    const url=URL.createObjectURL(file);
    setUploadedVideo({name:file.name,url,size:(file.size/1024/1024).toFixed(1),type:file.type});
  }
  function handleImgDrop(e){e.preventDefault();setImgDrag(false);handleImageFile(e.dataTransfer.files[0]);}
  function handleVidDrop(e){e.preventDefault();setVidDrag(false);handleVideoFile(e.dataTransfer.files[0]);}

  // ── Publish state ────────────────────────────
  const [showPublish,setShowPublish]=useState(false);
  const [publishPicks,setPublishPicks]=useState([]);
  const [publishCaption,setPublishCaption]=useState("");
  const [publishStatus,setPublishStatus]=useState({});
  const [platformURLs,setPlatformURLs]=useState({});  // stores user-entered profile URLs per platform
  const [showURLSetup,setShowURLSetup]=useState(false); // show URL setup panel

  const PUBLISH_PLATFORMS=[
    {id:"instagram",label:"Instagram",icon:"📷",color:"#e1306c",uploadUrl:"https://www.instagram.com/create/style/",shareUrl:null},
    {id:"tiktok",label:"TikTok",icon:"🎵",color:"#ff0050",uploadUrl:"https://www.tiktok.com/upload",shareUrl:null},
    {id:"facebook",label:"Facebook",icon:"👥",color:"#1877f2",uploadUrl:"https://www.facebook.com/",shareUrl:(caption,url)=>`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url||window.location.href)}&quote=${encodeURIComponent(caption)}`},
    {id:"twitter",label:"X / Twitter",icon:"✕",color:"#1da1f2",uploadUrl:null,shareUrl:(caption)=>`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`},
    {id:"linkedin",label:"LinkedIn",icon:"💼",color:"#0077b5",uploadUrl:null,shareUrl:(caption)=>`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(caption)}`},
    {id:"youtube",label:"YouTube",icon:"▷",color:"#ff0000",uploadUrl:"https://studio.youtube.com/channel/upload",shareUrl:null},
    {id:"pinterest",label:"Pinterest",icon:"📌",color:"#e60023",uploadUrl:"https://www.pinterest.com/pin-creation-tool/",shareUrl:null},
    {id:"snapchat",label:"Snapchat",icon:"👻",color:"#fffc00",uploadUrl:"https://my.snapchat.com/",shareUrl:null},
  ];

  function togglePublishPick(id){
    setPublishPicks(p=>p.includes(id)?p.filter(x=>x!==id):p.length<3?[...p,id]:p);
  }

  const [activePlatformGuide,setActivePlatformGuide]=useState(null);

  const PLATFORM_STEPS={
    instagram:{
      name:"Instagram",icon:"📷",color:"#e1306c",
      uploadUrl:"https://www.instagram.com/create/style/",
      steps:[
        "Your caption is copied to clipboard ✓",
        "Open the Instagram app on your phone",
        "Tap the + button at the bottom",
        "Select your image or video",
        "Tap Next → Next",
        "Tap the caption field and paste (hold → Paste)",
        "Tap Share — done! 🎉"
      ],
      tip:"Instagram desktop upload: go to instagram.com, click + in top bar"
    },
    tiktok:{
      name:"TikTok",icon:"🎵",color:"#ff0050",
      uploadUrl:"https://www.tiktok.com/upload",
      steps:[
        "Your caption is copied to clipboard ✓",
        "TikTok upload page is opening in a new tab",
        "Click 'Select video' and choose your file",
        "Paste your caption in the description box",
        "Add hashtags, sound, and cover",
        "Click Post — done! 🎉"
      ],
      tip:"TikTok desktop upload works great for videos"
    },
    facebook:{
      name:"Facebook",icon:"👥",color:"#1877f2",
      uploadUrl:"https://www.facebook.com/",
      steps:[
        "Your caption + share link is ready",
        "Facebook share dialog is opening",
        "Your caption is pre-filled in the share box",
        "Add your image/video using the Photo/Video button",
        "Click Post — done! 🎉"
      ],
      tip:"For best results, share directly from your Facebook Page"
    },
    twitter:{
      name:"X / Twitter",icon:"✕",color:"#1da1f2",
      uploadUrl:null,
      steps:[
        "Your caption is copied to clipboard ✓",
        "Twitter compose window is opening",
        "Paste your caption (Ctrl+V / Cmd+V)",
        "Click the image icon to attach your file",
        "Click Post — done! 🎉"
      ],
      tip:"Twitter auto-shortens URLs — your caption fits perfectly"
    },
    linkedin:{
      name:"LinkedIn",icon:"💼",color:"#0077b5",
      uploadUrl:"https://www.linkedin.com/feed/",
      steps:[
        "Your caption is copied to clipboard ✓",
        "LinkedIn is opening in a new tab",
        "Click 'Start a post'",
        "Paste your caption",
        "Click the image/video icon to attach",
        "Click Post — done! 🎉"
      ],
      tip:"LinkedIn posts with images get 3x more engagement"
    },
    youtube:{
      name:"YouTube",icon:"▷",color:"#ff0000",
      uploadUrl:"https://studio.youtube.com/channel/upload",
      steps:[
        "Your title + description is copied ✓",
        "YouTube Studio is opening in a new tab",
        "Click 'Upload videos'",
        "Drag your video file in",
        "Paste your title and description",
        "Set thumbnail, tags, then Publish — done! 🎉"
      ],
      tip:"Use the SEO keywords from GENTAGAI as your YouTube tags"
    },
    pinterest:{
      name:"Pinterest",icon:"📌",color:"#e60023",
      uploadUrl:"https://www.pinterest.com/pin-creation-tool/",
      steps:[
        "Your description is copied to clipboard ✓",
        "Pinterest Pin Creator is opening",
        "Upload your image",
        "Paste your description",
        "Add a destination link (your shop/website)",
        "Publish — done! 🎉"
      ],
      tip:"Vertical images (2:3 ratio) perform best on Pinterest"
    },
    snapchat:{
      name:"Snapchat",icon:"👻",color:"#fffc00",
      uploadUrl:"https://my.snapchat.com/",
      steps:[
        "Your caption is copied to clipboard ✓",
        "Snapchat web is opening in a new tab",
        "Click the camera icon to create",
        "Upload your image or video",
        "Paste your caption as overlay text",
        "Share to Story or send — done! 🎉"
      ],
      tip:"Snapchat Stories get best reach in the first hour"
    },
  };

  function publishToplatform(pf){
    const caption=publishCaption||output.slice(0,500)||`${brand} — ${productName||niche}`;
    const steps=PLATFORM_STEPS[pf.id];
    // Copy caption to clipboard
    navigator.clipboard.writeText(caption).catch(()=>{});
    setPublishStatus(s=>({...s,[pf.id]:"opening"}));
    setActivePlatformGuide(pf.id);
    // Open platform
    if(pf.id==="twitter"){
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption.slice(0,250))}`,"_blank");
    } else if(pf.id==="facebook"){
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(caption.slice(0,200))}`,"_blank");
    } else if(pf.id==="linkedin"){
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://gentagai.com")}&summary=${encodeURIComponent(caption.slice(0,200))}`,"_blank");
    } else {
      const url=steps?.uploadUrl;
      if(url) window.open(url,"_blank");
    }
    setTimeout(()=>setPublishStatus(s=>({...s,[pf.id]:"done"})),2000);
  }

  // Mobile Web Share API
  async function webShare(){
    const caption=publishCaption||output.slice(0,500)||`${brand}`;
    if(navigator.share){
      try{
        await navigator.share({title:`${brand} — ${niche}`,text:caption});
      }catch(e){}
    }
  }

  function publishSelected(){
    publishPicks.forEach(id=>{
      const pf=PUBLISH_PLATFORMS.find(p=>p.id===id);
      if(pf) publishToplatform(pf);
    });
  }

  function downloadFile(){
    const file=uploadedImage||uploadedVideo;
    if(!file)return;
    const a=document.createElement("a");
    a.href=file.url;
    a.download=file.name||"gentagai-export";
    a.click();
  }

  async function analyzeUpload(){
    if(!uploadedImage&&!uploadedVideo)return;
    const limit=currentPlan.gens;
    if(gensUsed>=limit&&limit!==Infinity){setUpgradeModal("more generations");return;}
    reset();setStep("running");
    try{
      if(uploadedImage){
        const productCtx=productDesc?`\nPRODUCT CONTEXT:\n- Name: ${productName||"not specified"}\n- Type: ${productType||"not specified"}\n- Description: ${productDesc}\n- Price: ${productPrice||"not specified"}`:"";
        const brandCtx=`BRAND: ${brand||"The Brand"} | NICHE: ${niche||"Fashion & Lifestyle"} | TARGET PLATFORM: ${platform} | TONE: ${toneDesc[tone]||"hype"}${productCtx}`;

        const taskPrompts={
          generate:`You are GENTAGAI Visual — elite AI marketing strategist and image prompt engineer.

${brandCtx}

You are looking at a customer's ACTUAL uploaded image. Study it carefully — the exact colors, composition, lighting, subject, background, style, mood, and visual energy present in this specific image.

Generate 4 AI image prompts for ${imageTool} that are DIRECTLY INSPIRED by what you see in this image. Each prompt should replicate or evolve the visual style, composition, and energy of THIS specific image — not generic prompts.

For each prompt:
── PROMPT [N]: [Descriptive title based on what's in the image]
WHAT I SEE IN YOUR IMAGE: [Describe exactly what's in the uploaded image — colors, subject, setting, lighting, mood]
FULL PROMPT: [Detailed ${imageTool}-ready prompt built from the actual visual elements you see]
STYLE MODIFIERS: [Specific lighting, lens, color grade pulled from the image]
TOOL PARAMS: [${imageTool==="midjourney"?"--ar [correct ratio] --style raw --v 6.1 --q 2":imageTool==="dalle"?"Specific lens mm, exact lighting direction, color temperature":"Relevant tool parameters"}]
NEGATIVE PROMPT: [What to exclude to maintain the image quality]
DEPLOY AS: [Best use case — post/ad/story/banner]

Make each prompt feel like a creative director analyzed the customer's specific image and built a brief around it.`,

          analyze:`You are GENTAGAI Visual — expert marketing analyst and brand strategist.

${brandCtx}

You are analyzing a customer's ACTUAL uploaded image for marketing performance. Study every detail: composition, colors, subject placement, lighting, background, text (if any), mood, brand visibility, and visual hierarchy.

Provide a DEEP, SPECIFIC analysis based on exactly what you see in this image:

── WHAT'S IN THIS IMAGE
Describe exactly what you see — subject, setting, colors, lighting, any text/logos, overall composition.

── OVERALL MARKETING SCORE: [X/100]
Based on the actual visual elements present.

── SCROLL-STOP ANALYSIS
Would this stop a thumb mid-scroll on ${platform}? Why or why not — based on specific elements you see.

── FIRST IMPRESSION (0.5 seconds)
What does someone notice first? What emotion does it trigger immediately?

── COMPOSITION & VISUAL HIERARCHY
What's working in the framing? Where does the eye travel? What's dominant?

── COLOR PSYCHOLOGY
Analyze the specific colors present and their emotional/marketing impact.

── PLATFORM FIT FOR ${platform.toUpperCase()}
How well does this image fit ${platform} norms, algorithm preferences, and audience expectations?

── BRAND ALIGNMENT
Does this match ${brand||"the brand"}'s identity in the ${niche||"niche"} space?

── TOP 3 STRENGTHS (specific to what you see)
── TOP 3 IMPROVEMENTS (specific, actionable fixes)

── VIRAL POTENTIAL
What specific change to this image would most increase its chances of going viral?

── CAPTION SUGGESTION
Write one viral caption specifically for this image.`,

          enhance:`You are GENTAGAI Visual — expert creative director and viral content strategist.

${brandCtx}

You are looking at a customer's ACTUAL uploaded image. Study it carefully and give them a specific, actionable upgrade plan based on exactly what you see.

── WHAT YOU'VE UPLOADED
Describe exactly what's in the image — be specific about subject, colors, composition, lighting.

── IMMEDIATE IMPACT FIXES (do these first)
Based on what's actually in this image, list 3 quick changes that would make the biggest difference.

── TEXT OVERLAY STRATEGY
Exactly what text to add, where to place it, what font style, and what it should say for ${platform}.

── COLOR GRADE RECOMMENDATION
Based on the existing colors in your image, suggest a specific filter/grade to make it pop on ${platform}.

── CROP & REFRAME SUGGESTIONS
How to reframe this specific image for: Instagram Feed · Instagram Story · TikTok · Facebook Ad

── 5 VIRAL CAPTION IDEAS
Written specifically for what's shown in this image — not generic captions.

── A/B TEST VERSION
Describe a second version of this exact image to test against — what to change and why.

── HOOK OVERLAY
The single most powerful text hook to overlay on THIS specific image.

── READY-TO-POST CHECKLIST
Specific items to check/fix before posting this exact image.`,
        };

        const msg={role:"user",content:[
          {type:"image",source:{type:"base64",media_type:uploadedImage.type,data:uploadedImage.base64}},
          {type:"text",text:taskPrompts[uploadMode]||taskPrompts.analyze}
        ]};
        let full="";
        if(aiBrain==="gemini"&&geminiKey){
          full=await callGeminiVision(taskPrompts[uploadMode]||taskPrompts.analyze,uploadedImage.base64,uploadedImage.type,geminiKey,setOutput);
        }else if(aiBrain==="chatgpt"&&chatgptKey){
          full=await callChatGPTVision(taskPrompts[uploadMode]||taskPrompts.analyze,uploadedImage.base64,uploadedImage.type,chatgptKey,setOutput);
        }else{
          // Default: Claude (built-in)
          const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:4096,messages:[msg]})});
          const reader=res.body.getReader(),dec=new TextDecoder();
          while(true){const{done,value}=await reader.read();if(done)break;
            for(const line of dec.decode(value).split("\n")){if(!line.startsWith("data: "))continue;const d=line.slice(6);if(d==="[DONE]")continue;
              try{const p=JSON.parse(d);if(p.type==="content_block_delta"&&p.delta?.text){full+=p.delta.text;setOutput(full);}}catch{}}}
        }
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:"image_upload",tone,mode:"image",imageTool,aiBrain,output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      } else if(uploadedVideo){
        const productCtx=productDesc?`\nPRODUCT: ${productName||""} (${productType||"unknown type"}) — ${productDesc}${productPrice?` · ${productPrice}`:""}`:""
        const brandCtx=`BRAND: ${brand||"The Brand"} | NICHE: ${niche||"Fashion"} | PLATFORM: ${platform} | TONE: ${toneDesc[tone]}${productCtx}`;
        const videoCtx=`\nUPLOADED VIDEO FILE: "${uploadedVideo.name}" | SIZE: ${uploadedVideo.size}MB | FORMAT: ${uploadedVideo.type} | AD FORMAT: ${VIDEO_AD_TYPES.find(v=>v.id===videoAdType)?.label||videoAdType}`;

        const videoPrompts={
          analyze:`You are GENTAGAI Video — expert video ad analyst and marketing strategist.

${brandCtx}${videoCtx}

The customer has uploaded their actual video ad. Based on the file name, format, size, and all brand context provided, give a thorough, specific analysis:

── VIDEO FILE OVERVIEW
File: ${uploadedVideo.name} | ${uploadedVideo.size}MB | ${uploadedVideo.type}
Estimated duration based on file size. Format assessment for ${platform}.

── OVERALL AD EFFECTIVENESS SCORE: [X/100]

── HOOK STRENGTH ANALYSIS (First 3 Seconds)
Based on the ad format (${VIDEO_AD_TYPES.find(v=>v.id===videoAdType)?.label}), assess whether this video likely has a strong opening hook. What should the first 3 seconds contain for ${platform}?

── PACING ASSESSMENT
For ${platform} and the ${VIDEO_AD_TYPES.find(v=>v.id===videoAdType)?.label} format, what pacing is ideal? How does this file's size suggest the cut rate?

── PLATFORM OPTIMIZATION FOR ${platform.toUpperCase()}
Specific requirements: aspect ratio, caption strategy, sound-off performance, algorithm triggers.

── BRAND & PRODUCT FIT
How well does a video ad in this format suit ${brand||"the brand"} selling ${productName||"this product"} in the ${niche||"niche"} space?

── AUDIO STRATEGY
Music genre, BPM, VO direction, and sound design recommendations for this ad type.

── CTA EFFECTIVENESS
What CTA should this video end with for maximum conversion on ${platform}?

── TOP 3 STRENGTHS (based on ad format + brand context)
── TOP 3 IMPROVEMENTS (specific, production-ready fixes)

── VIRAL FORECAST
Likelihood of strong performance on ${platform} and what will determine it.

── CAPTION TO PAIR WITH THIS VIDEO
Write a complete, platform-native caption for ${platform} to post alongside this video.`,

          enhance:`You are GENTAGAI Video — expert video ad director and viral content strategist.

${brandCtx}${videoCtx}

Give a specific, production-ready upgrade plan for this video:

── FILE ASSESSMENT
${uploadedVideo.name} | ${uploadedVideo.size}MB — format analysis and platform compatibility.

── HOOK REWRITE (First 3 Seconds)
Write 3 alternative opening hooks for this video ad. Make the viewer unable to scroll past.

── PACING & EDIT SUGGESTIONS
Specific cut points, hold durations, and rhythm recommendations for ${platform}.

── TEXT OVERLAY PLAN
Exact text to add, timing (e.g. "0:02-0:05"), screen position, and style for each overlay.

── AUDIO UPGRADE
Specific music genre, BPM range, and SFX moments that would elevate this ad.

── COLOR GRADE DIRECTION
LUT/filter recommendation to make this video feel more premium and on-brand.

── STRONGER CTA
3 alternative end-card CTAs ranked by conversion potential for ${platform}.

── A/B VERSION BRIEF
Describe a second cut of this video to test against — what to change and why.

── PLATFORM ADAPTATION
How to re-edit this exact video for: TikTok · Instagram Reels · YouTube Shorts · Facebook Feed

── CAPTION + HASHTAG PACK
Write the full caption, hashtags, and posting strategy for ${platform}.`,

          generate: buildVideo({brand,niche,videoAdType,platform,tone,audience,goal,videoTool,productName,productDesc,productType,productPrice}),
        };
        const videoPrompt=videoPrompts[uploadMode]||videoPrompts.analyze;
        let full="";
        if(aiBrain==="gemini"&&geminiKey){
          full=await callGemini(videoPrompt,geminiKey,setOutput);
        }else if(aiBrain==="chatgpt"&&chatgptKey){
          full=await callChatGPT(videoPrompt,chatgptKey,setOutput);
        }else{
          full=await streamAPI(videoPrompt,setOutput);
        }
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:"video_upload",tone,mode:"video",videoTool,aiBrain,output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      }
      setGensUsed(g=>g+1);setStep("done");
    }catch(e){setOutput("⚠ Connection error. Please try again.");setStep("done");}
  }

  // ── AMPLIFY GENERATE — AI Brain creates marketing from uploaded asset ──
  async function amplifyGenerate(){
    const file = uploadedImage||uploadedVideo;
    if(!file) return;
    const limit=currentPlan.gens;
    if(gensUsed>=limit&&limit!==Infinity){setUpgradeModal("more generations");return;}
    reset();setStep("running");
    const mediaType=uploadedImage?"image":"video";
    const prompt=buildAmplifyPrompt({
      type:amplifyType,brand,niche,platform,tone,audience,goal,keywords,
      productName,productDesc,productType,productPrice,
      mediaType,mediaName:file.name,mediaSize:file.size||uploadedVideo?.size,
    });
    try{
      let full="";
      if(uploadedImage){
        // Pass actual image to AI Brain vision
        if(aiBrain==="gemini"&&geminiKey){
          full=await callGeminiVision(prompt,uploadedImage.base64,uploadedImage.type,geminiKey,setOutput);
        }else if(aiBrain==="chatgpt"&&chatgptKey){
          full=await callChatGPTVision(prompt,uploadedImage.base64,uploadedImage.type,chatgptKey,setOutput);
        }else{
          const msg={role:"user",content:[
            {type:"image",source:{type:"base64",media_type:uploadedImage.type,data:uploadedImage.base64}},
            {type:"text",text:prompt}
          ]};
          const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:4096,messages:[msg]})});
          const reader=res.body.getReader(),dec=new TextDecoder();
          while(true){const{done,value}=await reader.read();if(done)break;
            for(const line of dec.decode(value).split("\n")){if(!line.startsWith("data: "))continue;const d=line.slice(6);if(d==="[DONE]")continue;
              try{const p=JSON.parse(d);if(p.type==="content_block_delta"&&p.delta?.text){full+=p.delta.text;setOutput(full);}}catch{}}}
        }
      }else{
        // Video — text only (no vision for video files)
        if(aiBrain==="gemini"&&geminiKey) full=await callGemini(prompt,geminiKey,setOutput);
        else if(aiBrain==="chatgpt"&&chatgptKey) full=await callChatGPT(prompt,chatgptKey,setOutput);
        else full=await streamAPI(prompt,setOutput);
      }
      setGensUsed(g=>g+1);setStep("done");
      setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:amplifyType,tone,mode,aiBrain,output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
    }catch(e){setOutput("⚠ Connection error. Please try again.");setStep("done");}
  }

  async function generate(){
    if(!brand||!niche)return;
    const limit=currentPlan.gens;
    if(gensUsed>=limit&&limit!==Infinity){setUpgradeModal("more generations");return;}
    reset();setStep("running");
    try{
      let full="";
      if(mode==="copy"){
        full=await streamAPI(buildCopy({brand,niche,platform,contentType,tone,audience,goal,keywords,productName,productDesc,productType,productPrice}),setOutput);
        outputRef.current=full;
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType,tone,mode:"copy",output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      }else if(mode==="image"){
        if(!imageTool)return;
        const imgPrompt=buildImage({brand,niche,imageType,platform,tone,audience,imageTool,productName,productDesc,productType});
        if(aiBrain==="gemini"&&geminiKey){
          full=await callGemini(imgPrompt,geminiKey,setOutput);
        }else if(aiBrain==="chatgpt"&&chatgptKey){
          full=await callChatGPT(imgPrompt,chatgptKey,setOutput);
        }else{
          full=await streamAPI(imgPrompt,setOutput);
        }
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:imageType,tone,mode:"image",imageTool,aiBrain,output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      }else if(mode==="video"){
        if(!videoAdType||!videoTool)return;
        const vidPrompt=buildVideo({brand,niche,videoAdType,platform,tone,audience,goal,videoTool,productName,productDesc,productType,productPrice});
        if(aiBrain==="gemini"&&geminiKey){
          full=await callGemini(vidPrompt,geminiKey,setOutput);
        }else if(aiBrain==="chatgpt"&&chatgptKey){
          full=await callChatGPT(vidPrompt,chatgptKey,setOutput);
        }else{
          full=await streamAPI(vidPrompt,setOutput);
        }
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:videoAdType,tone,mode:"video",videoTool,aiBrain,output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      }else{
        let fA="",fB="";
        await Promise.all([
          streamAPI(buildAB({brand,niche,platform,contentType,tone,audience,goal,keywords,abVariable:abVar,variant:"A",productName,productDesc,productType,productPrice}),(t)=>{fA=t;setAbA(t);}),
          streamAPI(buildAB({brand,niche,platform,contentType,tone,audience,goal,keywords,abVariable:abVar,variant:"B",productName,productDesc,productType,productPrice}),(t)=>{fB=t;setAbB(t);}),
        ]);
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType,tone,mode:"ab",abVar,abA:fA,abB:fB,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      }
      setGensUsed(g=>g+1);
      setStep("done");
    }catch{setOutput("⚠ Connection error. Please try again.");setStep("done");}
  }

  async function runScoring(){
    if(!abA||!abB)return;
    setScoring(true);
    try{const raw=await callAPI(buildScoring(abA,abB,contentType,platform));setScores(JSON.parse(raw.replace(/```json|```/g,"").trim()));setAbTab("scores");}
    catch{setScores({error:"Scoring failed."});setAbTab("scores");}
    setScoring(false);
  }

  function copy(text,key){navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(""),2000);});}

  function loadHist(e){
    setHistActive(e);setBrand(e.brand);setNiche(e.niche);setPlatform(e.platform);setTone(e.tone);
    setMode(e.mode||"copy");setContentType(e.contentType||"viral_hook");
    if(e.mode==="ab"){if(e.abA)setAbA(e.abA);if(e.abB)setAbB(e.abB);if(e.abVar)setAbVar(e.abVar);setAbTab("variants");}
    else if(e.mode==="image"){if(e.output)setOutput(e.output);if(e.imageTool)setImageTool(e.imageTool);}
    else if(e.mode==="video"){if(e.output)setOutput(e.output);if(e.videoTool)setVideoTool(e.videoTool);}
    else{if(e.output){setOutput(e.output);}}
    setStep("done");
  }

  const mc={copy:"#00e5ff",image:"#ff7c00",video:"#f0b429",ab:"#7c83fd"}[mode]||"#f0b429";
  const selTone=TONES.find(t=>t.id===tone);

  // ── PRICING SCREEN ──────────────────────────
  // ── BRAIN PICKER HELPER ─────────────────────
  function renderBrainPicker(accentColor){
    return(
      <div style={{display:"flex",gap:4,marginBottom:14}}>
        {AI_BRAINS.map(b=>{
          const isActive=aiBrain===b.id;
          const hasKey=b.id==="claude"||(b.id==="gemini"&&geminiKey)||(b.id==="chatgpt"&&chatgptKey);
          return(
            <div key={b.id} style={{flex:1}}>
              <div onClick={()=>selectBrain(b.id)}
                style={{padding:"8px 4px",border:`1px solid ${isActive?b.color+"88":"#2a3f5c"}`,background:isActive?`${b.color}10`:"#152033",cursor:"pointer",textAlign:"center",transition:"all .15s",borderRadius:4}}>
                <div style={{fontSize:18,color:isActive?b.color:"#5a7a98",lineHeight:1}}>{b.icon}</div>
                <div style={{fontSize:11,color:isActive?b.color:"#6a8aa8",marginTop:3,letterSpacing:.5}}>{b.label}</div>
                <div style={{fontSize:10,color:hasKey&&b.id!=="claude"?"#00ff8866":"#3d5e7a",marginTop:1}}>{b.id==="claude"?"built-in":hasKey?"✓ key saved":"+ add key"}</div>
              </div>
              {showKeyInput===b.id&&(
                <div style={{background:"#0f1928",border:`1px solid ${b.color}33`,padding:"8px",borderRadius:"0 0 4px 4px",marginTop:-1}}>
                  <div style={{fontSize:10,color:b.color,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>
                    <a href={b.link} target="_blank" rel="noreferrer" style={{color:b.color,textDecoration:"none"}}>Get {b.label} key ↗</a>
                  </div>
                  <input type="password" placeholder={`Paste ${b.label} API key`} value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} className="inp" style={{marginBottom:5,fontSize:13,padding:"12px 14px"}}/>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>saveKey(showKeyInput)} style={{flex:1,padding:"6px",border:`1px solid ${b.color}55`,background:`${b.color}11`,color:b.color,fontSize:11,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:1}}>Save</button>
                    <button onClick={()=>setShowKeyInput(null)} style={{padding:"6px 8px",border:"1px solid #2a3f5c",background:"transparent",color:"#6a8aa8",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                  </div>
                </div>
              )}
              {hasKey&&b.id!=="claude"&&isActive&&(
                <button onClick={()=>clearKey(b.id)} style={{width:"100%",background:"none",border:"none",color:"#3d5e7a",fontSize:10,cursor:"pointer",fontFamily:"inherit",marginTop:2,letterSpacing:1}}>clear key</button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if(screen==="pricing"){
    return <PricingPage onSelect={handlePlanSelect} currentPlan={plan} billing={billing} setBilling={setBilling}/>;
  }

  const genLimit=currentPlan.gens;
  const genPct=genLimit===Infinity?5:Math.min(100,Math.round((gensUsed/genLimit)*100));

  // ── APP SCREEN ──────────────────────────────
  return(
    <div style={{minHeight:"100vh",height:"100vh",background:"linear-gradient(135deg,#0d1421 0%,#0f1e35 50%,#0d1421 100%)",color:"#e8edf8",fontFamily:"'DM Mono','Courier New',monospace",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');html,body,#root{height:100%;margin:0;padding:0;}
        @media(max-width:768px){
          .gbtn{font-size:13px!important;padding:15px 0!important;letter-spacing:2px!important;}
          .inp{font-size:13px!important;padding:12px 14px!important;}
          .ctc{padding:12px 14px!important;}
          .chip{font-size:11px!important;padding:9px 12px!important;}
          .mbtn{font-size:11px!important;padding:8px 12px!important;}
          .sm{font-size:11px!important;padding:7px 12px!important;}
          .toolc{font-size:11px!important;padding:9px 12px!important;}
          .nt{font-size:10px!important;padding:5px 9px!important;}
        }
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-track{background:#0f1928;} ::-webkit-scrollbar-thumb{background:#2d4464;}
        .gbtn{border:none;font-family:'DM Mono',monospace;font-weight:600;font-size:14px;letter-spacing:3px;text-transform:uppercase;padding:18px 0;cursor:pointer;transition:all .2s;width:100%;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);}
        .gbtn:hover{filter:brightness(1.18);transform:translateY(-1px);}
        .gbtn:disabled{opacity:.3;cursor:not-allowed;transform:none;}
        .sm{background:transparent;border:1px solid #2e4a64;color:#6a8aa8;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;cursor:pointer;transition:all .15s;}
        .sm:hover{border-color:#4a6a88;color:#a8c0d8;}
        .sm.on{border-color:#f0b429;color:#f0b429;background:rgba(201,168,76,.05);}
        .chip{display:flex;align-items:center;border:1px solid #2a3f5c;background:#152033;color:#8bacc8;font-size:12px;letter-spacing:1px;padding:10px 14px;cursor:pointer;gap:7px;transition:all .15s;}
        .chip:hover{border-color:#3d5e7a;color:#bccfe0;}
        .chip.on{border-color:${mc};background:${mc}0a;color:${mc};}
        .inp{background:#152033;border:1.5px solid #2a3f5c;color:#e8edf8;font-family:'DM Mono',monospace;font-size:14px;padding:14px 16px;width:100%;outline:none;transition:border-color .2s;}
        .inp:focus{border-color:${mc}44;} .inp::placeholder{color:#4a6a88;}
        .sl{font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:10px;font-weight:500;}
        .sl::after{content:'';flex:1;height:1px;background:#1a2538;}
        .ctc{background:#152033;border:1px solid #253a56;border-left:3px solid transparent;padding:14px 16px;cursor:pointer;transition:all .14s;}
        .ctc:hover{background:#162030;}
        .ctc.on{border-left-color:${mc};background:${mc}06;}
        .ctc.locked{opacity:.35;cursor:not-allowed;}
        .otext{font-size:14px;line-height:1.9;color:#c8d4e8;white-space:pre-wrap;font-family:'DM Mono',monospace;word-break:break-word;overflow-wrap:break-word;max-width:100%;}
        .blink::after{content:'█';animation:bl .7s steps(1) infinite;color:${mc};}
        @keyframes bl{0%,100%{opacity:1}50%{opacity:0}}
        .gline{height:1px;animation:gl 1.1s linear infinite;margin:1px 0;}
        @keyframes gl{from{transform:translateX(-100%)}to{transform:translateX(100vw)}}
        .mbtn{background:transparent;border:1px solid #253a56;color:#6a8aa8;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:9px 16px;cursor:pointer;transition:all .2s;}
        .mbtn:hover{border-color:#3a5572;color:#8bacc8;}
        .vp{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .hi{padding:12px 14px;border-bottom:1px solid #1e3050;cursor:pointer;transition:background .15s;border-left:3px solid transparent;}
        .hi:hover{background:#162030;}
        .nt{font-family:'DM Mono',monospace;font-size:11px;padding:5px 10px;background:transparent;border:1px solid #253a56;color:#6a8aa8;cursor:pointer;transition:all .15s;letter-spacing:1px;border-radius:4px;}
        .nt:hover{border-color:#3d5e7a;color:#6a8aa8;}
        .toolc{display:flex;align-items:center;border:1px solid #253a56;background:#152033;color:#8bacc8;font-size:12px;padding:10px 14px;cursor:pointer;gap:6px;transition:all .15s;}
        .toolc:hover{border-color:#3d5e7a;color:#c8d8ea;}
        .lock-icon{font-size:9px;color:#5a7a98;margin-left:4px;}
      `}</style>

      {/* UPGRADE MODAL */}
      {upgradeModal&&<UpgradeModal featureName={upgradeModal} onClose={()=>setUpgradeModal(null)} onUpgrade={()=>{setUpgradeModal(null);setScreen("pricing");}}/>}

      {/* ACCOUNT PANEL */}
      {showAccount&&<AccountPanel plan={plan} billing={billing} gensUsed={gensUsed} gensLimit={genLimit}
        onManage={()=>{setShowAccount(false);setScreen("pricing");}}
        onLogout={()=>{setShowAccount(false);setScreen("pricing");setPlan("free");}}
        onClose={()=>setShowAccount(false)}/>}

      {/* TOPBAR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isMobile?"10px 14px":"12px 18px",borderBottom:"1px solid #1e2d42",background:"#0d1421",flexShrink:0,zIndex:50,gap:8,flexWrap:isMobile?"wrap":"nowrap"}}>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{display:"flex",gap:3}}>{["#ff2d2d","#f0b429","#7c83fd"].map((c,i)=><div key={i} style={{width:5,height:5,borderRadius:1,background:c}}/>)}</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:isMobile?16:18,letterSpacing:2,color:"#fff"}}>GENTAGAI<span style={{color:mc}}>.</span></div>
        </div>

        {/* MODE SWITCHER — scrollable on mobile */}
        <div style={{
          display:"flex",gap:4,
          flex:isMobile?"unset":1,
          justifyContent:isMobile?"flex-start":"center",
          overflowX:isMobile?"auto":"visible",
          width:isMobile?"100%":"auto",
          order:isMobile?3:0,
          paddingBottom:isMobile?"2px":0,
          msOverflowStyle:"none",scrollbarWidth:"none",
        }}>
          {[{id:"copy",label:"◈ Copy",c:"#00e5ff",free:true},{id:"image",label:"⬡ Images",c:"#ff7c00",free:false},{id:"video",label:"▷ Video",c:"#f0b429",free:false},{id:"ab",label:"⇄ A/B",c:"#7c83fd",free:false}].map(m=>(
            <button key={m.id} className="mbtn" onClick={()=>handleModeSwitch(m.id)}
              style={{
                ...(mode===m.id?{borderColor:m.c,color:m.c,background:`${m.c}08`}:{}),
                fontSize:isMobile?11:12,
                padding:isMobile?"8px 12px":"9px 16px",
                whiteSpace:"nowrap",
                flexShrink:0,
              }}>
              {m.label}{!m.free&&plan==="free"&&<span style={{fontSize:9,marginLeft:3}}>🔒</span>}
            </button>
          ))}
        </div>

        {/* Right side — gen meter + plan badge */}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?6:8,flexShrink:0}}>
          {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setShowAccount(true)}>
            <div style={{width:40,height:3,background:"#253a56",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:genPct>80?"#ff2d2d":currentPlan.color,width:`${genPct}%`,transition:"width .5s"}}/>
            </div>
            <div style={{fontSize:10,color:"#5a7a98"}}>{genLimit===Infinity?"∞":`${gensUsed}/${genLimit}`}</div>
          </div>}
          <div onClick={()=>setShowAccount(true)} style={{fontSize:isMobile?10:11,letterSpacing:1,padding:"4px 10px",border:`1px solid ${currentPlan.color}44`,color:currentPlan.color,textTransform:"uppercase",cursor:"pointer",borderRadius:3}}>{currentPlan.badge}</div>
          {running&&<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:mc}}><div style={{width:5,height:5,background:mc,borderRadius:"50%",animation:"bl .9s steps(1) infinite"}}/>GEN</div>}
          {step==="done"&&!running&&<div style={{width:6,height:6,background:"#00ff88",borderRadius:"50%"}}/>}
          {!isMobile&&lastSaved&&<div style={{fontSize:9,color:saveFlash?"#00ff88":"#2d4464",transition:"color .3s"}}>● SAVED</div>}
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>

        {/* ── MOBILE BOTTOM TAB BAR ── */}
        {isMobile&&(
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"#0d1421",borderTop:"1px solid #253a56",display:"flex",padding:"0"}}>
            <button onClick={()=>setMobileTab("config")}
              style={{flex:1,padding:"12px 0",border:"none",background:mobileTab==="config"?"#152033":"transparent",color:mobileTab==="config"?"#00e5ff":"#5a7a98",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",borderTop:mobileTab==="config"?"2px solid #00e5ff":"2px solid transparent"}}>
              ⚙ Configure
            </button>
            <button onClick={()=>setMobileTab("output")}
              style={{flex:1,padding:"12px 0",border:"none",background:mobileTab==="output"?"#152033":"transparent",color:mobileTab==="output"?"#00e5ff":"#5a7a98",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",borderTop:mobileTab==="output"?"2px solid #00e5ff":"2px solid transparent",position:"relative"}}>
              {step==="running"&&<span style={{position:"absolute",top:8,right:"30%",width:6,height:6,borderRadius:"50%",background:"#00e5ff",animation:"bl .9s steps(1) infinite"}}/>}
              {step==="done"&&<span style={{position:"absolute",top:8,right:"30%",width:6,height:6,borderRadius:"50%",background:"#00ff88"}}/>}
              ▶ Output
            </button>
            <button onClick={()=>setMobileTab("sessions")}
              style={{flex:1,padding:"12px 0",border:"none",background:mobileTab==="sessions"?"#152033":"transparent",color:mobileTab==="sessions"?"#00e5ff":"#5a7a98",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",borderTop:mobileTab==="sessions"?"2px solid #00e5ff":"2px solid transparent"}}>
              ◈ Sessions
            </button>
          </div>
        )}

        {/* LEFT CONFIG */}
        <div style={{
          width:isMobile?"100%":370,
          maxWidth:isMobile?"100%":"35vw",
          borderRight:isMobile?"none":"1px solid #253a56",
          overflowY:"auto",
          padding:isMobile?"16px 14px 80px":"24px 20px",
          background:"#0f1928",
          display:isMobile?(mobileTab==="config"?"flex":"none"):"flex",
          flexDirection:"column",
          gap:isMobile?20:28,
          flexShrink:0,
          minHeight:0,
          flex:isMobile?1:"unset",
        }}>

          <div>
            <div className="sl" style={{color:mc}}>01 — Brand Brief</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>BRAND NAME *</div>
                <input className="inp" placeholder="e.g. L' LEWCOR" value={brand} onChange={e=>setBrand(e.target.value)}/></div>
              <div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>NICHE *</div>
                <input className="inp" placeholder="e.g. Urban Streetwear" value={niche} onChange={e=>setNiche(e.target.value)}/>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>{NICHE_PRESETS.map(n=><button key={n} className="nt" onClick={()=>setNiche(n)}>{n}</button>)}</div>
              </div>
              <div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>TARGET AUDIENCE</div>
                <input className="inp" placeholder="Urban males 18-35" value={audience} onChange={e=>setAudience(e.target.value)}/></div>
              {mode!=="image"&&<>
                <div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>CAMPAIGN GOAL</div>
                  <input className="inp" placeholder="Drive sales, Launch Drop 001" value={goal} onChange={e=>setGoal(e.target.value)}/></div>
                {(mode==="copy"||mode==="ab")&&<div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>SEO KEYWORDS</div>
                  <input className="inp" placeholder="urban streetwear, limited drop" value={keywords} onChange={e=>setKeywords(e.target.value)}/></div>}
              </>}
            </div>
          </div>

          {/* ── PRODUCT INTEL ── */}
          <div>
            <div className="sl" style={{color:mc}}>02 — Product Intel</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>

              <div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>PRODUCT NAME</div>
                <input className="inp" placeholder="e.g. Urban Roots Tee Drop 001" value={productName} onChange={e=>setProductName(e.target.value)}/></div>

              <div>
                <div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>PRODUCT TYPE</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                  {["T-Shirt","Hoodie","Sneakers","Pants","Jacket","Accessory","Course","Software","Service","App","Food / Drink","Skincare","Supplement","Digital Download","Event / Drop","NFT / Collection"].map(t=>(
                    <button key={t} className="nt"
                      style={productType===t?{borderColor:mc,color:mc}:{}}
                      onClick={()=>setProductType(productType===t?"":t)}>{t}</button>
                  ))}
                </div>
                <input className="inp" placeholder="Or type your own product type..." value={productType} onChange={e=>setProductType(e.target.value)}/>
              </div>

              <div>
                <div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>PRODUCT DESCRIPTION *</div>
                <textarea className="inp"
                  placeholder={`Describe what makes your product unique.\n\nExamples:\n- Materials, features, quality\n- The story behind it\n- What problem it solves\n- Why someone would want it\n- Limited edition / drop details`}
                  value={productDesc}
                  onChange={e=>setProductDesc(e.target.value)}
                  style={{resize:"vertical",minHeight:110,lineHeight:1.7}}/>
                <div style={{fontSize:10,color:"#3d5e7a",marginTop:4,letterSpacing:.5}}>
                  {productDesc.length}/500 — {productDesc.length<30?"Add more detail for better results":productDesc.length<100?"Good — more detail = better AI output":"✓ Great detail — AI will nail this"}
                </div>
              </div>

              <div><div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",marginBottom:8,fontWeight:500}}>PRICE / VALUE PROP</div>
                <input className="inp" placeholder="e.g. $89 · Limited to 50 units" value={productPrice} onChange={e=>setProductPrice(e.target.value)}/></div>

              {/* Smart preview */}
              {(productName||productType||productDesc)&&(
                <div style={{background:"#162030",border:`1px solid ${mc}22`,borderLeft:`2px solid ${mc}`,padding:"14px 16px",marginTop:2}}>
                  <div style={{fontSize:10,letterSpacing:3,color:mc,textTransform:"uppercase",marginBottom:6}}>AI will use this intel</div>
                  {productName&&<div style={{fontSize:12,color:"#bccfe0",marginBottom:2}}>📦 {productName}</div>}
                  {productType&&<div style={{fontSize:12,color:"#8bacc8",marginBottom:2}}>🏷 {productType}</div>}
                  {productPrice&&<div style={{fontSize:12,color:"#8bacc8",marginBottom:2}}>💰 {productPrice}</div>}
                  {productDesc&&<div style={{fontSize:11,color:"#6a8aa8",lineHeight:1.6,marginTop:4}}>{productDesc.slice(0,100)}{productDesc.length>100?"...":""}</div>}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sl" style={{color:mc}}>03 — Platform</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {PLATFORMS.map(p=>{
                const locked=plan==="free"&&!p.free;
                return <div key={p.id} className={`chip ${platform===p.id&&!locked?"on":""}`}
                  onClick={()=>locked?setUpgradeModal(`${p.label} platform`):setPlatform(p.id)}
                  style={locked?{opacity:.4,cursor:"not-allowed"}:{}}>
                  <span style={{opacity:.4,fontSize:11}}>{p.icon}</span><span>{p.label}</span>{locked&&<span className="lock-icon">🔒</span>}
                </div>;
              })}
            </div>
          </div>

          {(mode==="copy"||mode==="ab")&&(
            <div>
              <div className="sl" style={{color:mc}}>04 — Content Type</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {CONTENT_TYPES.map(ct=>{
                  const locked=plan==="free"&&!ct.free;
                  return <div key={ct.id} className={`ctc ${contentType===ct.id&&!locked?"on":""} ${locked?"locked":""}`}
                    onClick={()=>locked?setUpgradeModal(`${ct.label} content`):setContentType(ct.id)}>
                    <div style={{fontSize:13,color:contentType===ct.id&&!locked?mc:"#9ab8d0",display:"flex",justifyContent:"space-between"}}>
                      {ct.label}{locked&&<span className="lock-icon">🔒</span>}
                    </div>
                    <div style={{fontSize:10,color:"#4a6a88",marginTop:1}}>{ct.desc}</div>
                  </div>;
                })}
              </div>
            </div>
          )}

          {mode==="image"&&(
            <div>
              <div style={{display:"flex",gap:4,marginBottom:16}}>
                <button onClick={()=>setImageFlow("generate")} style={{flex:1,padding:"10px 0",border:`1px solid ${imageFlow==="generate"?"#ff7c00":"#2a3f5c"}`,background:imageFlow==="generate"?"#ff7c0012":"#111c2e",color:imageFlow==="generate"?"#ff7c00":"#6a8aa8",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",transition:"all .2s"}}>
                  ⬡ Generate
                </button>
                <button onClick={()=>setImageFlow("amplify")} style={{flex:1,padding:"10px 0",border:`1px solid ${imageFlow==="amplify"?"#00e5ff":"#2a3f5c"}`,background:imageFlow==="amplify"?"#00e5ff12":"#111c2e",color:imageFlow==="amplify"?"#00e5ff":"#6a8aa8",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",transition:"all .2s"}}>
                  ◈ Upload & Amplify
                </button>
              </div>

              {imageFlow==="generate"&&(<>
                <div className="sl" style={{color:"#ff7c00"}}>Image Subject</div>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:14}}>
                  {IMAGE_TYPES.map(it=><div key={it.id} className={`ctc ${imageType===it.id?"on":""}`} onClick={()=>setImageType(it.id)}>
                    <div style={{fontSize:13,color:imageType===it.id?"#ff7c00":"#9ab8d0"}}>{it.label}</div>
                    <div style={{fontSize:10,color:"#4a6a88",marginTop:1}}>{it.desc}</div>
                  </div>)}
                </div>
                <div className="sl" style={{color:"#ff7c00"}}>Prompt Target Tool</div>
                <div style={{fontSize:11,color:"#4a6a88",marginBottom:6,lineHeight:1.6}}>Claude formats prompts for this tool. Nothing auto-runs — you paste the result.</div>
                {!imageTool&&<div style={{fontSize:11,color:"#ff7c0088",marginBottom:7,display:"flex",alignItems:"center",gap:6}}><div style={{width:5,height:5,borderRadius:"50%",background:"#ff7c00",animation:"bl .9s steps(1) infinite"}}/>Select a tool to continue</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {IMAGE_TOOLS.map(t=><div key={t.id} className="toolc" style={imageTool===t.id?{borderColor:t.color,color:t.color,background:`${t.color}10`}:{}} onClick={()=>setImageTool(t.id)}>{t.label}</div>)}
                </div>
                <div className="sl" style={{color:"#ff7c00"}}>AI Brain</div>
                {renderBrainPicker("#ff7c00")}
                <button className="gbtn" disabled={!brand||!niche||running||!imageTool} onClick={generate} style={{background:"linear-gradient(135deg,#ff7c00,#ff2200)",color:"#000",marginTop:4}}>
                  {running?"⟳  GENERATING...":"⬡  GENERATE PROMPTS"}
                </button>
                {brand&&niche&&!imageTool&&<div style={{fontSize:11,color:"#ff7c00",textAlign:"center",marginTop:4}}>↑ Select a Prompt Target Tool first</div>}
                {(!brand||!niche)&&<div style={{fontSize:11,color:"#3d5e7a",textAlign:"center",marginTop:4}}>Brand + Niche required</div>}
              </>)}

              {imageFlow==="amplify"&&(<>
                {/* Upload Zone */}
                {!uploadedImage?(
                  <div style={{marginBottom:20}}>
                    <div style={{border:"2px dashed #2d4464",background:"#152033",padding:"28px 16px",textAlign:"center",borderRadius:12,marginBottom:10}}>
                      <div style={{fontSize:40,marginBottom:10}}>🖼️</div>
                      <div style={{fontSize:16,color:"#c8d8ea",fontWeight:700,marginBottom:6}}>Upload Your Image</div>
                      <div style={{fontSize:13,color:"#6a8aa8",marginBottom:16}}>JPG · PNG · WEBP · GIF</div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e=>{if(e.target.files&&e.target.files[0])handleImageFile(e.target.files[0]);}}
                        style={{
                          display:"block",
                          width:"100%",
                          padding:"14px",
                          background:"#00e5ff",
                          color:"#000",
                          border:"none",
                          borderRadius:8,
                          fontSize:14,
                          fontWeight:700,
                          cursor:"pointer",
                          fontFamily:"'DM Mono',monospace",
                          letterSpacing:2,
                        }}
                      />
                    </div>
                  </div>
                ):(
                  <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",border:"2px solid #00e5ff44",position:"relative"}}>
                    <img src={uploadedImage.url} alt="upload" style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,#0d1421ee,transparent)"}}/>
                    <div style={{position:"absolute",bottom:10,left:12,right:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:"#00e5ff",letterSpacing:1,marginBottom:2}}>✓ IMAGE UPLOADED</div>
                        <div style={{fontSize:12,color:"#c8d8ea",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedImage.name}</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();setUploadedImage(null);}} style={{background:"#ff2d2d",border:"none",color:"#fff",fontSize:14,width:24,height:24,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                    </div>
                  </div>
                )}

                {/* Content Type Tiles */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <span>Choose What to Generate</span>
                  <div style={{flex:1,height:1,background:"#1e3050"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:8,marginBottom:18}}>
                  {[
                    {id:"viral_hooks",emoji:"🔥",label:"Viral Hooks",desc:"10 scroll-stoppers"},
                    {id:"seo_suite",emoji:"🔍",label:"SEO Suite",desc:"Title, keywords, alt text"},
                    {id:"trending_strategy",emoji:"📈",label:"Trending",desc:"Algorithm + viral plan"},
                    {id:"caption_pack",emoji:"✍",label:"Captions",desc:"4 styles + hashtags"},
                    {id:"ad_copy",emoji:"💰",label:"Ad Copy",desc:"FB · TikTok · Google"},
                    {id:"full_suite",emoji:"⚡",label:"FULL SUITE",desc:"Everything at once"},
                  ].map(a=>(
                    <div key={a.id} onClick={()=>setAmplifyType(a.id)}
                      style={{padding:"12px 10px",border:`1.5px solid ${amplifyType===a.id?"#00e5ff":"#1e3050"}`,background:amplifyType===a.id?"rgba(0,229,255,.08)":"#152033",cursor:"pointer",borderRadius:8,textAlign:"center",transition:"all .15s",position:"relative"}}>
                      {amplifyType===a.id&&<div style={{position:"absolute",top:6,right:6,width:6,height:6,borderRadius:"50%",background:"#00e5ff"}}/>}
                      <div style={{fontSize:22,marginBottom:5}}>{a.emoji}</div>
                      <div style={{fontSize:13,color:amplifyType===a.id?"#00e5ff":"#c8d8ea",fontWeight:500,marginBottom:2}}>{a.label}</div>
                      <div style={{fontSize:11,color:"#5a7a98",lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  ))}
                </div>

                {/* AI Brain */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <span>AI Brain</span><div style={{flex:1,height:1,background:"#1e3050"}}/>
                </div>
                {renderBrainPicker("#00e5ff")}

                {/* Generate Button */}
                <button className="gbtn" disabled={!uploadedImage||running||!brand||!niche} onClick={amplifyGenerate}
                  style={{background:uploadedImage&&brand&&niche?"linear-gradient(135deg,#00e5ff,#0055ff)":"#1e2d42",color:uploadedImage&&brand&&niche?"#000":"#3d5e7a",marginTop:4,fontSize:15,padding:"15px 0",letterSpacing:3}}>
                  {running?"⟳  GENERATING...":`◈  ${AI_BRAINS.find(b=>b.id===aiBrain)?.label||"AI"} GENERATE`}
                </button>
                {!brand||!niche?<div style={{textAlign:"center",fontSize:12,color:"#3d5e7a",marginTop:6}}>↑ Add Brand + Niche in Section 01</div>
                :!uploadedImage?<div style={{textAlign:"center",fontSize:12,color:"#3d5e7a",marginTop:6}}>↑ Upload an image above to begin</div>:null}
              </>)}
            </div>
          )}

          {mode==="video"&&(
            <div>
              <div style={{display:"flex",gap:4,marginBottom:16}}>
                <button onClick={()=>setVideoFlow("generate")} style={{flex:1,padding:"10px 0",border:`1px solid ${videoFlow==="generate"?"#f0b429":"#2a3f5c"}`,background:videoFlow==="generate"?"#f0b42912":"#111c2e",color:videoFlow==="generate"?"#f0b429":"#6a8aa8",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",transition:"all .2s"}}>
                  ▷ Generate Script
                </button>
                <button onClick={()=>setVideoFlow("amplify")} style={{flex:1,padding:"10px 0",border:`1px solid ${videoFlow==="amplify"?"#00e5ff":"#2a3f5c"}`,background:videoFlow==="amplify"?"#00e5ff12":"#111c2e",color:videoFlow==="amplify"?"#00e5ff":"#6a8aa8",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",transition:"all .2s"}}>
                  ◈ Upload & Amplify
                </button>
              </div>

              {videoFlow==="generate"&&(<>
                <div className="sl" style={{color:"#f0b429"}}>Video Ad Format</div>
                {!videoAdType&&<div style={{fontSize:11,color:"#f0b42988",marginBottom:7,display:"flex",alignItems:"center",gap:6}}><div style={{width:5,height:5,borderRadius:"50%",background:"#f0b429",animation:"bl .9s steps(1) infinite"}}/>Pick a format to continue</div>}
                <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:14}}>
                  {VIDEO_AD_TYPES.map(vt=><div key={vt.id} className={`ctc ${videoAdType===vt.id?"on":""}`} onClick={()=>setVideoAdType(vt.id)}>
                    <div style={{fontSize:13,color:videoAdType===vt.id?"#f0b429":"#9ab8d0"}}>{vt.label}</div>
                    <div style={{fontSize:10,color:"#4a6a88",marginTop:1}}>{vt.desc}</div>
                  </div>)}
                </div>
                <div className="sl" style={{color:"#f0b429"}}>Prompt Target Tool</div>
                <div style={{fontSize:11,color:"#4a6a88",marginBottom:6,lineHeight:1.6}}>Claude writes the script for this tool. Nothing auto-runs.</div>
                {!videoTool&&videoAdType&&<div style={{fontSize:11,color:"#f0b42988",marginBottom:7,display:"flex",alignItems:"center",gap:6}}><div style={{width:5,height:5,borderRadius:"50%",background:"#f0b429",animation:"bl .9s steps(1) infinite"}}/>Now pick your target tool</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {VIDEO_TOOLS.map(t=><div key={t.id} className="toolc" style={videoTool===t.id?{borderColor:t.color,color:t.color,background:`${t.color}10`}:{}} onClick={()=>setVideoTool(t.id)}>{t.label}</div>)}
                </div>
                <div className="sl" style={{color:"#f0b429"}}>AI Brain</div>
                {renderBrainPicker("#f0b429")}
                <button className="gbtn" disabled={!brand||!niche||running||!videoAdType||!videoTool} onClick={generate} style={{background:"linear-gradient(135deg,#f0b429,#ff8c00)",color:"#000",marginTop:4}}>
                  {running?"⟳  GENERATING...":"▷  GENERATE VIDEO AD"}
                </button>
                {brand&&niche&&!videoAdType&&<div style={{fontSize:11,color:"#f0b429",textAlign:"center",marginTop:4}}>↑ Select a Video Ad Format first</div>}
                {brand&&niche&&videoAdType&&!videoTool&&<div style={{fontSize:11,color:"#f0b429",textAlign:"center",marginTop:4}}>↑ Select a Prompt Target Tool</div>}
                {(!brand||!niche)&&<div style={{fontSize:11,color:"#3d5e7a",textAlign:"center",marginTop:4}}>Brand + Niche required</div>}
              </>)}

              {videoFlow==="amplify"&&(<>
                {/* Upload Zone */}
                {!uploadedVideo?(
                  <div style={{marginBottom:20}}>
                    <div style={{border:"2px dashed #2d4464",background:"#152033",padding:"28px 16px",textAlign:"center",borderRadius:12,marginBottom:10}}>
                      <div style={{fontSize:40,marginBottom:10}}>🎬</div>
                      <div style={{fontSize:16,color:"#c8d8ea",fontWeight:700,marginBottom:6}}>Upload Your Video</div>
                      <div style={{fontSize:13,color:"#6a8aa8",marginBottom:16}}>MP4 · MOV · WEBM · AVI</div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={e=>{if(e.target.files&&e.target.files[0])handleVideoFile(e.target.files[0]);}}
                        style={{
                          display:"block",
                          width:"100%",
                          padding:"14px",
                          background:"#f0b429",
                          color:"#000",
                          border:"none",
                          borderRadius:8,
                          fontSize:14,
                          fontWeight:700,
                          cursor:"pointer",
                          fontFamily:"'DM Mono',monospace",
                          letterSpacing:2,
                        }}
                      />
                    </div>
                  </div>
                ):(
                  <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",border:"2px solid #00e5ff44"}}>
                    <video src={uploadedVideo.url} style={{width:"100%",maxHeight:150,display:"block",objectFit:"cover"}} muted playsInline preload="metadata"/>
                    <div style={{padding:"14px 16px",background:"#152033",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:"#00e5ff",letterSpacing:1,marginBottom:2}}>✓ VIDEO UPLOADED</div>
                        <div style={{fontSize:12,color:"#c8d8ea",maxWidth:190,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedVideo.name}</div>
                        <div style={{fontSize:11,color:"#5a7a98",marginTop:1}}>{uploadedVideo.size} MB</div>
                      </div>
                      <button onClick={()=>setUploadedVideo(null)} style={{background:"#ff2d2d",border:"none",color:"#fff",fontSize:14,width:24,height:24,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                    </div>
                  </div>
                )}

                {/* Content Type Tiles */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <span>Choose What to Generate</span>
                  <div style={{flex:1,height:1,background:"#1e3050"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:8,marginBottom:18}}>
                  {[
                    {id:"viral_hooks",emoji:"🔥",label:"Viral Hooks",desc:"10 scroll-stoppers"},
                    {id:"seo_suite",emoji:"🔍",label:"SEO Suite",desc:"Title, tags, keywords"},
                    {id:"trending_strategy",emoji:"📈",label:"Trending",desc:"Algorithm + viral plan"},
                    {id:"caption_pack",emoji:"✍",label:"Captions",desc:"4 styles + hashtags"},
                    {id:"ad_copy",emoji:"💰",label:"Ad Copy",desc:"FB · TikTok · YouTube"},
                    {id:"full_suite",emoji:"⚡",label:"FULL SUITE",desc:"Everything at once"},
                  ].map(a=>(
                    <div key={a.id} onClick={()=>setAmplifyType(a.id)}
                      style={{padding:"12px 10px",border:`1.5px solid ${amplifyType===a.id?"#00e5ff":"#1e3050"}`,background:amplifyType===a.id?"rgba(0,229,255,.08)":"#152033",cursor:"pointer",borderRadius:8,textAlign:"center",transition:"all .15s",position:"relative"}}>
                      {amplifyType===a.id&&<div style={{position:"absolute",top:6,right:6,width:6,height:6,borderRadius:"50%",background:"#00e5ff"}}/>}
                      <div style={{fontSize:22,marginBottom:5}}>{a.emoji}</div>
                      <div style={{fontSize:13,color:amplifyType===a.id?"#00e5ff":"#c8d8ea",fontWeight:500,marginBottom:2}}>{a.label}</div>
                      <div style={{fontSize:11,color:"#5a7a98",lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  ))}
                </div>

                {/* AI Brain */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <span>AI Brain</span><div style={{flex:1,height:1,background:"#1e3050"}}/>
                </div>
                {renderBrainPicker("#00e5ff")}

                {/* Generate Button */}
                <button className="gbtn" disabled={!uploadedVideo||running||!brand||!niche} onClick={amplifyGenerate}
                  style={{background:uploadedVideo&&brand&&niche?"linear-gradient(135deg,#00e5ff,#0055ff)":"#1e2d42",color:uploadedVideo&&brand&&niche?"#000":"#3d5e7a",marginTop:4,fontSize:15,padding:"15px 0",letterSpacing:3}}>
                  {running?"⟳  GENERATING...":`◈  ${AI_BRAINS.find(b=>b.id===aiBrain)?.label||"AI"} GENERATE`}
                </button>
                {!brand||!niche?<div style={{textAlign:"center",fontSize:12,color:"#3d5e7a",marginTop:6}}>↑ Add Brand + Niche in Section 01</div>
                :!uploadedVideo?<div style={{textAlign:"center",fontSize:12,color:"#3d5e7a",marginTop:6}}>↑ Upload a video above to begin</div>:null}
              </>)}
            </div>
          )}

          {mode==="ab"&&(
            <div>
              <div className="sl" style={{color:"#7c83fd"}}>05 — A/B Variable</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {AB_VARIABLES.map(v=><div key={v.id} className={`ctc ${abVar===v.id?"on":""}`} onClick={()=>setAbVar(v.id)}>
                  <div style={{fontSize:13,color:abVar===v.id?"#7c83fd":"#9ab8d0"}}>{v.label}</div>
                  <div style={{fontSize:10,color:"#4a6a88",marginTop:1}}>{v.desc}</div>
                </div>)}
              </div>
            </div>
          )}

          <div>
            <div className="sl" style={{color:mc}}>{mode==="ab"?"06":"05"} — Tone</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {TONES.map(t=>{
                const locked=plan==="free"&&!t.free;
                return <div key={t.id} onClick={()=>locked?setUpgradeModal(`${t.label} tone`):setTone(t.id)}
                  style={{padding:"5px 10px",border:`1px solid ${tone===t.id&&!locked?t.color:"#2a3f5c"}`,background:tone===t.id&&!locked?`${t.color}12`:"#152033",cursor:locked?"not-allowed":"pointer",color:tone===t.id&&!locked?t.color:"#6a8aa8",fontSize:12,letterSpacing:1,transition:"all .15s",opacity:locked?.45:1}}>
                  {t.label}{locked&&<span className="lock-icon">🔒</span>}
                </div>;
              })}
            </div>
          </div>

          <button className="gbtn"
            disabled={!brand||!niche||running||(mode==="video"&&(!videoAdType||!videoTool))||(mode==="image"&&!imageTool)}
            onClick={generate}
            style={{background:mode==="video"?"linear-gradient(135deg,#f0b429,#ff8c00)":mode==="image"?"linear-gradient(135deg,#ff7c00,#ff2200)":mode==="ab"?"linear-gradient(135deg,#7c83fd,#0044ff)":"linear-gradient(135deg,#00e5ff,#0044ff)",color:"#000"}}>
            {running?"⟳  GENERATING...":mode==="image"?"⬡  GENERATE PROMPTS":mode==="video"?"▷  GENERATE VIDEO AD":mode==="ab"?"⇄  RUN A/B TEST":"▶  GENERATE CONTENT"}
          </button>

          {/* Required selection hints */}
          {(!brand||!niche)&&<div style={{fontSize:11,color:"#3d5e7a",textAlign:"center",letterSpacing:1,marginTop:-10}}>Brand + Niche required</div>}
          {mode==="image"&&brand&&niche&&!imageTool&&<div style={{fontSize:11,color:"#ff7c00",textAlign:"center",letterSpacing:1,marginTop:-10}}>↑ Select a Prompt Target Tool above</div>}
          {mode==="video"&&brand&&niche&&!videoAdType&&<div style={{fontSize:11,color:"#f0b429",textAlign:"center",letterSpacing:1,marginTop:-10}}>↑ Select a Video Ad Format above</div>}
          {mode==="video"&&brand&&niche&&videoAdType&&!videoTool&&<div style={{fontSize:11,color:"#f0b429",textAlign:"center",letterSpacing:1,marginTop:-10}}>↑ Select a Prompt Target Tool above</div>}

          {plan==="free"&&gensUsed>=3&&<div style={{background:"#0f0a00",border:"1px solid #f0b42922",borderRadius:6,padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:12,color:"#f0b429",letterSpacing:1,marginBottom:6}}>{currentPlan.gens-gensUsed} free gens left</div>
            <button onClick={()=>setScreen("pricing")} style={{fontSize:12,letterSpacing:2,padding:"7px 16px",border:"1px solid #f0b42955",background:"transparent",color:"#f0b429",cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase"}}>Upgrade →</button>
          </div>}
        </div>

        {/* CENTER OUTPUT */}
        <div style={{
          flex:1,
          display:isMobile?(mobileTab==="output"?"flex":"none"):"flex",
          flexDirection:"column",
          overflow:"hidden",
          minWidth:0,
          minHeight:0,
          paddingBottom:isMobile?"80px":0,
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 18px",borderBottom:"1px solid #1e2d42",background:"#0d1421",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
              {mode==="ab"?(
                <><button className={`sm ${abTab==="variants"?"on":""}`} onClick={()=>setAbTab("variants")}>⇄ Variants</button>
                <button className={`sm ${abTab==="scores"?"on":""}`} onClick={()=>setAbTab("scores")} disabled={!abA||!abB}>◈ Scores</button></>
              ):(
                <><div style={{fontSize:10,letterSpacing:3,color:"#4a6a88",textTransform:"uppercase"}}>
                  {mode==="image"?(IMAGE_TYPES.find(c=>c.id===imageType)?.label):mode==="video"?(VIDEO_AD_TYPES.find(c=>c.id===videoAdType)?.label):(CONTENT_TYPES.find(c=>c.id===contentType)?.label)}
                </div>
                <div style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${selTone?.color||"#2d4464"}33`,color:selTone?.color||"#5a7a98",textTransform:"uppercase"}}>{selTone?.label}</div>
                {mode==="image"&&<div style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${IMAGE_TOOLS.find(t=>t.id===imageTool)?.color||"#2d4464"}44`,color:IMAGE_TOOLS.find(t=>t.id===imageTool)?.color||"#5a7a98",textTransform:"uppercase"}}>{IMAGE_TOOLS.find(t=>t.id===imageTool)?.label}</div>}
                {mode==="video"&&<div style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${VIDEO_TOOLS.find(t=>t.id===videoTool)?.color||"#2d4464"}44`,color:VIDEO_TOOLS.find(t=>t.id===videoTool)?.color||"#5a7a98",textTransform:"uppercase"}}>{VIDEO_TOOLS.find(t=>t.id===videoTool)?.label}</div>}
                {(mode==="image"||mode==="video")&&(uploadedImage||uploadedVideo)&&(()=>{const b=AI_BRAINS.find(x=>x.id===aiBrain);return b?<div style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${b.color}55`,color:b.color,background:`${b.color}0a`,textTransform:"uppercase"}}>{b.icon} {b.label}</div>:null;})()}
                </>
              )}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {step==="done"&&mode!=="ab"&&<button className="sm" style={{color:copied==="main"?"#00ff88":""}} onClick={()=>copy(output,"main")}>{copied==="main"?"✓ COPIED":"COPY"}</button>}
              {step==="done"&&mode==="ab"&&abA&&abB&&abTab==="variants"&&!scoring&&!scores&&(
                <button className="sm" style={{borderColor:"#7c83fd44",color:"#7c83fd"}} onClick={runScoring}>◈ ANALYZE & SCORE</button>
              )}
              {scoring&&<div style={{fontSize:11,color:"#7c83fd",letterSpacing:2}}>ANALYZING...</div>}
              {step!=="idle"&&<button className="sm" onClick={reset}>← RESET</button>}
            </div>
          </div>

          {running&&<div style={{flexShrink:0}}>{[0,1,2].map(i=><div key={i} className="gline" style={{background:`linear-gradient(90deg,${mc},${mc}44)`,animationDelay:`${i*.28}s`}}/>)}</div>}

          <div ref={outRef} style={{flex:1,overflowY:"auto",padding:mode==="ab"?"0":isMobile?"20px 16px":"32px 36px",minHeight:0,wordBreak:"break-word"}}>
            {step==="idle"&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:14,userSelect:"none"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:64,color:"#162030",letterSpacing:4,lineHeight:1}}>GENTAGAI</div>
                <div style={{fontSize:11,letterSpacing:4,color:"#2e4a64",textTransform:"uppercase"}}>Configure → Generate</div>
              </div>
            )}

            {(mode==="copy"||mode==="image"||mode==="video")&&(step==="running"||step==="done"||output.length>0||outputRef.current.length>0)&&(
              <div>
                {brand&&<div style={{marginBottom:20,paddingBottom:14,borderBottom:"1px solid #1e2d42"}}>
                  <div style={{fontSize:10,letterSpacing:4,color:"#3d5e7a",textTransform:"uppercase",marginBottom:5}}>
                    {uploadedImage||uploadedVideo?"Analyzing":"Generating"} for
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#fff",letterSpacing:2}}>{brand}</div>
                  <div style={{fontSize:12,color:"#4a6a88",marginTop:3}}>{niche}{mode==="video"&&` · ${VIDEO_AD_TYPES.find(v=>v.id===videoAdType)?.label}`}</div>
                </div>}

                {/* Uploaded image preview */}
                {mode==="image"&&uploadedImage&&imageFlow==="amplify"&&(
                  <div style={{marginBottom:20,display:"flex",gap:14,alignItems:"flex-start",padding:"14px",background:"#162030",border:"1px solid #ff7c0033",borderRadius:6}}>
                    <img src={uploadedImage.url} alt="uploaded" style={{width:80,height:80,objectFit:"cover",borderRadius:4,flexShrink:0,border:"1px solid #ff7c0055"}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,letterSpacing:2,color:"#ff7c00",textTransform:"uppercase",marginBottom:4}}>Analyzing This Image</div>
                      <div style={{fontSize:13,color:"#bccfe0",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedImage.name}</div>
                      <div style={{fontSize:11,color:"#5a7a98"}}>{uploadedImage.size} KB</div>
                    </div>
                  </div>
                )}

                {/* Uploaded video preview */}
                {mode==="video"&&uploadedVideo&&videoFlow==="amplify"&&(
                  <div style={{marginBottom:20,background:"#162030",border:"1px solid #f0b42933",borderRadius:6,overflow:"hidden"}}>
                    <video src={uploadedVideo.url} controls style={{width:"100%",maxHeight:160,display:"block",background:"#000"}}/>
                    <div style={{padding:"10px 14px",display:"flex",gap:12,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#f0b429",textTransform:"uppercase",marginBottom:2}}>Analyzing This Video</div>
                        <div style={{fontSize:12,color:"#6a8aa8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedVideo.name} · {uploadedVideo.size} MB</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`otext ${running?"blink":""}`} style={{minHeight:"20px",display:"block"}}>{output||outputRef.current}</div>

                {/* ── PUBLISH PANEL ── */}
                {step==="done"&&output&&(
                  <div style={{marginTop:32,borderTop:"2px solid #253a56",paddingTop:24}}>

                    {/* Header */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                      <div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#fff",letterSpacing:1,marginBottom:4}}>
                          📤 Publish Your {mode==="image"?"Image":"Video"}
                        </div>
                        <div style={{fontSize:13,color:"#6a8aa8",lineHeight:1.6}}>
                          {uploadedImage?"Your image is ready to post."
                          :uploadedVideo?"Your video is ready to post."
                          :mode==="image"?"Use the AI prompts above to generate your image, then come back to post it."
                          :"Use the script above to create your video, then come back to post it."}
                        </div>
                      </div>
                      <button onClick={downloadFile} style={{padding:"10px 16px",border:"1px solid #253a56",background:"transparent",color:"#6a8aa8",fontSize:12,letterSpacing:1,cursor:"pointer",fontFamily:"'DM Mono',monospace",borderRadius:4,flexShrink:0,display:uploadedImage||uploadedVideo?"block":"none"}}>↓ Download</button>
                    </div>

                    {/* Upload your finished image/video if not already uploaded */}
                    {!uploadedImage&&!uploadedVideo&&(
                      <div style={{marginBottom:24}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",textTransform:"uppercase",marginBottom:10,fontWeight:500}}>
                          Upload Your Finished {mode==="image"?"Image":"Video"} to Publish
                        </div>
                        {mode==="image"?(
                          <>
                            <div style={{border:"2px dashed #2d4464",background:"#152033",padding:"20px 16px",textAlign:"center",borderRadius:10,marginBottom:8}}>
                              <div style={{fontSize:30,marginBottom:8}}>🖼️</div>
                              <div style={{fontSize:14,color:"#c8d8ea",fontWeight:600,marginBottom:4}}>Upload Your Image</div>
                              <div style={{fontSize:12,color:"#5a7a98",marginBottom:14}}>JPG · PNG · WEBP · GIF</div>
                              <input type="file" accept="image/*"
                                onChange={e=>{if(e.target.files&&e.target.files[0])handleImageFile(e.target.files[0]);}}
                                style={{display:"block",width:"100%",padding:"12px",background:"#00e5ff",color:"#000",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}
                              />
                            </div>
                          </>
                        ):(
                          <>
                            <div style={{border:"2px dashed #2d4464",background:"#152033",padding:"20px 16px",textAlign:"center",borderRadius:10,marginBottom:8}}>
                              <div style={{fontSize:30,marginBottom:8}}>🎬</div>
                              <div style={{fontSize:14,color:"#c8d8ea",fontWeight:600,marginBottom:4}}>Upload Your Video</div>
                              <div style={{fontSize:12,color:"#5a7a98",marginBottom:14}}>MP4 · MOV · WEBM · AVI</div>
                              <input type="file" accept="video/*"
                                onChange={e=>{if(e.target.files&&e.target.files[0])handleVideoFile(e.target.files[0]);}}
                                style={{display:"block",width:"100%",padding:"12px",background:"#f0b429",color:"#000",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Show uploaded file preview in publish panel */}
                    {uploadedImage&&(
                      <div style={{marginBottom:20,display:"flex",gap:14,alignItems:"center",padding:"14px",background:"#0f1928",border:"1px solid #00e5ff33",borderRadius:8}}>
                        <img src={uploadedImage.url} alt="ready" style={{width:80,height:80,objectFit:"cover",borderRadius:6,flexShrink:0,border:"2px solid #00e5ff44"}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:"#00e5ff",letterSpacing:1,marginBottom:3}}>✓ IMAGE READY TO PUBLISH</div>
                          <div style={{fontSize:13,color:"#c8d8ea",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedImage.name}</div>
                          <div style={{fontSize:11,color:"#4a6a88"}}>{uploadedImage.size} KB</div>
                        </div>
                        <button onClick={()=>setUploadedImage(null)} style={{background:"none",border:"1px solid #253a56",color:"#6a8aa8",fontSize:11,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",borderRadius:4}}>Change</button>
                      </div>
                    )}
                    {uploadedVideo&&(
                      <div style={{marginBottom:20,background:"#0f1928",border:"1px solid #00e5ff33",borderRadius:8,overflow:"hidden"}}>
                        <video src={uploadedVideo.url} style={{width:"100%",maxHeight:160,display:"block",objectFit:"cover"}} muted playsInline preload="metadata"/>
                        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:"#00e5ff",letterSpacing:1,marginBottom:2}}>✓ VIDEO READY TO PUBLISH</div>
                            <div style={{fontSize:13,color:"#c8d8ea",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedVideo.name}</div>
                            <div style={{fontSize:11,color:"#4a6a88",marginTop:2}}>{uploadedVideo.size} MB</div>
                          </div>
                          <button onClick={()=>setUploadedVideo(null)} style={{background:"none",border:"1px solid #253a56",color:"#6a8aa8",fontSize:11,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",borderRadius:4}}>Change</button>
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    <div style={{marginBottom:20}}>
                      <div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>Your Post Caption</div>
                      <textarea value={publishCaption} onChange={e=>setPublishCaption(e.target.value)}
                        placeholder={output.slice(0,200)||`${brand} — ${productName||niche} #newdrop`}
                        style={{width:"100%",background:"#152033",border:"1.5px solid #2d4464",color:"#e8edf8",fontFamily:"'DM Mono',monospace",fontSize:14,padding:"14px 16px",resize:"vertical",minHeight:90,outline:"none",lineHeight:1.8,borderRadius:6}}/>
                      <div style={{fontSize:11,color:"#4a6a88",marginTop:4}}>{publishCaption.length>0?`${publishCaption.length} chars — copy-paste ready`:"Leave blank to use the AI-generated content above"}</div>
                    </div>

                    {/* Platform URL Setup */}
                    <div style={{marginBottom:20}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",textTransform:"uppercase",fontWeight:500}}>Your Platform Profiles</div>
                        <button onClick={()=>setShowURLSetup(s=>!s)}
                          style={{fontSize:11,padding:"5px 12px",border:"1px solid #253a56",background:showURLSetup?"#1e3050":"transparent",color:"#6a8aa8",cursor:"pointer",fontFamily:"'DM Mono',monospace",borderRadius:4,letterSpacing:1}}>
                          {showURLSetup?"Hide":"⚙ Setup URLs"}
                        </button>
                      </div>
                      <div style={{fontSize:12,color:"#4a6a88",marginBottom:showURLSetup?12:0,lineHeight:1.6}}>
                        {showURLSetup?"Enter your profile URLs below. Saved in your browser — enter once, use forever.":"Enter your URLs once and we'll direct-link you to post instantly on any platform."}
                      </div>
                      {showURLSetup&&(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {PUBLISH_PLATFORMS.map(pf=>(
                            <div key={pf.id} style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:16,flexShrink:0,width:24,textAlign:"center"}}>{pf.icon}</span>
                              <div style={{flex:1}}>
                                <input
                                  placeholder={`Your ${pf.label} profile URL or @handle`}
                                  value={platformURLs[pf.id]||""}
                                  onChange={e=>{
                                    const v=e.target.value;
                                    setPlatformURLs(u=>({...u,[pf.id]:v}));
                                    try{const s=JSON.parse(localStorage.getItem("gentagai_platform_urls")||"{}");s[pf.id]=v;localStorage.setItem("gentagai_platform_urls",JSON.stringify(s));}catch{}
                                  }}
                                  style={{width:"100%",background:"#0f1928",border:"1px solid #253a56",color:"#c8d8ea",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"10px 12px",outline:"none",borderRadius:4}}
                                />
                              </div>
                              {platformURLs[pf.id]&&<div style={{width:8,height:8,borderRadius:"50%",background:"#00ff88",flexShrink:0}}/>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Platform Picker — select up to 3 */}
                    <div style={{fontSize:12,letterSpacing:2,color:"#8bacc8",textTransform:"uppercase",marginBottom:12,fontWeight:500}}>
                      Select Platforms <span style={{color:"#4a6a88",fontSize:11,fontWeight:400,letterSpacing:1}}>(up to 3)</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                      {PUBLISH_PLATFORMS.map(pf=>{
                        const isPicked=publishPicks.includes(pf.id);
                        const hasURL=!!platformURLs[pf.id];
                        const isDone=publishStatus[pf.id]==="done";
                        return(
                          <div key={pf.id} onClick={()=>!isDone&&togglePublishPick(pf.id)}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",border:`1.5px solid ${isPicked?pf.color+"88":"#253a56"}`,background:isPicked?`${pf.color}0d`:"#152033",cursor:publishPicks.length>=3&&!isPicked?"not-allowed":"pointer",transition:"all .15s",borderRadius:6,opacity:publishPicks.length>=3&&!isPicked?.4:1,position:"relative"}}>
                            <span style={{fontSize:18}}>{pf.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,color:isPicked?pf.color:"#c8d8ea",fontWeight:isPicked?500:400}}>{pf.label}</div>
                              <div style={{fontSize:10,color:hasURL?"#00ff8866":"#3d5e7a",marginTop:1}}>{hasURL?"✓ URL saved":"No URL yet"}</div>
                            </div>
                            {isDone&&<span style={{fontSize:13,color:"#00ff88"}}>✓</span>}
                            {isPicked&&!isDone&&<div style={{width:8,height:8,borderRadius:"50%",background:pf.color}}/>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Publish Action Buttons */}
                    {publishPicks.length>0&&(
                      <div>
                        <button onClick={publishSelected}
                          style={{width:"100%",padding:"16px 0",border:"none",background:"linear-gradient(135deg,#00e5ff,#0055ff)",color:"#000",fontSize:14,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontWeight:600,borderRadius:6,marginBottom:10}}>
                          {publishPicks.length===1
                            ?`↗ POST TO ${PUBLISH_PLATFORMS.find(p=>p.id===publishPicks[0])?.label.toUpperCase()}`
                            :`↗ POST TO ${publishPicks.length} PLATFORMS AT ONCE`}
                        </button>
                        <div style={{background:"#0f1928",border:"1px solid #1e3050",borderRadius:6,padding:"12px 16px"}}>
                          <div style={{fontSize:11,color:"#4a6a88",marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>What happens when you click:</div>
                          {publishPicks.map(id=>{
                            const pf=PUBLISH_PLATFORMS.find(p=>p.id===id);
                            const hasURL=!!platformURLs[id];
                            return(
                              <div key={id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8,paddingBottom:8,borderBottom:"1px solid #1a2840"}}>
                                <span style={{fontSize:15,flexShrink:0}}>{pf?.icon}</span>
                                <div>
                                  <div style={{fontSize:13,color:pf?.color||"#8bacc8",fontWeight:500,marginBottom:2}}>{pf?.label}</div>
                                  <div style={{fontSize:11,color:"#5a7a98",lineHeight:1.6}}>
                                    {pf?.shareUrl
                                      ?"Caption auto-attached → Opens share page in new tab"
                                      :hasURL
                                      ?`Caption copied to clipboard → Opens ${pf?.label} upload page → Paste & post`
                                      :"Caption copied → Opens platform upload page (add your URL in ⚙ Setup for direct link)"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {publishPicks.length===0&&(
                      <div style={{textAlign:"center",padding:"20px",border:"1px dashed #1e3050",borderRadius:6}}>
                        <div style={{fontSize:13,color:"#4a6a88"}}>↑ Select at least one platform above to publish</div>
                      </div>
                    )}

                    {/* ── STEP-BY-STEP GUIDE — shows after clicking post ── */}
                    {activePlatformGuide&&PLATFORM_STEPS[activePlatformGuide]&&(()=>{
                      const guide=PLATFORM_STEPS[activePlatformGuide];
                      return(
                        <div style={{marginTop:20,background:"#0f1928",border:`2px solid ${guide.color}55`,borderRadius:10,overflow:"hidden"}}>
                          <div style={{background:`${guide.color}22`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:22}}>{guide.icon}</span>
                              <div>
                                <div style={{fontSize:14,color:guide.color,fontWeight:600,letterSpacing:1}}>How to Post on {guide.name}</div>
                                <div style={{fontSize:11,color:"#6a8aa8",marginTop:2}}>Follow these steps — takes under 30 seconds</div>
                              </div>
                            </div>
                            <button onClick={()=>setActivePlatformGuide(null)}
                              style={{background:"none",border:"none",color:"#6a8aa8",fontSize:18,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>✕</button>
                          </div>
                          <div style={{padding:"18px"}}>
                            {guide.steps.map((step,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
                                <div style={{width:24,height:24,borderRadius:"50%",background:i===0?`${guide.color}33`:"#152033",border:`1px solid ${i===0?guide.color:"#253a56"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                                  <span style={{fontSize:11,color:i===0?guide.color:"#6a8aa8",fontWeight:600}}>{i+1}</span>
                                </div>
                                <div style={{fontSize:13,color:i===0?"#00ff88":"#c8d8ea",lineHeight:1.6,fontWeight:i===0?500:400}}>{step}</div>
                              </div>
                            ))}
                            <div style={{marginTop:16,padding:"12px 14px",background:"#152033",borderRadius:6,border:`1px solid ${guide.color}33`}}>
                              <div style={{fontSize:11,color:"#5a7a98",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>💡 Pro Tip</div>
                              <div style={{fontSize:12,color:"#8bacc8",lineHeight:1.6}}>{guide.tip}</div>
                            </div>
                            <div style={{marginTop:14,padding:"10px 14px",background:`${guide.color}11`,borderRadius:6,display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:16}}>📋</span>
                              <div>
                                <div style={{fontSize:12,color:guide.color,fontWeight:500}}>Caption copied to clipboard!</div>
                                <div style={{fontSize:11,color:"#6a8aa8",marginTop:2}}>Just paste it (Ctrl+V or hold → Paste) in the {guide.name} app or website</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Mobile share button */}
                    <div style={{marginTop:16,textAlign:"center"}}>
                      <button onClick={webShare}
                        style={{padding:"12px 24px",border:"1px solid #253a56",background:"transparent",color:"#6a8aa8",fontSize:12,letterSpacing:2,cursor:"pointer",fontFamily:"'DM Mono',monospace",borderRadius:6,textTransform:"uppercase"}}>
                        📱 Mobile Share (iOS/Android)
                      </button>
                      <div style={{fontSize:11,color:"#3d5e7a",marginTop:6}}>Opens native share sheet on mobile devices</div>
                    </div>

                    {/* Phase 2 notice */}
                    <div style={{marginTop:16,padding:"14px 16px",background:"#0d1421",border:"1px solid #1e3050",borderRadius:6}}>
                      <div style={{fontSize:11,color:"#3d5e7a",lineHeight:1.8}}>
                        🔒 <span style={{color:"#4a6a88"}}>Auto-posting coming in Phase 2</span> — direct API posting to Instagram, TikTok & YouTube requires platform API approval. Currently the fastest manual flow: caption copies instantly, platform opens, paste & post in under 30 seconds.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode==="ab"&&step!=="idle"&&abTab==="variants"&&(
              <div style={{display:"flex",height:"100%"}}>
                <div className="vp" style={{borderRight:"1px solid #1e2d42"}}>
                  <div style={{padding:"10px 15px",borderBottom:"1px solid #1e2d42",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f1928",flexShrink:0}}>
                    <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase"}}>Variant A</div>
                    {abA&&<button className="sm" style={{padding:"3px 9px",fontSize:11,color:copied==="A"?"#00ff88":""}} onClick={()=>copy(abA,"A")}>{copied==="A"?"✓":"COPY"}</button>}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}><div className={`otext ${running&&!abA?"blink":""}`} style={{fontSize:14.5}}>{abA}</div></div>
                </div>
                <div className="vp">
                  <div style={{padding:"10px 15px",borderBottom:"1px solid #1e2d42",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f1928",flexShrink:0}}>
                    <div style={{fontSize:12,letterSpacing:3,color:"#7c83fd",textTransform:"uppercase"}}>Variant B</div>
                    {abB&&<button className="sm" style={{padding:"3px 9px",fontSize:11,color:copied==="B"?"#00ff88":""}} onClick={()=>copy(abB,"B")}>{copied==="B"?"✓":"COPY"}</button>}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}><div className={`otext ${running&&!abB?"blink":""}`} style={{fontSize:14.5}}>{abB}</div></div>
                </div>
              </div>
            )}

            {mode==="ab"&&abTab==="scores"&&(
              <div style={{padding:"24px",overflowY:"auto",height:"100%"}}>
                {scoring&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60%",gap:14,opacity:.4}}>
                  <div style={{fontSize:11,letterSpacing:4,color:"#7c83fd",textTransform:"uppercase"}}>Analyzing Variants...</div>
                </div>}
                {scores&&!scores.error&&(
                  <div>
                    <div style={{marginBottom:20,paddingBottom:14,borderBottom:"1px solid #1e2d42"}}>
                      <div style={{fontSize:10,letterSpacing:4,color:"#f0b429",textTransform:"uppercase",marginBottom:6}}>Analysis Complete</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#fff"}}>Variant {scores.winner} Wins</div>
                      <div style={{fontSize:14,color:"#6a8aa8",marginTop:5,lineHeight:1.7}}>{scores.winnerReason}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {["A","B"].map(v=>{
                        const s=v==="A"?scores.variantA:scores.variantB;
                        const isW=scores.winner===v;const ac=v==="A"?"#00e5ff":"#7c83fd";
                        return(<div key={v} style={{background:isW?`${ac}05`:"#152033",border:`1px solid ${isW?ac+"44":"#243650"}`,padding:"16px"}}>
                          {isW&&<div style={{display:"inline-flex",alignItems:"center",gap:5,background:`${ac}0f`,border:`1px solid ${ac}33`,color:ac,fontSize:10,letterSpacing:3,padding:"3px 10px",textTransform:"uppercase",marginBottom:10}}>✦ WINNER</div>}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
                            <div style={{fontSize:12,color:ac,letterSpacing:3,textTransform:"uppercase"}}>Variant {v}</div>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:30,color:"#fff"}}>{s.totalScore}</div>
                          </div>
                          <ScoreBar label="Emotional" value={s.emotional} color={ac}/>
                          <ScoreBar label="Scroll-Stop" value={s.scrollStop} color={ac}/>
                          <ScoreBar label="Clarity" value={s.clarity} color={ac}/>
                          <ScoreBar label="CTA" value={s.cta} color={ac}/>
                          <ScoreBar label="Algorithm" value={s.algorithm} color={ac}/>
                          <div style={{marginTop:10,padding:"12px 14px",background:"#172236",borderLeft:`2px solid ${ac}44`,fontSize:12,color:"#6a8aa8",lineHeight:1.6}}>{s.verdict}</div>
                          <button className="sm" style={{marginTop:10,width:"100%",borderColor:`${ac}33`,color:copied===`v${v}`?"#00ff88":ac}} onClick={()=>copy(v==="A"?abA:abB,`v${v}`)}>
                            {copied===`v${v}`?"✓ COPIED":`USE VARIANT ${v}`}
                          </button>
                        </div>);
                      })}
                    </div>
                  </div>
                )}
                {scores?.error&&<div style={{color:"#ff4444",fontSize:14,padding:16}}>{scores.error}</div>}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT HISTORY */}
        <div style={{
          width:isMobile?"100%":200,
          borderLeft:isMobile?"none":"1px solid #1e2d42",
          background:"#0f1928",
          display:isMobile?(mobileTab==="sessions"?"flex":"none"):"flex",
          flexDirection:"column",
          overflow:"hidden",
          flexShrink:0,
          paddingBottom:isMobile?"80px":0,
          position:isMobile?"absolute":"relative",
          inset:isMobile?"0":"auto",
          zIndex:isMobile?100:"auto",
        }}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1e2d42",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:10,letterSpacing:4,color:"#3a5572",textTransform:"uppercase"}}>Sessions</div>
            {history.length>0&&<button onClick={()=>{if(window.confirm("Clear all sessions?"))setHistory([]);}} style={{background:"none",border:"none",color:"#3d5e7a",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>CLEAR</button>}
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {history.length===0
              ?<div style={{padding:14,fontSize:11,color:"#2e4a64",letterSpacing:.5,lineHeight:2}}>Auto-saved sessions appear here.</div>
              :history.map(e=>{
                const mColor={copy:"#00e5ff",image:"#ff7c00",video:"#f0b429",ab:"#7c83fd"}[e.mode]||"#5a7a98";
                const mIcon={copy:"◈",image:"⬡",video:"▷",ab:"⇄"}[e.mode]||"·";
                const label=e.mode==="image"?(IMAGE_TYPES.find(c=>c.id===e.contentType)?.label):e.mode==="video"?(VIDEO_AD_TYPES.find(c=>c.id===e.contentType)?.label):(CONTENT_TYPES.find(c=>c.id===e.contentType)?.label)||e.contentType;
                return(<div key={e.id} className="hi" onClick={()=>loadHist(e)} style={{borderLeftColor:histActive?.id===e.id?mColor:"transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}><span style={{fontSize:11,color:mColor}}>{mIcon}</span><span style={{fontSize:12,color:"#a8c0d8"}}>{e.brand}</span></div>
                  <div style={{fontSize:10,color:"#4a6a88",letterSpacing:1,textTransform:"uppercase",marginBottom:1}}>{label}</div>
                  <div style={{fontSize:10,color:"#2d4464"}}>{e.ts}</div>
                </div>);
              })
            }
          </div>
          <div style={{padding:"12px",borderTop:"1px solid #1e2d42",fontSize:10,letterSpacing:1,lineHeight:2.4,textTransform:"uppercase"}}>
            <div style={{color:"#f0b429",marginBottom:4,fontSize:11}}>GENTAGAI v{VERSION}</div>
            <div style={{color:"#2e4a64"}}>{DOMAIN}</div>
            <div style={{color:"#00e5ff44"}}>◈ Copy Engine</div>
            <div style={{color:"#ff7c0044"}}>⬡ Image Prompts</div>
            <div style={{color:"#f0b42944"}}>▷ Video Ads</div>
            <div style={{color:"#7c83fd44"}}>⇄ A/B Testing</div>
          </div>
        </div>
      </div>
    </div>
  );
}
