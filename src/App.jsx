/* eslint-disable */
import { useState, useRef, useEffect, Component } from "react";
import { createClient } from "@supabase/supabase-js";
import { Canvas, useFrame } from "@react-three/fiber";

// ─────────────────────────────────────────────
// Supabase — real accounts, replaces localStorage-only plan state
// ─────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────
// Storage — persists uploaded reference images/video to Supabase
// so they survive beyond this browser session instead of living
// only as local base64/blob data.
// ─────────────────────────────────────────────
const UPLOAD_BUCKET = "gentagai-uploads";

async function uploadFileToStorage(file, folder) {
  try {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.error("Storage upload failed:", error.message);
      return null;
    }
    const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (err) {
    console.error("Storage upload error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// CONFIG — paste your Stripe Payment Links here
// ─────────────────────────────────────────────
const STRIPE_LINKS = {
  pro_monthly:    "https://buy.stripe.com/7sYaEY3Pu4Qr0th3P1bjW00",
  pro_yearly:     "https://buy.stripe.com/fZuaEYgCg0Aba3R5X9bjW01",
  agency_monthly: "https://buy.stripe.com/fZu8wQbhWaaLb7V2KXbjW02",
  agency_yearly:  "https://buy.stripe.com/00w6oIadSbeP1xlfxJbjW03",
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
    color:"#82858C", badge:"FREE",
    gens: 5,
    features:["5 generations / month","Copy Engine only","Instagram & TikTok","3 tones","Basic hooks & captions","Community support"],
    locked:["Image Prompt Engine","Video Ads Engine","A/B Testing + AI Scoring","All 8 platforms","Email campaigns","SEO & product launch","Session history","Priority support"],
  },
  pro: {
    id:"pro", name:"Pro", price:29, priceYear:16.58, priceYearTotal:199,
    color:"#f0b429", badge:"PRO",
    gens: 200,
    features:["200 generations / month","All 4 engine modes","All 8 platforms","All 6 tones","Full content library","Image prompts (4 AI tools)","Video Ads (6 formats + tools)","A/B Testing + AI scoring","Session auto-save (50 sessions)","Email support"],
    locked:["Unlimited generations","White-label exports","Team seats","API access","Dedicated manager"],
  },
  agency: {
    id:"agency", name:"Agency", price:49, priceYear:34.92, priceYearTotal:419,
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
  {id:"sora",label:"Sora 2",color:"#00ff88"},
  {id:"kling",label:"Kling AI",color:"#f0b429"},
  {id:"higgsfield",label:"Higgsfield",color:"#ff4500"},
  {id:"google_flow",label:"Google Flow",color:"#4285f4"},
  {id:"heygen",label:"HeyGen",color:"#7c83fd"},
  {id:"capcut",label:"CapCut AI",color:"#a855f7"},
];

// ─────────────────────────────────────────────
// WORKSPACES — Redesign 2.0: two-level nav. A slim icon rail shows the 8
// workspaces; clicking one opens a secondary panel with just that
// workspace's pages, instead of one long flat list always on screen.
// "built:true" pages map to real, working state/handlers. "built:false"
// pages are genuinely not implemented yet and render disabled — never
// faked. "action" pages open an existing panel instead of switching mode.
// ─────────────────────────────────────────────
const WORKSPACES = [
  {id:"bishop",icon:"◈",label:"BISHOP",pages:[
    {id:"command-center",label:"Command Center",mode:"copy",built:true},
    {id:"next-moves",label:"Next Moves",built:false},
  ]},
  {id:"brand",icon:"◆",label:"Brand",pages:[
    {id:"brand-hq",label:"Brand HQ",mode:"brand-hq",built:true},
    {id:"brand-brief",label:"Brand Brief",mode:"brand-brief",built:true},
    {id:"brand-memory",label:"BISHOP Memory",mode:"brand-memory",built:true},
    {id:"brand-vault",label:"Brand Vault",mode:"brand-vault",built:true},
    {id:"learn-brand",label:"Learn My Brand",mode:"learn-brand",built:true},
  ]},
  {id:"products",icon:"▣",label:"Products",pages:[
    {id:"product-library",label:"Product Showroom",mode:"products",built:true},
  ]},
  {id:"create",icon:"▶",label:"Create",pages:[
    {id:"copy",label:"Copy",mode:"copy",built:true},
    {id:"image",label:"Images",mode:"image",built:true},
    {id:"video",label:"Video",mode:"video",built:true},
    {id:"ab",label:"A/B Lab",mode:"ab",built:true},
  ]},
  {id:"campaigns",icon:"⬡",label:"Campaigns",pages:[
    {id:"campaign-builder",label:"Campaign Builder",mode:"campaign",built:true},
    {id:"campaigns",label:"Campaigns",mode:"campaign",built:true},
    {id:"calendar",label:"Calendar",built:false},
    {id:"approvals",label:"Approvals",built:false},
  ]},
  {id:"intelligence",icon:"◉",label:"Intelligence",pages:[
    {id:"ai-viz",label:"AI Viz",mode:"visibility",built:true},
    {id:"performance",label:"Performance",mode:"campaign",built:true},
    {id:"bishop-insights",label:"BISHOP Insights",built:false},
  ]},
  {id:"bridge",icon:"⌁",label:"Bridge",pages:[
    {id:"connections",label:"Connections",built:true,action:"account"},
    {id:"publishing",label:"Publishing",built:false,note:"Opens after generating content"},
    {id:"automation",label:"Automation",built:false},
  ]},
  {id:"account",icon:"⚙",label:"Account",pages:[
    {id:"agency",label:"Agency",built:true,action:"account"},
    {id:"billing",label:"Billing",built:true,action:"account"},
    {id:"team",label:"Team",built:false},
    {id:"settings",label:"Settings",built:false},
  ]},
];

// ─────────────────────────────────────────────
// TOP_NAV — the 6 primary dock tabs (Brand Universe redesign). Each maps
// to a real mode; "subpages" render as a slim strip under the dock only
// when that space is active, so sub-navigation never crowds the main bar.
// ─────────────────────────────────────────────
const TOP_NAV = [
  {id:"home",label:"Home",mode:"home"},
  {id:"brand",label:"Brand",mode:"brand-hq"},
  {id:"products",label:"Products",mode:"products"},
  {id:"create",label:"Create",mode:"copy",subpages:[
    {id:"copy",label:"Copy",mode:"copy"},
    {id:"image",label:"Images",mode:"image"},
    {id:"video",label:"Video",mode:"video"},
    {id:"ab",label:"A/B Lab",mode:"ab"},
  ]},
  {id:"campaigns",label:"Campaigns",mode:"campaign"},
  {id:"intelligence",label:"Intelligence",mode:"visibility",subpages:[
    {id:"ai-viz",label:"AI Viz",mode:"visibility"},
    {id:"performance",label:"Performance",mode:"campaign"},
  ]},
];

// ─────────────────────────────────────────────
// AI BRAIN OPTIONS — for analysis & prompts
// ─────────────────────────────────────────────
const AI_BRAINS = [
  {
    id:"claude",label:"Claude",sub:"Anthropic",color:"#f0b429",icon:"◈",
    desc:"Built-in · No key needed",
    model:"claude-sonnet-4-6",free:true,
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
  "Photographer","Writing / Books / Scripts",
];
const PRODUCT_TYPES = [
  "T-Shirt","Hoodie","Sneakers","Pants","Jacket","Accessory","Course","Software",
  "Service","App","Food / Drink","Skincare","Supplement","Digital Download",
  "Event / Drop","NFT / Collection",
];

// ─────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────
const toneDesc={hype:"high-energy, hype culture, explosive",luxury:"sophisticated, exclusive, premium luxury",raw:"authentic, raw, unfiltered, relatable",professional:"polished, authoritative, expert-level",playful:"witty, fun, personality-driven",urgency:"urgent, scarcity-driven, FOMO-inducing"};
// Combines up to 2 selected tones into one blended description for prompts.
// Accepts either the new array format or an old single-string value from
// history entries saved before multi-select existed.
function toneLabel(t){
  const arr=Array.isArray(t)?t:[t];
  const parts=arr.filter(Boolean).map(x=>toneDesc[x]).filter(Boolean);
  return parts.length?parts.join(" + "):"hype";
}
const pCtx={instagram:"Instagram (saves, shares, carousel, hashtags)",tiktok:"TikTok (watch time, comments, trending audio)",twitter:"X/Twitter (retweets, replies, threads)",facebook:"Facebook (shares, comments, virality)",linkedin:"LinkedIn (professional engagement)",email:"Email (open rate, conversions)",youtube:"YouTube (watch time, SEO titles)",pinterest:"Pinterest (saves, SEO descriptions)"};
const pRatio={instagram:"4:5 or 1:1",tiktok:"9:16 vertical",twitter:"16:9",facebook:"1.91:1",linkedin:"1.91:1",email:"600px banner",youtube:"16:9",pinterest:"2:3 portrait"};

function getTask(ct,p,kw){
  const pc=pCtx[p]||p;
  return({viral_hook:`Generate 5 VIRAL hooks for ${pc}. Each stops scroll in 2 seconds. Format: TYPE → Hook → Why it works.`,caption:`Full platform-native caption for ${pc}: opener, body, CTA, 25+ hashtags.`,email:`Email campaign:\n1. SUBJECT LINES (3 options)\n2. PREVIEW TEXT\n3. FULL BODY (hook, value, story, CTA)\n4. P.S. LINE`,ad_copy:`Ad copy for ${pc}:\n1. HEADLINES (3)\n2. BODY (50-word + 150-word)\n3. CTA BUTTONS (5)\n4. TARGETING\nFrameworks: AIDA, PAS, BAB.`,seo_blog:`SEO blog intro:\n1. SEO TITLE\n2. META DESCRIPTION\n3. H1\n4. INTRO (E-E-A-T)\n5. 10 LSI KEYWORDS\n6. H2 OUTLINE\nKeywords: ${kw||"from niche"}`,story:`60-90s video script for ${pc}:\n[0-3s] HOOK · [3-15s] SETUP · [15-45s] CONTENT · [45-60s] PAYOFF · [60-90s] CTA\nText overlays, B-roll, audio cues.`,product_launch:`Full launch suite:\n1. ANNOUNCEMENT\n2. COUNTDOWN (48h/24h/1h)\n3. LAUNCH DAY CAPTION\n4. EMAIL BLAST\n5. 5 VIRAL HOOKS\n6. SCARCITY COPY\n7. POST-LAUNCH\nEnergy: Supreme/Kith/FOG.`,cta:`10 platform-native CTAs for ${pc}. Each: TEXT + trigger + goal.`})[ct]||"Generate viral marketing content.";
}
function memoryBlock(memory){
  return memory&&memory.trim()?`\n\nBISHOP MEMORY — RULES YOU MUST FOLLOW FOR THIS BRAND:\n${memory}\nThese are standing decisions this brand has already made. Never contradict them.`:"";
}
const buildCopy=({brand,niche,platform,contentType,tone,audience,goal,keywords,productName,productDesc,productType,productPrice,memory})=>{
  const productBlock=productDesc?`\nPRODUCT INTEL:\n- Product: ${productName||"Unnamed product"}${productType?` (${productType})`:""}\n- Description: ${productDesc}${productPrice?`\n- Price / Value: ${productPrice}`:""}\nUse these product details to make the content hyper-specific, benefit-driven, and conversion-ready. Reference the product naturally — don't just list features, make people WANT it.`:"";
  return `You are GENTAGAI — elite AI marketing engine.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35 urban"} | GOAL: ${goal||"awareness+sales"} | TONE: ${toneLabel(tone)} | KEYWORDS: ${keywords||"from niche"}${productBlock}${memoryBlock(memory)}\nTASK: ${getTask(contentType,platform,keywords)}\nRULES: Zero filler. Creative director energy. Platform-native. Copy-paste ready.\nFORMAT: Clear headers with ── separators.`;
};
const buildImage=({brand,niche,imageType,platform,tone,audience,imageTool,productName,productDesc,productType,memory})=>{
  const productBlock=productDesc?`\nPRODUCT: ${productName||""}${productType?` (${productType})`:""} — ${productDesc.slice(0,150)}\nMake the product the visual hero. Every prompt should make this specific product irresistible.`:"";
  const s={img_product:"hero product shot",img_editorial:"high-fashion editorial scene",img_lifestyle:"aspirational lifestyle moment",img_ad:"scroll-stopping paid ad visual",img_story:"immersive story background",img_brand:"branded architectural scene"};
  const st={hype:"raw energy, motion blur, urban grit, high contrast",luxury:"soft diffused light, editorial elegance, minimal composition",raw:"handheld documentary, candid, natural light, 35mm grain",professional:"clean studio light, commercial polish",playful:"vibrant palette, dynamic angles, bold color",urgency:"dramatic chiaroscuro, high contrast, cinematic urgency"};
  const tn={midjourney:"End with: --ar [ratio] --style raw --v 6.1 --q 2  Use --no for negatives.",dalle:"Describe exact lighting, lens mm, color grade, mood.",firefly:"Label: [Subject] [Setting] [Lighting] [Style] [Color]",stable:"Positive then NEGATIVE PROMPT: section. Add: masterpiece, 8k, photorealistic"};
  return `You are GENTAGAI Visual — expert AI image prompt engineer.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | TOOL: ${imageTool} | STYLE: ${st[tone]||st.hype} | RATIO: ${pRatio[platform]||"1:1"}${productBlock}${memoryBlock(memory)}\nSUBJECT: ${s[imageType]}\nGenerate 4 DISTINCT prompts for ${imageTool}:\n── PROMPT [N]: [Title]\nFULL PROMPT: [technical, paste-ready]\nSTYLE MODIFIERS: [lighting/lens/mood/color]\nTOOL PARAMS: [${tn[imageTool]||tn.midjourney}]\nNEGATIVE PROMPT: [exclusions]\nDEPLOY AS: [post/ad/story]\nVisual DNA: Kith, Fear of God, Supreme, Off-White, Palace.`;
};
const buildVideo=({brand,niche,videoAdType,platform,tone,audience,goal,videoTool,productName,productDesc,productType,productPrice,memory})=>{
  const productBlock=productDesc?`\n\nPRODUCT INTEL:\n- Product: ${productName||""}${productType?` (${productType})`:""}\n- Description: ${productDesc}\n${productPrice?`- Price / Value: ${productPrice}\n`:""}\nEvery shot, every word of script, and every CTA must be built around THIS specific product. Make the viewer need it.`:"";
  const sp={tiktok_ad:{dur:"15-60s",ratio:"9:16",pace:"fast cuts every 2-3s"},youtube_pre:{dur:"6-30s",ratio:"16:9",pace:"brand in first 5s"},fb_video:{dur:"15-30s",ratio:"1:1 or 4:5",pace:"silent-ready, text overlays essential"},story_ad:{dur:"5-15s",ratio:"9:16",pace:"single message, instant impact"},brand_film:{dur:"60-90s",ratio:"16:9",pace:"emotional arc, slow build"},product_demo:{dur:"15-45s",ratio:"1:1",pace:"feature-first, benefit-driven"}};
  const spec=sp[videoAdType]||sp.tiktok_ad;
  const tg={runway:"[Scene] [Camera motion: dolly/handheld/aerial] [Lighting] [Style] [Duration]",pika:"[Scene as living photo] [Motion intensity: subtle/medium/intense] [What moves] [Cinematic style]",sora:"[Film director language: lens, DOF, color grade, time of day, subject blocking]",kling:"[Subject] [Environment] [Motion] [Mood] [Cinematic reference]",heygen:"[Presenter style] [Background] [Clothing] [Speech tone] [Lower-third text]",capcut:"[Mood] [Music energy] [Transition style] [Text overlay positions] [Color filter]"};
  return `You are GENTAGAI Video — elite AI video ad director.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | GOAL: ${goal||"conversions"} | TONE: ${toneLabel(tone)} | FORMAT: ${spec.dur} ${spec.ratio} | TOOL: ${videoTool} | PLATFORM: ${platform}${productBlock}${memoryBlock(memory)}\n\nCreate a COMPLETE video ad production package:\n\n── 1. CONCEPT & STRATEGY\nLogline, core emotion, psychological hook, why it works for ${platform}.\n\n── 2. FULL SCRIPT\nEvery word. [HOOK 0-3s] [PROBLEM/DESIRE] [SOLUTION] [PROOF] [CTA]. Pacing: ${spec.pace}\n\n── 3. SHOT-BY-SHOT STORYBOARD\nShot # | Duration | Scene | Camera | On-screen text | Audio (min 6 shots)\n\n── 4. AI VIDEO PROMPTS FOR ${videoTool.toUpperCase()}\n3 prompts for key scenes. Format: ${tg[videoTool]||tg.runway}\n\n── 5. ON-SCREEN TEXT OVERLAYS\nTiming, position, copy, style for each text element.\n\n── 6. AUDIO DIRECTION\nMusic genre/BPM, SFX, VO tone, silence moments.\n\n── 7. CTA PACKAGE\nEnd card, CTA button (3 options), URL/handle, final frame.\n\n── 8. PERFORMANCE FORECAST\nExpected watch rate, engagement triggers, algorithm signals.\n\nMake it feel like a $50,000 production brief.`;
};
const buildAB=({brand,niche,platform,contentType,tone,audience,goal,keywords,abVariable,variant,productName,productDesc,productType,productPrice,memory})=>{
  const productBlock=productDesc?`\nPRODUCT: ${productName||""}${productType?` (${productType})`:""} — ${productDesc.slice(0,120)}${productPrice?` · ${productPrice}`:""}\nBuild the content specifically around this product.`:"";
  const v={tone:{A:"LUXURY / ASPIRATIONAL — sophisticated, exclusive, premium.",B:"RAW / STREET AUTHENTIC — gritty, unfiltered, from the culture."},hook_angle:{A:"CURIOSITY GAP — tease without revealing. Mystery and intrigue.",B:"BOLD CLAIM — polarizing, share-worthy, makes people react."},length:{A:"SHORT & PUNCHY — under 80 words. Every word load-bearing.",B:"LONG-FORM STORY — 200+ words. Emotional journey."},cta_style:{A:"SOFT SELL — community-first, value-forward, invite don't demand.",B:"DIRECT / URGENT — scarcity, exclusivity, not clicking = loss."},audience:{A:"EXISTING FANS — insiders, brand language, loyalty rewards.",B:"COLD AUDIENCE — first impression, instant credibility."}};
  return `You are GENTAGAI — elite AI marketing engine.\nBRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | GOAL: ${goal||"awareness+sales"} | TONE: ${toneLabel(tone)}${productBlock}${memoryBlock(memory)}\nVARIANT ${variant}: ${v[abVariable]?.[variant]||v.tone[variant]}\nTASK: ${getTask(contentType,platform,keywords)}\nRULES: No filler. Platform-native for ${pCtx[platform]||platform}. Copy-paste ready.\nFORMAT: Start with "── VARIANT ${variant}" header. Use ── separators.`;
};
const buildScoring=(vA,vB,ct,p)=>`Senior marketing strategist. Score two variants for ${p}.\nVARIANT A: ${vA.slice(0,700)}\nVARIANT B: ${vB.slice(0,700)}\nScore 0-100: emotional impact, scroll-stop, clarity, CTA strength, algorithm potential.\nRESPOND ONLY IN JSON (no markdown):\n{"variantA":{"emotional":0,"scrollStop":0,"clarity":0,"cta":0,"algorithm":0,"totalScore":0,"verdict":"one sentence"},"variantB":{"emotional":0,"scrollStop":0,"clarity":0,"cta":0,"algorithm":0,"totalScore":0,"verdict":"one sentence"},"winner":"A","winnerReason":"two sentences"}`;

// ── AMPLIFY PROMPT BUILDER ─────────────────────
// Used when customer uploads an already-made image or video
// AI Brain generates marketing content FROM the uploaded asset
const VIDEO_FRAME_COUNT=3;

// Shrinks an image to a reasonable size before it's sent for vision analysis.
// Claude only needs ~1568px on the long edge to see full detail anyway, so
// sending a full 12MP phone photo just risks hitting the server's request
// size limit (413) for zero real quality benefit. The full-resolution
// original still goes to permanent storage separately — this only affects
// what gets analyzed.
function resizeImageForVision(file,maxDim=1568,quality=0.85){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const objUrl=URL.createObjectURL(file);
    img.onload=()=>{
      let{width,height}=img;
      if(width>maxDim||height>maxDim){
        if(width>height){height=Math.round(height*(maxDim/width));width=maxDim;}
        else{width=Math.round(width*(maxDim/height));height=maxDim;}
      }
      const canvas=document.createElement("canvas");
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,width,height);
      URL.revokeObjectURL(objUrl);
      resolve(canvas.toDataURL("image/jpeg",quality).split(",")[1]);
    };
    img.onerror=()=>{URL.revokeObjectURL(objUrl);reject(new Error("Couldn't process this image"));};
    img.src=objUrl;
  });
}

// Actually samples real frames from the uploaded video file via a hidden
// <video> + <canvas>, so vision-capable calls can genuinely see the
// content instead of the model being asked to fake an analysis.
function extractVideoFrames(file){
  return new Promise((resolve)=>{
    try{
      const video=document.createElement("video");
      video.preload="metadata";
      video.muted=true;
      video.playsInline=true;
      const url=URL.createObjectURL(file);
      video.src=url;
      const frames=[];
      let timestamps=[];
      let idx=0;

      const cleanup=()=>{URL.revokeObjectURL(url);};
      const finish=()=>{cleanup();resolve(frames);};

      video.onloadedmetadata=()=>{
        const dur=video.duration||1;
        timestamps=[dur*0.15,dur*0.5,dur*0.85].filter(t=>isFinite(t)&&t>=0);
        if(!timestamps.length){finish();return;}
        video.currentTime=timestamps[0];
      };
      video.onseeked=()=>{
        try{
          const canvas=document.createElement("canvas");
          canvas.width=video.videoWidth||640;
          canvas.height=video.videoHeight||360;
          const ctx=canvas.getContext("2d");
          ctx.drawImage(video,0,0,canvas.width,canvas.height);
          const dataUrl=canvas.toDataURL("image/jpeg",0.7);
          frames.push(dataUrl.split(",")[1]);
        }catch{}
        idx++;
        if(idx<timestamps.length){video.currentTime=timestamps[idx];}
        else{finish();}
      };
      video.onerror=()=>finish();
      setTimeout(()=>{if(frames.length<timestamps.length)finish();},8000);
    }catch{resolve([]);}
  });
}

function buildAmplifyPrompt({type,brand,niche,platform,tone,audience,goal,keywords,productName,productDesc,productType,productPrice,mediaType,mediaName,mediaSize,hasVideoFrames,memory}){
  const brandCtx=`BRAND: ${brand||"The Brand"} | NICHE: ${niche||"Fashion & Lifestyle"} | PLATFORM: ${platform} | TONE: ${toneLabel(tone)} | AUDIENCE: ${audience||"18-35 urban"}`+memoryBlock(memory);
  const productCtx=productDesc?`\nPRODUCT: ${productName||"Product"}${productType?` (${productType})`:""} — ${productDesc}${productPrice?` · ${productPrice}`:""}`:goal?`\nGOAL: ${goal}`:"";
  const mediaCtx=mediaType==="image"
    ?`\nUPLOADED IMAGE: "${mediaName||"image"}" — The customer's actual finished image. Study every detail: subject, colors, lighting, composition, mood, and energy before generating.`
    :hasVideoFrames
    ?`\nUPLOADED VIDEO: "${mediaName||"video"}" (${mediaSize||"?"}MB) — Attached below are ${VIDEO_FRAME_COUNT} still frames sampled evenly across this video's actual timeline. Study what's visible in them (subjects, setting, colors, mood, on-screen text) and base your response on what you can actually see. These are sampled frames, not full playback — don't describe motion or audio you can't observe.`
    :`\nUPLOADED VIDEO: "${mediaName||"video"}" (${mediaSize||"?"}MB) — No visual frames were available for this file, so write based on the brand, product, and platform context only. Do not invent or guess what's shown in the video.`;
  const seoKW=keywords?`\nSEO KEYWORDS: ${keywords}`:"";

  const visualDirective=`GROUND EVERYTHING IN WHAT YOU ACTUALLY SEE. You've been given the real ${mediaType==="video"?"sampled frames from the uploaded video":"uploaded image"} — reference specific, concrete details from it throughout: exact colors, textures, styling, setting, props, expressions, composition, lighting, mood. Never write generic placeholder language like "eye-catching," "vibrant," or "stunning visuals" without naming the actual thing that's eye-catching. If you can't see a detail clearly, don't invent it — work with what's genuinely visible. Every hook, caption, and line should feel like it could only have been written about THIS specific ${mediaType}, not any generic product shot.\n\n`;

  const tasks={
    viral_hooks:
visualDirective+
`Write exactly 5 VIRAL scroll-stopping hooks for this ${mediaType} on ${platform}.
Each one must stop the scroll in under 2 seconds and reference something specific and real from the visual — a color, a detail, a vibe only this ${mediaType} has. No generic hooks that could apply to any product.

── HOOK 1
[hook text — tie it to a specific visual detail]
TYPE: [Curiosity/Shock/FOMO/Social Proof/Controversy/Story]
WHY IT WORKS: [1-2 line psychology, referencing what's actually visible]

── HOOK 2
[hook text]
TYPE: [type]
WHY IT WORKS: [reason]

── HOOK 3
[hook text]
TYPE: [type]
WHY IT WORKS: [reason]

── HOOK 4 (pattern interrupt — unexpected angle)
[hook text]
TYPE: [type]
WHY IT WORKS: [reason]

── HOOK 5 (question-based — makes them stop to answer in their head)
[hook text]
TYPE: [type]
WHY IT WORKS: [reason]

── BEST FOR PAID ADS
[Which hook works best as a paid ad opener and exactly why, tied to what converts on ${platform}]

── DELIVERY NOTE
[One line on pacing/tone for saying this hook out loud on camera, or how it should appear as on-screen text]`,

    caption_pack:
visualDirective+
`Write exactly 3 copy-paste-ready captions for this ${mediaType} on ${platform}, each referencing real details from the visual.

── CAPTION 1: HYPE + ENGAGEMENT
[High-energy, 120-180 words, written to maximize comments and shares. Reference specific visual details. Include a genuine question or prompt that invites replies.]
HASHTAGS: [25 hashtags — mix of niche, trending, and branded, ranked by relevance]

── CAPTION 2: STORY-DRIVEN
[150-220 words. A short narrative angle — the making of it, the moment it captures, the "why" behind it. Should feel personal, not corporate.]
HASHTAGS: [15 hashtags]

── CAPTION 3: SHORT & PUNCHY
[Under 20 words. Maximum impact. Minimum words. Leaves them wanting more.]
HASHTAGS: [10 hashtags]

── BEST POSTING TIME for ${platform}
── FIRST COMMENT TIP (hashtag stacking strategy)
── CAPTION A/B NOTE
[Which of the 3 captions to test first and why, based on the visual's energy]`,

    seo_suite:
visualDirective+
`Create a deep SEO package for this ${mediaType} — everything needed to get it found and ranked, grounded in what's actually visible.

── OPTIMIZED FILE NAME
[SEO-friendly filename describing the real subject]

── ALT TEXT (under 125 chars)
[Accessibility + SEO alt text describing what's actually in the frame — write it out]

── META DESCRIPTION (155 chars)
[For website/blog use — write it out, specific to this visual]

── ${platform==="youtube"?"YOUTUBE: Video title (3 options, ranked) + 20 tags":"PLATFORM: 3 post title options ranked by reach potential + 10 hashtags ranked by reach"}

── TOP 12 SEO KEYWORDS
[Short-tail and long-tail mixed, ranked by opportunity — explain in 3-5 words why each one matters]

── SCHEMA-READY DESCRIPTION
[A 2-3 sentence product/content description structured for search engines and AI answer engines to quote directly]

── ON-PAGE PLACEMENT
[Where each keyword should actually go — title, first sentence, image alt, URL slug]`,

    ad_copy:
visualDirective+
`Write a complete, deep paid ad copy pack for this ${mediaType}.

── FACEBOOK / INSTAGRAM AD
Primary Headline (3 options):
Ad Body (150 words, referencing real visual details):
Description line:
CTA Button: [5 options]
Targeting suggestion: [specific interests/demographics based on the visual's style]

── TIKTOK SPARK AD
Hook overlay text:
Caption:
CTA overlay:
Hashtags:
Native-feel note: [how to make this not look like an ad]

── YOUTUBE AD (30 seconds)
[0-5s unskippable hook, tied to the visual]:
[Full script, scene-aware]:

── RETARGETING COPY
[Ad copy for a warm audience who already saw this ${mediaType} — different angle than the cold-audience version above]

── OBJECTION-HANDLING LINE
[One line of copy that pre-empts the #1 reason someone wouldn't buy]`,

    trending_strategy:
visualDirective+
`Create a complete, deep trending + viral content strategy for this ${mediaType}.

── TREND ALIGNMENT
Current trends on ${platform} this ${mediaType} genuinely fits (not generic — name real formats)
Audio/sound style recommendations for max algorithmic reach
Challenge or format to piggyback on

── ALGORITHM TRIGGERS
First 60 minutes action plan after posting:
- Step 1: [action]
- Step 2: [action]
- Step 3: [action]
- Step 4: [action]
Engagement triggers that boost reach (specific to what's in this visual)

── CONTENT SERIES
7 follow-up pieces that build on this exact ${mediaType} — name each one specifically
30-day content calendar structure (weeks 1-4 themes)

── CROSS-PLATFORM REPURPOSE
TikTok → [specific adaptation]
Instagram Reels → [specific adaptation]
YouTube Shorts → [specific adaptation]
Pinterest → [specific adaptation]
Twitter/X → [specific adaptation]
LinkedIn (if relevant to niche) → [specific adaptation]

── VIRAL ACCELERATION
3 collab/duet/stitch ideas, specific to this visual's angle
Influencer outreach template (short DM script)

── RISK CHECK
[One honest note on anything that might underperform or feel off-trend, and how to adjust]`,

    full_suite:
visualDirective+
`You are GENTAGAI — maximum power mode. Generate a clean, complete, DEEP marketing package. Be specific and copy-paste ready, grounded in the real visual. No fluff, no generic filler.

════════════════════════════
SECTION 1 — 5 VIRAL HOOKS
════════════════════════════
HOOK 1: [text] | TYPE: [type] | WHY: [reason tied to real visual detail]
HOOK 2: [text] | TYPE: [type] | WHY: [reason]
HOOK 3: [text] | TYPE: [type] | WHY: [reason]
HOOK 4: [text] | TYPE: [type] | WHY: [reason]
HOOK 5: [text] | TYPE: [type] | WHY: [reason]

════════════════════════════
SECTION 2 — 3 CAPTIONS
════════════════════════════
── HYPE CAPTION (120-160 words):
[Write it, referencing real visual details]
HASHTAGS: [25 tags]

── STORY CAPTION (150-200 words):
[Write it]
HASHTAGS: [15 tags]

── SHORT & PUNCHY (under 20 words):
[Write it]
HASHTAGS: [10 tags]

════════════════════════════
SECTION 3 — SEO
════════════════════════════
File name: [optimized]
Alt text: [under 125 chars, real description]
Meta description: [155 chars]
Top 12 keywords: [list, ranked]
Schema-ready description: [2-3 sentences for AI search engines]

════════════════════════════
SECTION 4 — AD COPY
════════════════════════════
Facebook/IG — Headline: [text] | Body (80 words): [write it] | CTA: [text]
TikTok — Hook overlay: [text] | Caption: [text]
Retargeting angle: [different from cold-audience copy above]

════════════════════════════
SECTION 5 — TRENDING STRATEGY
════════════════════════════
Trend alignment: [name it specifically]
Best time to post on ${platform}: [time]
First 60-min action plan: [4 steps]
3 follow-up content ideas that build on this exact ${mediaType}`,

    full_suite_part1:
visualDirective+
`You are GENTAGAI — Part 1 of 2. Generate hooks, captions, and SEO. Be specific and copy-paste ready, grounded in the real visual. No fluff.

════════════════════════════
SECTION 1 — 5 VIRAL HOOKS
════════════════════════════
HOOK 1: [text] | TYPE: [type] | WHY: [reason tied to real visual detail]
HOOK 2: [text] | TYPE: [type] | WHY: [reason]
HOOK 3: [text] | TYPE: [type] | WHY: [reason]
HOOK 4: [text] | TYPE: [type] | WHY: [reason]
HOOK 5: [text] | TYPE: [type] | WHY: [reason]

════════════════════════════
SECTION 2 — 3 CAPTIONS
════════════════════════════
── HYPE CAPTION (120-160 words):
[Write it, referencing real visual details]
HASHTAGS: [25 tags]

── STORY CAPTION (150-200 words):
[Write it]
HASHTAGS: [15 tags]

── SHORT & PUNCHY (under 20 words):
[Write it]
HASHTAGS: [10 tags]

════════════════════════════
SECTION 3 — SEO
════════════════════════════
File name: [optimized]
Alt text: [under 125 chars, real description]
Meta description: [155 chars]
Top 12 keywords: [list, ranked]
Schema-ready description: [2-3 sentences for AI search engines]`,

    full_suite_part2:
visualDirective+
`You are GENTAGAI — Part 2 of 2. Generate ad copy and trending strategy. Be specific and copy-paste ready, grounded in the real visual. No fluff.

════════════════════════════
SECTION 4 — AD COPY
════════════════════════════
Facebook/IG — Headline: [text] | Body (80 words): [write it] | CTA: [text]
TikTok — Hook overlay: [text] | Caption: [text]
Retargeting angle: [different from cold-audience copy above]

════════════════════════════
SECTION 5 — TRENDING STRATEGY
════════════════════════════
Trend alignment: [name it specifically]
Best time to post on ${platform}: [time]
First 60-min action plan: [4 steps]
3 follow-up content ideas that build on this exact ${mediaType}`,

    convert_score:
visualDirective+
`You are GENTAGAI — running CONVERT SCORE, a focused buying-psychology analysis of this ${mediaType}. This is not a content pack — it's a real verdict on whether this specific ${mediaType} makes someone buy or makes them scroll past. Be honest, specific, and grounded only in what you actually see.

── OVERALL CONVERT SCORE: [X/100]
[One line explaining the psychology behind why it matters, in plain human language.]

── DESIRE TRIGGER
[Does this create genuine want, or just notice? What specific emotional or status lever is it pulling — or failing to pull?]

── TRUST SIGNAL
[Does this read as legitimate, high-quality, worth the price — or does something make a buyer hesitate? Be specific about what's creating or costing trust.]

── URGENCY
[Does anything here create a reason to act now instead of "maybe later"? If not, what would?]

── THE FIX, WRITTEN OUT
[If there's copy, a caption, or a headline that should accompany this to close the gap identified above, write the actual line — not a placeholder, the real, ready-to-use line.]

Write the entire analysis as if you're speaking directly to the founder who built this brand — respectful of their work, but not soft. The kind of feedback that actually makes someone money.`,
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
// Simulates a live "typing" reveal for responses that arrive all at once
// (the default built-in Claude path isn't truly streamed server-side),
// so it feels like BISHOP is writing instead of a result just appearing.
function typewriterReveal(text,onChunk){
  return new Promise(resolve=>{
    if(!text||text.length<40){onChunk(text);resolve();return;}
    const totalTicks=180;
    const chunkSize=Math.max(2,Math.ceil(text.length/totalTicks));
    let i=0;
    function tick(){
      i+=chunkSize;
      onChunk(text.slice(0,i));
      if(i<text.length){
        setTimeout(tick,14);
      }else{
        onChunk(text);
        resolve();
      }
    }
    tick();
  });
}

async function streamAPI(prompt,onChunk){
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:4096,messages:[{role:"user",content:prompt}]})});
    if(!res.ok){
      const err=await res.text();
      let msg="⚠ Error "+res.status;
      try{const j=JSON.parse(err);msg="⚠ "+( j.error?.message||j.error||err.slice(0,200));}catch{}
      onChunk(msg);return msg;
    }
    const data=await res.json();
    const full=data.content?.map(b=>b.text||"").join("")||data.error?.message||"⚠ No response received";
    await typewriterReveal(full,onChunk);
    return full;
  }catch(e){const msg="⚠ Connection error: "+e.message;onChunk(msg);return msg;}
}
async function callAPI(prompt){
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:4096,messages:[{role:"user",content:prompt}]})});
    if(!res.ok){const err=await res.text();return "⚠ Error: "+err.slice(0,100);}
    const data=await res.json();
    return data.content?.map(b=>b.text||"").join("")||"";
  }catch(e){return "⚠ Error: "+e.message;}
}
// Same as callAPI but accepts a full Claude content array (text + images),
// non-streaming — used for one-shot structured analysis, not generation.
async function callAPIContent(content,maxTokens=2048){
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:maxTokens,messages:[{role:"user",content}]})});
    if(!res.ok){const err=await res.text();return "⚠ Error: "+err.slice(0,100);}
    const data=await res.json();
    return data.content?.map(b=>b.text||"").join("")||"";
  }catch(e){return "⚠ Error: "+e.message;}
}
// Real vision call — was previously parsed as SSE against an endpoint that
// actually returns one JSON blob, so it silently produced zero output.
// Now matches streamAPI's real response shape and surfaces real errors.
async function callClaudeVision(content,onChunk,maxTokens=4096){
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:maxTokens,messages:[{role:"user",content}]})});
    if(!res.ok){
      const err=await res.text();
      let msg="⚠ Error "+res.status;
      try{const j=JSON.parse(err);msg="⚠ "+(j.error?.message||j.error||err.slice(0,200));}catch{}
      onChunk(msg);return msg;
    }
    const data=await res.json();
    const full=data.content?.map(b=>b.text||"").join("")||data.error?.message||"⚠ No response received";
    await typewriterReveal(full,onChunk);
    return full;
  }catch(e){const msg="⚠ Connection error: "+e.message;onChunk(msg);return msg;}
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
function ScoreBar({label,value,color}){return(<div style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,letterSpacing:2,color:"#82858C",textTransform:"uppercase"}}>{label}</span><span style={{fontSize:12,color:color||"#f0b429",fontWeight:500}}>{value}</span></div><div style={{height:2,background:"#243650",borderRadius:1,overflow:"hidden"}}><div style={{height:"100%",background:color||"#f0b429",width:`${value}%`,transition:"width 1.2s ease"}}/></div></div>);}

// ─────────────────────────────────────────────
// BISHOP CORE — real WebGL 3D orb, Layer-1 "wow" element per the 3D
// Immersive brief. Used only on the Home hero (desktop) — kept out of
// every workflow page so it never costs performance where people are
// actually working. Genuinely rotating/lit geometry, not a CSS fake.
// Falls back to a CSS glow if WebGL is unavailable/blocked in the
// browser (common on locked-down corporate/managed browsers) instead
// of silently rendering nothing.
// ─────────────────────────────────────────────
function hasWebGL(){
  try{
    const c=document.createElement("canvas");
    return !!(window.WebGLRenderingContext&&(c.getContext("webgl")||c.getContext("experimental-webgl")));
  }catch(e){return false;}
}
class BishopOrbBoundary extends Component{
  constructor(p){super(p);this.state={failed:false};}
  static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(err){console.error("BISHOP orb render error:",err);}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function BishopCoreMesh(){
  const coreRef=useRef();
  const ringRef=useRef();
  const ring2Ref=useRef();
  useFrame((state,delta)=>{
    if(coreRef.current){coreRef.current.rotation.y+=delta*0.35;coreRef.current.rotation.x+=delta*0.12;}
    if(ringRef.current)ringRef.current.rotation.z+=delta*0.18;
    if(ring2Ref.current)ring2Ref.current.rotation.z-=delta*0.12;
  });
  return(
    <>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1,1]}/>
        <meshStandardMaterial color="#7C5CFF" emissive="#7C5CFF" emissiveIntensity={0.55} roughness={0.25} metalness={0.65}/>
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI/2.3,0,0]}>
        <torusGeometry args={[1.55,0.015,16,100]}/>
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.55}/>
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI/1.6,0.3,0]}>
        <torusGeometry args={[1.85,0.01,16,100]}/>
        <meshBasicMaterial color="#C13CFF" transparent opacity={0.35}/>
      </mesh>
    </>
  );
}
function BishopCoreOrbFallback({size}){
  // Pure-CSS glow, guaranteed to render regardless of WebGL support.
  return(
    <div style={{width:size,height:size,flexShrink:0,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,92,255,.35),transparent 70%)",filter:"blur(6px)",animation:"ambientBreathe 4s ease-in-out infinite"}}/>
      <div style={{width:size*0.5,height:size*0.5,borderRadius:"50%",background:"linear-gradient(145deg,#7C5CFF,#00E5FF)",boxShadow:"0 0 50px rgba(124,92,255,.6), inset 0 4px 12px rgba(255,255,255,.3)",animation:"bishopFloat 4s ease-in-out infinite"}}/>
    </div>
  );
}
function BishopCoreOrb({size=220}){
  const [webglOK]=useState(()=>hasWebGL());
  if(!webglOK)return<BishopCoreOrbFallback size={size}/>;
  return(
    <BishopOrbBoundary fallback={<BishopCoreOrbFallback size={size}/>}>
      <div style={{width:size,height:size,flexShrink:0}}>
        <Canvas camera={{position:[0,0,4],fov:45}} dpr={[1,2]} gl={{alpha:true,antialias:true}} style={{width:"100%",height:"100%",display:"block"}}>
          <ambientLight intensity={0.4}/>
          <pointLight position={[3,3,3]} intensity={1.3} color="#00E5FF"/>
          <pointLight position={[-3,-2,2]} intensity={0.9} color="#7C5CFF"/>
          <BishopCoreMesh/>
        </Canvas>
      </div>
    </BishopOrbBoundary>
  );
}

// ─────────────────────────────────────────────
// PRICING PAGE
// ─────────────────────────────────────────────
function PricingPage({onSelect,currentPlan,billing,setBilling}){
  const plans=["free","pro","agency"];
  const highlights={free:"Perfect to explore",pro:"Most popular — full power",agency:"For teams & client work"};
  const [agencyCode,setAgencyCode]=useState("");
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a1628 0%,#0d1e38 100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px 60px",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');html,body,#root{height:100%;margin:0;padding:0;}
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
        <div style={{fontSize:12,letterSpacing:5,color:"#6B6F7A",textTransform:"uppercase",marginBottom:20}}>gentagai.com — AI Marketing Engine</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:32,color:"#fff",lineHeight:1.2,maxWidth:480,margin:"0 auto"}}>
          The engine that makes every brand go viral.
        </div>
        <div style={{fontSize:15,color:"#82858C",marginTop:12,letterSpacing:.5}}>Copy · Images · Video Ads · A/B Testing · SEO — all in one engine.</div>
      </div>

      {/* Billing Toggle */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:36,background:"#15181D",border:"1px solid #2A2D33",borderRadius:99,padding:"6px 8px"}}>
        <button onClick={()=>setBilling("monthly")} style={{padding:"7px 20px",borderRadius:99,border:"none",background:billing==="monthly"?"#24272E":"transparent",color:billing==="monthly"?"#fff":"#82858C",fontSize:14,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>Monthly</button>
        <button onClick={()=>setBilling("yearly")} style={{padding:"7px 20px",borderRadius:99,border:"none",background:billing==="yearly"?"#24272E":"transparent",color:billing==="yearly"?"#fff":"#82858C",fontSize:14,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>
          Yearly <span style={{fontSize:12,color:"#00ff88",marginLeft:4}}>SAVE UP TO 43%</span>
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
            <div key={pid} style={{background:isFeatured?"#172236":"#08090B",border:`1px solid ${isFeatured?plan.color+"55":"#24272E"}`,borderRadius:12,padding:"28px 24px",position:"relative",display:"flex",flexDirection:"column"}}>
              {isFeatured&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#000",fontSize:12,letterSpacing:3,padding:"4px 16px",borderRadius:99,textTransform:"uppercase",fontWeight:500,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={{fontSize:11,letterSpacing:4,color:plan.color,textTransform:"uppercase",marginBottom:6}}>{plan.badge}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#fff"}}>{plan.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:32,color:"#fff"}}>{price===0?"Free":`$${price}`}</div>
                  {price>0&&<div style={{fontSize:12,color:"#6B6F7A"}}>/ mo{billing==="yearly"?" billed yearly":""}</div>}
                  {billing==="yearly"&&pid!=="free"&&plan.priceYearTotal&&(
                    <div style={{fontSize:11,color:"#00ff88",marginTop:2}}>${plan.priceYearTotal}/yr · save {Math.round((1-plan.priceYearTotal/(plan.price*12))*100)}%</div>
                  )}
                </div>
              </div>
              <div style={{fontSize:13,color:"#82858C",marginBottom:20,fontStyle:"italic"}}>{highlights[pid]}</div>
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
                    <div style={{width:14,height:14,borderRadius:"50%",border:"1px solid #565A64",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <div style={{fontSize:12,color:"#82858C",lineHeight:1}}>—</div>
                    </div>
                    <span style={{fontSize:14,color:"#82858C",lineHeight:1.5}}>{f}</span>
                  </div>
                ))}
              </div>
              {pid==="agency"&&(
                <div style={{marginBottom:8}}>
                  <input
                    placeholder="Have a staff code? Enter it here"
                    value={agencyCode}
                    onChange={e=>setAgencyCode(e.target.value)}
                    style={{width:"100%",padding:"14px 16px",background:"#0E1013",border:"1px solid #45484F",color:"#ddd",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",fontSize:14,letterSpacing:"0.06em",outline:"none",borderRadius:6,marginBottom:4}}
                  />
                  {agencyCode&&<div style={{fontSize:12,color:"#7c83fd",letterSpacing:1}}>↑ Enter code then click below</div>}
                </div>
              )}
              <button onClick={()=>onSelect(pid,billing,pid==="agency"?agencyCode:null)} style={{width:"100%",padding:"13px 0",border:`1px solid ${isFeatured||isCurrentPlan?plan.color:plan.color+"44"}`,background:isFeatured?plan.color:"transparent",color:isFeatured?"#000":plan.color,fontSize:14,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",fontWeight:500,transition:"all .2s",borderRadius:6}}>
                {isCurrentPlan?"Current Plan":pid==="free"?"Start Free":agencyCode&&pid==="agency"?"Activate Staff Code":`Subscribe — $${price}/mo`}
              </button>
              {pid!=="free"&&<div style={{fontSize:12,color:"#565A64",textAlign:"center",marginTop:8,letterSpacing:.5}}>Powered by Stripe · Cancel anytime</div>}
            </div>
          );
        })}
      </div>

      {/* Feature compare strip */}
      <div style={{width:"100%",maxWidth:860,background:"#08090B",border:"1px solid #24272E",borderRadius:10,padding:"20px 24px",marginBottom:32}}>
        <div style={{fontSize:11,letterSpacing:4,color:"#6B6F7A",textTransform:"uppercase",marginBottom:16}}>What's included in every plan</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
          {["Claude Sonnet AI","Algorithm optimization","Platform-native copy","Stripe secure billing","Auto-save sessions","Cancel anytime"].map(f=>(
            <div key={f} style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#f0b429",flexShrink:0}}/>
              <span style={{fontSize:13,color:"#82858C"}}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{fontSize:13,color:"#565A64",letterSpacing:1}}>© 2026 {DOMAIN} · All rights reserved</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// UPGRADE MODAL
// ─────────────────────────────────────────────
function UpgradeModal({onClose,onUpgrade,featureName}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#15181D",border:"1px solid #f0b42944",borderRadius:12,padding:"32px 28px",maxWidth:400,width:"100%",textAlign:"center",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}>
        <div style={{fontSize:11,letterSpacing:4,color:"#f0b429",textTransform:"uppercase",marginBottom:12}}>Pro Feature</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#fff",marginBottom:10}}>Unlock {featureName}</div>
        <div style={{fontSize:15,color:"#82858C",lineHeight:1.8,marginBottom:24}}>This feature requires a Pro or Agency plan. Upgrade to access the full GENTAGAI engine.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={onClose} style={{padding:"10px 20px",border:"1px solid #2A2D33",background:"transparent",color:"#82858C",fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",borderRadius:4}}>Not now</button>
          <button onClick={onUpgrade} style={{padding:"10px 24px",border:"none",background:"linear-gradient(135deg,#f0b429,#ff8c00)",color:"#000",fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",fontWeight:500,borderRadius:4}}>Upgrade Now</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ACCOUNT PANEL
// ─────────────────────────────────────────────
function AccountPanel({plan,billing,gensUsed,gensLimit,onManage,onLogout,onClose,
  session,authEmail,setAuthEmail,sendMagicLink,magicLinkSent,authLoading,postizStatus}){
  const p=PLANS[plan]||PLANS.free;
  const pct=gensLimit===Infinity?0:Math.min(100,Math.round((gensUsed/gensLimit)*100));
  const [agreedToTerms,setAgreedToTerms]=useState(false);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#15181D",border:"1px solid #2A2D33",borderLeft:"1px solid #2A2D33",width:300,height:"100vh",padding:"24px 20px",display:"flex",flexDirection:"column",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontSize:12,letterSpacing:4,color:"#82858C",textTransform:"uppercase"}}>Account</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6B6F7A",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
        </div>

        {/* SIGN IN — syncs real plan status from your Stripe subscription */}
        {!session&&(
          <div style={{background:"#1a1d24",border:"1px solid #24272E",borderRadius:8,padding:"14px",marginBottom:20}}>
            <div style={{fontSize:11,letterSpacing:2,color:"#82858C",textTransform:"uppercase",marginBottom:8}}>Sign in</div>
            {magicLinkSent?(
              <div style={{fontSize:13,color:"#00ff88",lineHeight:1.6}}>Check your email — click the link to sign in. Then come back and reopen this panel.</div>
            ):(
              <>
                <div style={{fontSize:12,color:"#82858C",lineHeight:1.5,marginBottom:10}}>Sign in with the email you used at checkout to sync your real plan and connect social accounts.</div>
                <input className="inp" placeholder="you@email.com" value={authEmail}
                  onChange={e=>setAuthEmail(e.target.value)}
                  style={{fontSize:13,padding:"10px 12px",marginBottom:10}}/>
                <label style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:12,cursor:"pointer"}}>
                  <input type="checkbox" checked={agreedToTerms} onChange={e=>setAgreedToTerms(e.target.checked)}
                    style={{marginTop:2,flexShrink:0,accentColor:"#00e5ff"}}/>
                  <span style={{fontSize:11.5,color:"#82858C",lineHeight:1.5}}>
                    I agree to GENTAGAI's{" "}
                    <a href="/terms.html" target="_blank" rel="noopener" style={{color:"#00e5ff"}}>Terms of Service</a>
                    {" "}and{" "}
                    <a href="/privacy.html" target="_blank" rel="noopener" style={{color:"#00e5ff"}}>Privacy Policy</a>.
                  </span>
                </label>
                <button onClick={sendMagicLink} disabled={!authEmail||!agreedToTerms||authLoading}
                  style={{width:"100%",padding:"9px",border:"1px solid #00e5ff55",background:"transparent",color:"#00e5ff",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:authEmail&&agreedToTerms?"pointer":"not-allowed",fontFamily:"inherit",opacity:authLoading||!agreedToTerms?.5:1}}>
                  {authLoading?"Sending…":"Send Sign-In Link"}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{background:"#1a1d24",border:`1px solid ${p.color}33`,borderRadius:8,padding:"16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,letterSpacing:3,color:p.color,textTransform:"uppercase"}}>{p.badge} Plan</span>
            <span style={{fontSize:12,color:"#6B6F7A"}}>{billing}</span>
          </div>
          <div style={{fontSize:18,color:"#fff",fontWeight:500,marginBottom:12}}>{p.name}</div>
          <div style={{fontSize:12,color:"#82858C",marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Generations this month</div>
          <div style={{height:3,background:"#24272E",borderRadius:2,marginBottom:5,overflow:"hidden"}}>
            <div style={{height:"100%",background:pct>80?"#ff2d2d":p.color,width:`${pct}%`,transition:"width .8s ease"}}/>
          </div>
          <div style={{fontSize:12,color:"#82858C"}}>{gensUsed} / {gensLimit===Infinity?"∞":gensLimit} used</div>
        </div>

        {/* POSTIZ CONNECTION — only relevant once signed in on a paid plan */}
        {session&&plan!=="free"&&(
          <div style={{background:"#1a1d24",border:"1px solid #24272E",borderRadius:8,padding:"14px",marginBottom:20}}>
            <div style={{fontSize:11,letterSpacing:2,color:"#82858C",textTransform:"uppercase",marginBottom:8}}>Social Auto-Publish</div>
            {postizStatus?.connected&&(
              <div style={{fontSize:13,color:"#00ff88",marginBottom:postizStatus.integrations?.length?0:10}}>✓ Postiz connected — {postizStatus.integrations?.length||0} account(s) linked</div>
            )}
            {(!postizStatus?.integrations||postizStatus.integrations.length===0)&&(
              <>
                <div style={{fontSize:12,color:"#82858C",lineHeight:1.5,marginBottom:10}}>{postizStatus?.connected?"No social accounts linked yet — connect one to auto-publish.":"Connect your Postiz account to auto-publish generated content instead of copy-pasting."}</div>
                <a href={`/api/postiz-connect?userId=${session.user.id}`}
                  style={{display:"block",textAlign:"center",padding:"9px",border:"1px solid #00ff8855",background:"transparent",color:"#00ff88",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",textDecoration:"none"}}>
                  Connect via Postiz
                </a>
              </>
            )}
            {postizStatus?.connected&&postizStatus.integrations?.length>0&&(
              <a href={`/api/postiz-connect?userId=${session.user.id}`}
                style={{display:"block",textAlign:"center",padding:"7px",border:"1px solid #24272E",background:"transparent",color:"#6B6F7A",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",textDecoration:"none",marginTop:8}}>
                + Connect another account
              </a>
            )}
          </div>
        )}

        <div style={{fontSize:11,letterSpacing:3,color:"#565A64",textTransform:"uppercase",marginBottom:10}}>Plan Features</div>
        {p.features.slice(0,5).map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:p.color,flexShrink:0}}/>
            <span style={{fontSize:13,color:"#9BA0AC"}}>{f}</span>
          </div>
        ))}

        <div style={{flex:1}}/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:20}}>
          {plan!=="free"&&<button onClick={onManage} style={{padding:"10px",border:"1px solid #2A2D33",background:"transparent",color:"#9BA0AC",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"}}>Manage Billing ↗</button>}
          {plan==="free"&&<button onClick={onManage} style={{padding:"10px",border:`1px solid ${PLANS.pro.color}55`,background:"transparent",color:PLANS.pro.color,fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"}}>Upgrade Plan</button>}
          {session&&<button onClick={onLogout} style={{padding:"10px",border:"1px solid #24272E",background:"transparent",color:"#6B6F7A",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>}
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
  const [mode,setMode]=useState("home");
  const [abTab,setAbTab]=useState("variants");
  const [platform,setPlatform]=useState("instagram");
  const [contentType,setContentType]=useState("viral_hook");
  const [imageType,setImageType]=useState("img_product");
  const [imageTool,setImageTool]=useState("");
  const [videoAdType,setVideoAdType]=useState("");
  const [videoTool,setVideoTool]=useState("");
  const [tone,setTone]=useState(["hype"]);
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

  // ── Account (Supabase) — real plan status, sourced from Stripe via webhook ──
  const [session,setSession]=useState(null);
  const [authEmail,setAuthEmail]=useState("");
  const [magicLinkSent,setMagicLinkSent]=useState(false);
  const [authLoading,setAuthLoading]=useState(false);
  const [postizStatus,setPostizStatus]=useState({connected:false,integrations:[]});
  const [postizPublishing,setPostizPublishing]=useState({});
  const [nicheOpen,setNicheOpen]=useState(false);
  const [productTypeOpen,setProductTypeOpen]=useState(false);
  const [platformOpen,setPlatformOpen]=useState(false);
  const [contentTypeOpen,setContentTypeOpen]=useState(false);
  const [imageTypeOpen,setImageTypeOpen]=useState(false);
  const [videoTypeOpen,setVideoTypeOpen]=useState(false);
  const [vizUrl,setVizUrl]=useState("");
  const [vizScanning,setVizScanning]=useState(false);
  const [vizResult,setVizResult]=useState(null);
  const [vizError,setVizError]=useState("");
  const [vizFixOutput,setVizFixOutput]=useState("");
  const [vizFixing,setVizFixing]=useState(false);
  const [vizBrandSuggestion,setVizBrandSuggestion]=useState(null);
  const [vizAnalyzingBrand,setVizAnalyzingBrand]=useState(false);
  const [vizBrandError,setVizBrandError]=useState("");
  const [learnOpen,setLearnOpen]=useState(false);
  const [learnMode,setLearnMode]=useState("text"); // text | photo | instagram
  const [learnText,setLearnText]=useState("");
  const [learnImage,setLearnImage]=useState(null);
  const [learnAnalyzing,setLearnAnalyzing]=useState(false);
  const [learnError,setLearnError]=useState("");
  const [learnSuggestion,setLearnSuggestion]=useState(null);
  const brandInputRef=useRef(null);
  const [brandProfiles,setBrandProfiles]=useState([]);
  const [activeProfileId,setActiveProfileId]=useState(null);
  const [profileSwitcherOpen,setProfileSwitcherOpen]=useState(false);
  const [savingProfile,setSavingProfile]=useState(false);
  const [profileError,setProfileError]=useState("");
  const [brandMemories,setBrandMemories]=useState([]);
  const [newMemoryText,setNewMemoryText]=useState("");
  const [savingMemory,setSavingMemory]=useState(false);
  const [memoryError,setMemoryError]=useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session||null));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,newSession)=>{
      setSession(newSession);
    });
    return ()=>listener.subscription.unsubscribe();
  },[]);

  // Once signed in, the REAL account record (set by the Stripe webhook) takes
  // over from whatever local/optimistic plan state was showing before.
  useEffect(()=>{
    if(!session?.user)return;
    supabase.from("users").select("plan,billing_interval")
      .eq("id",session.user.id).single()
      .then(({data})=>{ if(data){setPlan(data.plan||"free");setBilling(data.billing_interval||"monthly");} })
      .catch(()=>{});
  },[session]);
  
  useEffect(() => {
  if (!session?.user) return;

  async function migratePendingPurchase() {
    const email = session.user.email;

    const { data: pending } = await supabase
      .from("pending_stripe_customers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!pending) return;

    const { error: updateError } = await supabase
      .from("users")
      .update({
        stripe_customer_id: pending.stripe_customer_id,
        stripe_subscription_id: pending.stripe_subscription_id,
        plan: pending.plan,
        billing_interval: pending.billing_interval,
      })
      .eq("id", session.user.id);

    if (updateError) {
      console.error("Failed to migrate pending purchase:", updateError);
      return;
    }

    setPlan(pending.plan || "free");
    setBilling(pending.billing_interval || "monthly");

    await supabase
      .from("pending_stripe_customers")
      .delete()
      .eq("email", email);
  }

  migratePendingPurchase();
}, [session]);

  function refetchPostizStatus(){
    if(!session?.user)return;
    fetch(`/api/postiz-integrations?userId=${session.user.id}`,{cache:"no-store"})
      .then(r=>r.json()).then(setPostizStatus).catch(()=>{});
  }

  useEffect(()=>{
    refetchPostizStatus();
  },[session]);

  useEffect(()=>{
    if(!session?.user)return;
    loadBrandProfiles();
  },[session]);

  async function loadBrandProfiles(){
    if(!session?.user)return;
    const {data,error}=await supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id",session.user.id)
      .order("updated_at",{ascending:false});
    if(!error&&data)setBrandProfiles(data);
  }

  // ── Save current Brand Brief fields as a new saved profile ──
  async function saveNewBrandProfile(){
    if(!session?.user){setProfileError("Sign in to save brand profiles.");return;}
    if(!brand.trim()){setProfileError("Add a Brand Name first.");return;}
    setSavingProfile(true);setProfileError("");
    const {data,error}=await supabase.from("brand_profiles").insert({
      user_id:session.user.id,brand_name:brand.trim(),niche,audience,
      tones:tone,keywords,goal,
    }).select().single();
    if(error){setProfileError("Couldn't save — try again.");}
    else{
      setBrandProfiles(p=>[data,...p]);
      setActiveProfileId(data.id);
    }
    setSavingProfile(false);
  }

  // ── Update the currently active saved profile with whatever's on screen now ──
  async function updateActiveBrandProfile(){
    if(!activeProfileId)return;
    setSavingProfile(true);setProfileError("");
    const {data,error}=await supabase.from("brand_profiles")
      .update({brand_name:brand.trim(),niche,audience,tones:tone,keywords,goal,updated_at:new Date().toISOString()})
      .eq("id",activeProfileId).select().single();
    if(error){setProfileError("Couldn't update — try again.");}
    else{setBrandProfiles(p=>p.map(x=>x.id===data.id?data:x));}
    setSavingProfile(false);
  }

  // ── Instantly reload every field from a saved brand ──
  function switchToBrandProfile(profile){
    setBrand(profile.brand_name||"");
    setNiche(profile.niche||"");
    setAudience(profile.audience||"");
    setTone(Array.isArray(profile.tones)&&profile.tones.length?profile.tones:["hype"]);
    setKeywords(profile.keywords||"");
    setGoal(profile.goal||"");
    setActiveProfileId(profile.id);
    setProfileSwitcherOpen(false);
    setBriefStep("done");
  }

  function startNewBrandProfile(){
    setBrand("");setNiche("");setAudience("");setTone(["hype"]);setKeywords("");setGoal("");
    setActiveProfileId(null);
    setProfileSwitcherOpen(false);
    setMode("brand-brief");
    setActiveWorkspace("brand");
    setBriefStep(1);
    if(isMobile)setMobileTab("config");
    setTimeout(()=>brandInputRef.current?.focus(),100);
  }

  async function deleteBrandProfile(id,e){
    e.stopPropagation();
    if(!window.confirm("Delete this saved brand? This can't be undone."))return;
    await supabase.from("brand_profiles").delete().eq("id",id);
    setBrandProfiles(p=>p.filter(x=>x.id!==id));
    if(activeProfileId===id)setActiveProfileId(null);
  }

  // ── BISHOP MEMORY — standing decisions tied to whichever brand is active ──
  useEffect(()=>{
    if(!activeProfileId||!session?.user){setBrandMemories([]);return;}
    supabase.from("brand_memories").select("*").eq("brand_profile_id",activeProfileId)
      .order("created_at",{ascending:false})
      .then(({data,error})=>{if(!error&&data)setBrandMemories(data);});
  },[activeProfileId,session]);

  async function addBrandMemory(){
    if(!newMemoryText.trim()||!activeProfileId||!session?.user)return;
    setSavingMemory(true);setMemoryError("");
    const{data,error}=await supabase.from("brand_memories").insert({
      user_id:session.user.id,brand_profile_id:activeProfileId,content:newMemoryText.trim(),active:true,
    }).select().single();
    if(error){setMemoryError("Couldn't save — try again.");}
    else{setBrandMemories(m=>[data,...m]);setNewMemoryText("");}
    setSavingMemory(false);
  }

  async function toggleBrandMemory(mem){
    const{data,error}=await supabase.from("brand_memories").update({active:!mem.active}).eq("id",mem.id).select().single();
    if(!error&&data)setBrandMemories(m=>m.map(x=>x.id===data.id?data:x));
  }

  async function deleteBrandMemory(id){
    await supabase.from("brand_memories").delete().eq("id",id);
    setBrandMemories(m=>m.filter(x=>x.id!==id));
  }

  const activeMemoryText=brandMemories.filter(m=>m.active).map(m=>"- "+m.content).join("\n");

  // ── BRAND VAULT ──
  const [vaultAssets,setVaultAssets]=useState([]);
  const [vaultOpen,setVaultOpen]=useState(false);
  const [vaultCategory,setVaultCategory]=useState("logo");
  const [vaultUploading,setVaultUploading]=useState(false);
  const [vaultPickerOpen,setVaultPickerOpen]=useState(false);
  const [vaultPickerLoading,setVaultPickerLoading]=useState(false);

  useEffect(()=>{
    if(!activeProfileId||!session?.user){setVaultAssets([]);return;}
    supabase.from("brand_vault_assets").select("*").eq("brand_profile_id",activeProfileId)
      .order("created_at",{ascending:false})
      .then(({data,error})=>{if(!error&&data)setVaultAssets(data);});
  },[activeProfileId,session]);

  const VAULT_CATEGORIES=[
    {id:"logo",label:"Logos"},{id:"product",label:"Product Images"},{id:"video",label:"Videos"},
    {id:"guideline",label:"Brand Guidelines"},{id:"other",label:"Other"},
  ];

  async function uploadToVault(file,category){
    if(!file||!activeProfileId||!session?.user)return;
    setVaultUploading(true);
    const url=await uploadFileToStorage(file,"vault");
    if(url){
      const{data,error}=await supabase.from("brand_vault_assets").insert({
        user_id:session.user.id,brand_profile_id:activeProfileId,category,
        name:file.name,url,file_type:file.type,size_kb:Math.round(file.size/1024),
      }).select().single();
      if(!error&&data)setVaultAssets(v=>[data,...v]);
    }
    setVaultUploading(false);
  }

  async function deleteVaultAsset(id){
    await supabase.from("brand_vault_assets").delete().eq("id",id);
    setVaultAssets(v=>v.filter(x=>x.id!==id));
  }

  // Pulls a saved Vault image back into the Images tab's upload flow —
  // same resize + base64 pipeline as a fresh upload, so everything
  // downstream (generation, vision) works identically either way.
  async function selectVaultAssetForUpload(asset){
    setVaultPickerLoading(true);
    try{
      const res=await fetch(asset.url);
      const blob=await res.blob();
      const file=new File([blob],asset.name,{type:asset.file_type||blob.type});
      handleImageFile(file);
      setVaultPickerOpen(false);
    }catch{
      alert("Couldn't load that asset — try uploading fresh instead.");
    }
    setVaultPickerLoading(false);
  }

  // ── PRODUCT SHOWROOM — real Supabase-backed product library, one per
  // brand profile. Requires the `products` table (SQL provided separately). ──
  const [products,setProducts]=useState([]);
  const [activeProductId,setActiveProductId]=useState(null);
  const [productChamberTab,setProductChamberTab]=useState("story");
  const [showNewProduct,setShowNewProduct]=useState(false);
  const [npName,setNpName]=useState("");
  const [npType,setNpType]=useState("");
  const [npPrice,setNpPrice]=useState("");
  const [npDesc,setNpDesc]=useState("");
  const [npImage,setNpImage]=useState(null); // {name,url(preview),file} or {name,url(real),fromVault:true}
  const [npImageUploading,setNpImageUploading]=useState(false);
  const [showVaultImagePicker,setShowVaultImagePicker]=useState(false);
  const [savingProduct,setSavingProduct]=useState(false);
  const [productError,setProductError]=useState("");
  const [chamberDraft,setChamberDraft]=useState({description:"",story:"",customer:"",positioning:""});
  const [savingChamber,setSavingChamber]=useState(false);
  const [chamberSaveError,setChamberSaveError]=useState("");
  const [chamberSaved,setChamberSaved]=useState(false);
  const activeProduct=products.find(p=>p.id===activeProductId)||null;

  useEffect(()=>{
    if(!activeProfileId||!session?.user){setProducts([]);return;}
    supabase.from("products").select("*").eq("brand_profile_id",activeProfileId)
      .order("created_at",{ascending:false})
      .then(({data,error})=>{if(!error&&data)setProducts(data);});
  },[activeProfileId,session]);

  function handleNpImageFile(file){
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=e=>setNpImage({name:file.name,url:e.target.result,file});
    reader.readAsDataURL(file);
  }

  async function createProduct(){
    if(!npName.trim()||!activeProfileId||!session?.user){setProductError("Add a product name first.");return;}
    setSavingProduct(true);setProductError("");
    let imageUrl=null;
    if(npImage?.fromVault){
      imageUrl=npImage.url;
    }else if(npImage?.file){
      setNpImageUploading(true);
      imageUrl=await uploadFileToStorage(npImage.file,"products");
      setNpImageUploading(false);
      if(!imageUrl){setProductError("Image upload failed — try again, or save without it.");setSavingProduct(false);return;}
    }
    const{data,error}=await supabase.from("products").insert({
      user_id:session.user.id,brand_profile_id:activeProfileId,
      name:npName.trim(),product_type:npType,price:npPrice,description:npDesc,image_url:imageUrl,
    }).select().single();
    if(error){setProductError("Couldn't save — try again.");}
    else{
      setProducts(p=>[data,...p]);
      setNpName("");setNpType("");setNpPrice("");setNpDesc("");setNpImage(null);
      setShowNewProduct(false);
    }
    setSavingProduct(false);
  }

  async function deleteProduct(id,e){
    e.stopPropagation();
    if(!window.confirm("Delete this product? This can't be undone."))return;
    await supabase.from("products").delete().eq("id",id);
    setProducts(p=>p.filter(x=>x.id!==id));
    if(activeProductId===id)setActiveProductId(null);
  }

  function openProduct(p){
    setActiveProductId(p.id);
    setProductChamberTab("story");
    setChamberDraft({description:p.description||"",story:p.story||"",customer:p.customer||"",positioning:p.positioning||""});
    setChamberSaveError("");
  }

  async function saveChamberField(field){
    if(!activeProduct)return;
    setSavingChamber(true);
    setChamberSaveError("");
    try{
      const{data,error}=await supabase.from("products").update({[field]:chamberDraft[field],updated_at:new Date().toISOString()}).eq("id",activeProduct.id).select().single();
      if(error){
        console.error("saveChamberField failed:",error);
        setChamberSaveError(error.message||"Save failed — please try again.");
      }else if(data){
        setProducts(ps=>ps.map(x=>x.id===data.id?data:x));
        setChamberSaved(true);
        setTimeout(()=>setChamberSaved(false),2000);
      }
    }catch(err){
      console.error("saveChamberField threw:",err);
      setChamberSaveError(err.message||"Save failed — please try again.");
    }
    setSavingChamber(false);
  }

  // ── ANALYZE WITH BISHOP — real AI analysis of a product, grounded in the
  // brand's actual context (Brand Brief + active Brand Memory) plus the
  // product's own name/type/price/description and, if present, its real
  // uploaded photo (studied via vision, not guessed). ──
  const [analyzingProduct,setAnalyzingProduct]=useState(false);
  const [productAnalysisError,setProductAnalysisError]=useState("");

  async function urlToBase64(url){
    try{
      const res=await fetch(url);
      if(!res.ok){
        console.error("urlToBase64: image fetch failed",res.status,url);
        return null;
      }
      const blob=await res.blob();
      if(!blob||blob.size===0||!blob.type.startsWith("image/")){
        console.error("urlToBase64: response wasn't a valid image",blob?.type,blob?.size);
        return null;
      }
      const base64=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result.split(",")[1]);
        reader.onerror=reject;
        reader.readAsDataURL(blob);
      });
      return {data:base64,mediaType:blob.type};
    }catch(e){
      console.error("urlToBase64 threw:",e);
      return null;
    }
  }

  async function analyzeProductWithBishop(){
    if(!activeProduct)return;
    setAnalyzingProduct(true);setProductAnalysisError("");
    try{
      const prompt=`You are BISHOP, ${brand||"this brand"}'s AI marketing strategist, analyzing one specific product to build real intelligence around it.
BRAND: ${brand||"The Brand"} | NICHE: ${niche||"unspecified"} | AUDIENCE: ${audience||"18-35"} | TONE: ${toneLabel(tone)}${memoryBlock(activeMemoryText)}

PRODUCT: ${activeProduct.name}${activeProduct.product_type?` (${activeProduct.product_type})`:""}${activeProduct.price?` — ${activeProduct.price}`:""}
DESCRIPTION: ${activeProduct.description||"Not provided — infer as much as you responsibly can from the name, type, and image, and keep anything uncertain general rather than invented."}
${activeProduct.image_url?"\nStudy the attached product photo carefully — visual design, color, style, materials, quality cues, and how it fits the brand's world — before writing.":""}

Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{"story":"2-3 plain-English sentences on what this product is, why it exists, and what makes it worth buying","customer":"2-3 sentences on who this is genuinely for, grounded in the brand's real audience — not a generic demographic","positioning":"2-3 sentences on how this product should be seen next to everything else the customer could buy instead"}`;
      let raw="";
      if(activeProduct.image_url){
        const img=await urlToBase64(activeProduct.image_url);
        raw=img
          ?await callAPIContent([{type:"image",source:{type:"base64",media_type:img.mediaType,data:img.data}},{type:"text",text:prompt}],1200)
          :await callAPI(prompt);
      }else{
        raw=await callAPI(prompt);
      }
      if(raw.startsWith("⚠")){throw new Error("API error: "+raw);}
      // Extract just the {...} block — the model sometimes adds a stray
      // sentence around the JSON despite instructions, which broke a plain
      // JSON.parse before even though the actual content was fine.
      const start=raw.indexOf("{");
      const end=raw.lastIndexOf("}");
      if(start===-1||end===-1||end<start){throw new Error("No JSON object found in response: "+raw.slice(0,200));}
      const parsed=JSON.parse(raw.slice(start,end+1));
      const{data,error}=await supabase.from("products").update({
        story:parsed.story||"",customer:parsed.customer||"",positioning:parsed.positioning||"",
        updated_at:new Date().toISOString(),
      }).eq("id",activeProduct.id).select().single();
      if(!error&&data){
        setProducts(ps=>ps.map(x=>x.id===data.id?data:x));
        setChamberDraft(d=>({...d,story:data.story||"",customer:data.customer||"",positioning:data.positioning||""}));
      }else{
        console.error("Product analysis save failed:",error);
        setProductAnalysisError("BISHOP wrote it, but saving failed — try again.");
      }
    }catch(e){
      console.error("BISHOP product analysis error:",e);
      setProductAnalysisError("BISHOP couldn't analyze this product — try again.");
    }
    setAnalyzingProduct(false);
  }

  // ── CAMPAIGN BUILDER ──
  const CAMPAIGN_THEMES=["Teaser","Story","Product Reveal","Social Proof","Lifestyle","FOMO","Last Call"];
  const CAMPAIGN_PLATFORMS=[{id:"instagram",label:"Instagram"},{id:"tiktok",label:"TikTok"},{id:"facebook",label:"Facebook"},{id:"email",label:"Email"}];
  const [campaignsList,setCampaignsList]=useState([]);
  const [activeCampaign,setActiveCampaign]=useState(null);
  const [campaignPieces,setCampaignPieces]=useState([]);
  const [cName,setCName]=useState("");
  const [cGoal,setCGoal]=useState("");
  const [cLength,setCLength]=useState(7);
  const [cPlatforms,setCPlatforms]=useState(["instagram"]);
  const [campaignBuilding,setCampaignBuilding]=useState("");
  const [campaignError,setCampaignError]=useState("");

  // ── PERFORMANCE LOGS — tied to campaign_pieces via piece_id ──
  const [pieceMetrics,setPieceMetrics]=useState({}); // piece_id -> performance_logs row
  const [metricsDraft,setMetricsDraft]=useState({}); // piece_id -> {views,likes,comments,shares,notes}
  const [savingMetrics,setSavingMetrics]=useState({}); // piece_id -> bool

  useEffect(()=>{
    if(!activeProfileId||!session?.user){setCampaignsList([]);return;}
    supabase.from("campaigns").select("*").eq("brand_profile_id",activeProfileId)
      .order("created_at",{ascending:false})
      .then(({data,error})=>{if(!error&&data)setCampaignsList(data);});
  },[activeProfileId,session]);

  function buildCampaignDayPrompt(theme,dayNumber){
    const platformList=cPlatforms.map(p=>CAMPAIGN_PLATFORMS.find(x=>x.id===p)?.label).join(" + ")||"Instagram";
    return `You are GENTAGAI — writing Day ${dayNumber} of a ${cLength}-day campaign.
BRAND: ${brand} | NICHE: ${niche} | AUDIENCE: ${audience||"18-35"} | TONE: ${toneLabel(tone)}
PRODUCT: ${productName||""} — ${productDesc||""}
CAMPAIGN GOAL: ${cGoal||goal||"drive sales"} | PLATFORMS: ${platformList}${memoryBlock(activeMemoryText)}
TODAY'S ROLE IN THE ARC: ${theme}
Write ONE tight, platform-native post that fits this exact day's role in the campaign — not a generic post, one that only makes sense at this point in a ${cLength}-day arc.
FORMAT:
HOOK/CAPTION: [full, copy-paste ready]
HASHTAGS: [10-15]
VISUAL DIRECTION: [one line — what the image or video should show]`;
  }

  async function buildCampaign(){
    if(!brand||!niche||!cGoal.trim()||!activeProfileId){setCampaignError("Save a brand profile and add a campaign goal first.");return;}
    setCampaignError("");
    const{data:camp,error:campErr}=await supabase.from("campaigns").insert({
      user_id:session.user.id,brand_profile_id:activeProfileId,
      name:cName.trim()||`${brand} Campaign`,goal:cGoal,product_name:productName,product_desc:productDesc,
      platforms:cPlatforms,length_days:cLength,status:"draft",
    }).select().single();
    if(campErr||!camp){setCampaignError("Couldn't create the campaign — try again.");return;}
    setCampaignsList(c=>[camp,...c]);
    setActiveCampaign(camp);
    setCampaignPieces([]);

    const days=Array.from({length:cLength},(_,i)=>i+1);
    for(const day of days){
      const theme=CAMPAIGN_THEMES[(day-1)%CAMPAIGN_THEMES.length];
      setCampaignBuilding(`Writing Day ${day} — ${theme}...`);
      const content=await callAPI(buildCampaignDayPrompt(theme,day));
      const{data:piece}=await supabase.from("campaign_pieces").insert({
        user_id:session.user.id,campaign_id:camp.id,day_number:day,day_theme:theme,content,status:"draft",
      }).select().single();
      if(piece)setCampaignPieces(p=>[...p,piece].sort((a,b)=>a.day_number-b.day_number));
    }
    setCampaignBuilding("");
  }

  async function openCampaign(camp){
    setActiveCampaign(camp);setCampaignPieces([]);setPieceMetrics({});setMetricsDraft({});
    const{data,error}=await supabase.from("campaign_pieces").select("*").eq("campaign_id",camp.id).order("day_number");
    if(!error&&data){
      setCampaignPieces(data);
      loadPerformanceLogsForPieces(data.map(p=>p.id));
    }
  }

  // ── Loads any existing performance_logs rows for a set of campaign pieces ──
  async function loadPerformanceLogsForPieces(pieceIds){
    if(!pieceIds||!pieceIds.length){setPieceMetrics({});return;}
    const{data,error}=await supabase.from("performance_logs").select("*").in("piece_id",pieceIds);
    if(!error&&data){
      const map={};const drafts={};
      data.forEach(row=>{
        map[row.piece_id]=row;
        drafts[row.piece_id]={views:row.views??0,likes:row.likes??0,comments:row.comments??0,shares:row.shares??0,notes:row.notes||""};
      });
      setPieceMetrics(map);
      setMetricsDraft(d=>({...d,...drafts}));
    }
  }

  // ── Creates the performance_logs row the moment a piece goes live, so
  // there's always somewhere real to track its numbers. No-ops if one
  // already exists for this piece. ──
  async function ensurePerformanceLog(piece){
    if(pieceMetrics[piece.id]||!session?.user)return;
    const{data,error}=await supabase.from("performance_logs").insert({
      user_id:session.user.id,
      brand_profile_id:activeCampaign?.brand_profile_id||activeProfileId,
      piece_id:piece.id,
      label:`Day ${piece.day_number} — ${piece.day_theme}`,
    }).select().single();
    if(!error&&data){
      setPieceMetrics(m=>({...m,[piece.id]:data}));
      setMetricsDraft(d=>({...d,[piece.id]:{views:0,likes:0,comments:0,shares:0,notes:""}}));
    }
  }

  function updateMetricsDraft(pieceId,field,value){
    setMetricsDraft(d=>({...d,[pieceId]:{...(d[pieceId]||{views:0,likes:0,comments:0,shares:0,notes:""}),[field]:value}}));
  }

  async function savePerformanceLog(pieceId){
    const log=pieceMetrics[pieceId];
    const draft=metricsDraft[pieceId];
    if(!log||!draft)return;
    setSavingMetrics(s=>({...s,[pieceId]:true}));
    const{data,error}=await supabase.from("performance_logs").update({
      views:Number(draft.views)||0,likes:Number(draft.likes)||0,
      comments:Number(draft.comments)||0,shares:Number(draft.shares)||0,
      notes:draft.notes||"",
    }).eq("id",log.id).select().single();
    if(!error&&data)setPieceMetrics(m=>({...m,[pieceId]:data}));
    setSavingMetrics(s=>({...s,[pieceId]:false}));
  }

  async function advancePieceStatus(piece){
    const order=["draft","approved","scheduled","published"];
    const next=order[Math.min(order.indexOf(piece.status)+1,order.length-1)];
    const{data,error}=await supabase.from("campaign_pieces").update({status:next}).eq("id",piece.id).select().single();
    if(!error&&data){
      setCampaignPieces(p=>p.map(x=>x.id===data.id?data:x));
      if(next==="published")ensurePerformanceLog(data);
    }
  }

  function newCampaignForm(){
    setActiveCampaign(null);setCampaignPieces([]);setCName("");setCGoal("");setCLength(7);setCPlatforms(["instagram"]);
    setPieceMetrics({});setMetricsDraft({});
  }

  // Surface the result of a Postiz connect attempt after the redirect back
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("postiz_connected")==="true"){
      alert("Postiz connected! You can now auto-publish to your accounts.");
      window.history.replaceState({},"",window.location.pathname);
      refetchPostizStatus();
    }else if(params.get("postiz_error")){
      alert("Postiz connection failed: "+params.get("postiz_error"));
      window.history.replaceState({},"",window.location.pathname);
    }
  },[]);

  async function sendMagicLink(){
    if(!authEmail||authLoading)return;
    setAuthLoading(true);
    const {error}=await supabase.auth.signInWithOtp({
      email:authEmail,
      options:{emailRedirectTo:window.location.origin},
    });
    setAuthLoading(false);
    if(!error)setMagicLinkSent(true);
    else alert("Couldn't send sign-in link: "+error.message);
  }

  async function signOutAccount(){
    await supabase.auth.signOut();
    setSession(null);setPlan("free");setBilling("monthly");setMagicLinkSent(false);setAuthEmail("");
  }

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

  // ── WORKSPACE NAV (2.0 shell) — which icon-rail workspace's secondary
  // panel is showing. Independent of `mode`, which drives content. ──
  const [activeWorkspace,setActiveWorkspace]=useState("home");

  // ── BRAND BRIEF — 5-step guided journey (Identity → Audience → Voice →
  // Positioning → Goals). "done" shows the completion payoff screen. ──
  const [briefStep,setBriefStep]=useState(1);

  // ── BISHOP MASCOT — cursor-tracking "looking around" tilt. Writes
  // directly to the DOM via ref instead of React state so the whole app
  // doesn't re-render on every mouse-move pixel; harmless no-op when
  // the mascot isn't mounted (any page other than Home). ──
  const bishopMascotRef=useRef(null);
  useEffect(()=>{
    function onMove(e){
      const el=bishopMascotRef.current;
      if(!el)return;
      const nx=(e.clientX/window.innerWidth-0.5)*2;   // -1..1
      const ny=(e.clientY/window.innerHeight-0.5)*2;   // -1..1
      el.style.transform=`rotate(${nx*8}deg) translate(${nx*5}px, ${ny*4}px)`;
    }
    window.addEventListener("mousemove",onMove);
    return()=>window.removeEventListener("mousemove",onMove);
  },[]);

  // ── ASK BISHOP (⌘K) — a real quick-jump palette over the actual nav tree,
  // not a simulated AI command executor. Searches WORKSPACES pages only. ──
  const [commandOpen,setCommandOpen]=useState(false);
  const [commandQuery,setCommandQuery]=useState("");
  useEffect(()=>{
    function onKey(e){
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){
        e.preventDefault();setCommandOpen(o=>!o);setCommandQuery("");
      }
      if(e.key==="Escape")setCommandOpen(false);
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);
  const commandResults=WORKSPACES.flatMap(w=>w.pages.map(p=>({...p,workspaceId:w.id,workspaceLabel:w.label})))
    .filter(p=>!commandQuery.trim()||p.label.toLowerCase().includes(commandQuery.trim().toLowerCase())||p.workspaceLabel.toLowerCase().includes(commandQuery.trim().toLowerCase()));
  function runCommand(item){
    handleSidebarNav(item,item.workspaceId);
    setCommandOpen(false);setCommandQuery("");
  }

  // ── Plan selection / Stripe ─────────────────
  async function handlePlanSelect(pid,bill,enteredCode){
    // ── Agency code check ──
    // Staff codes must persist to the real account record, not just local
    // state — otherwise the next session refresh re-syncs from Supabase's
    // stored plan and silently reverts the badge back to whatever was there
    // before (e.g. Pro), even though the code was accepted.
    if(enteredCode&&AGENCY_CODES.includes(enteredCode.trim().toUpperCase())){
      setPlan("agency");setBilling("yearly");setScreen("app");
      if(session?.user){
        const{data,error}=await supabase.from("users").update({plan:"agency",billing_interval:"yearly"}).eq("id",session.user.id).select();
        if(error){
          console.error("Failed to persist agency staff code:",error.message);
        }else if(!data||data.length===0){
          console.error("Agency staff code update affected 0 rows — likely missing an UPDATE row-level-security policy on the users table for this user's own row.");
        }
      }
      return;
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
    if(gatedModes[m]&&plan==="free"){setUpgradeModal(gatedModes[m]);return;}
    if(m==="video"){setVideoAdType("");setVideoTool("");}
    if(m==="image"){setImageTool("");}
    setMode(m);reset();
  }

  // ── Sidebar nav click — routes to real state/panels; no-ops on not-yet-built items ──
  function handleSidebarNav(item,workspaceId){
    if(workspaceId)setActiveWorkspace(workspaceId);
    if(!item.built)return;
    if(item.mode)handleModeSwitch(item.mode);
    if(item.action==="vault")setVaultOpen(true);
    if(item.action==="learn")setLearnOpen(true);
    if(item.action==="account")setShowAccount(true);
    if(isMobile)setMobileTab("config");
  }

  // ── Generation ──────────────────────────────
  function reset(){setStep("idle");setOutput("");setAbA("");setAbB("");setScores(null);setHistActive(null);setAbTab("variants");}

  // ── Upload helpers ───────────────────────────
  function handleImageFile(file){
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=e=>{
      setUploadedImage({name:file.name,url:e.target.result,base64:null,size:(file.size/1024).toFixed(0),type:"image/jpeg",storageUrl:null,uploading:true,resizing:true});

      resizeImageForVision(file).then(smallBase64=>{
        setUploadedImage(prev=>prev&&prev.name===file.name?{...prev,base64:smallBase64,resizing:false}:prev);
      }).catch(()=>{
        // Fallback — use the original at full size if resizing fails for some reason
        setUploadedImage(prev=>prev&&prev.name===file.name?{...prev,base64:e.target.result.split(",")[1],type:file.type,resizing:false}:prev);
      });

      uploadFileToStorage(file,"images").then(storageUrl=>{
        setUploadedImage(prev=>prev&&prev.name===file.name?{...prev,storageUrl,uploading:false}:prev);
      });
    };
    reader.readAsDataURL(file);
  }
  function handleVideoFile(file){
    if(!file||!file.type.startsWith("video/"))return;
    const url=URL.createObjectURL(file);
    setUploadedVideo({name:file.name,url,size:(file.size/1024/1024).toFixed(1),type:file.type,storageUrl:null,uploading:true,frames:null,extractingFrames:true});
    uploadFileToStorage(file,"videos").then(storageUrl=>{
      setUploadedVideo(prev=>prev&&prev.name===file.name?{...prev,storageUrl,uploading:false}:prev);
    });
    extractVideoFrames(file).then(frames=>{
      setUploadedVideo(prev=>prev&&prev.name===file.name?{...prev,frames,extractingFrames:false}:prev);
    });
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

  // ── Real auto-publish via the user's own connected Postiz account ──
  // Uses the permanent Supabase storage URL from the upload we wired in,
  // not the local base64/blob copy, since Postiz needs a real public link.
  // ── Real AI-visibility scan — actually fetches robots.txt + homepage ──
  async function scanVisibility(){
    if(!vizUrl.trim())return;
    setVizScanning(true);setVizResult(null);setVizError("");setVizFixOutput("");setVizBrandSuggestion(null);setVizBrandError("");
    try{
      const res=await fetch("/api/ai-visibility-check",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({url:vizUrl.trim()}),
      });
      const raw=await res.text();
      let data;
      try{data=JSON.parse(raw);}catch{
        setVizError(res.status===404
          ?"Scan endpoint isn't deployed yet — the ai-visibility-check.js file needs to be added to the api folder on GitHub."
          :`Scan endpoint returned an unexpected response (status ${res.status}). Try again in a moment.`);
        setVizScanning(false);return;
      }
      if(!res.ok||data.error){setVizError(data.error||"Scan failed — try again.");}
      else{setVizResult(data);}
    }catch(e){setVizError("Connection error: "+e.message);}
    setVizScanning(false);
  }

  // ── BISHOP writes the actual fixes, in the brand's own voice ──
  async function generateVizFixes(){
    if(!vizResult)return;
    setVizFixing(true);setVizFixOutput("");
    const voiceCtx=vizResult.siteCopy
      ?`\n\nHere is real text pulled from the live site — match this brand's actual existing voice and vocabulary, don't invent a generic one:\n"""${vizResult.siteCopy.slice(0,1500)}"""`
      :"";
    const prompt=`You are BISHOP, an AI marketing assistant. A brand called "${brand||"this brand"}" (niche: ${niche||"general business"}) just ran an AI-visibility scan on ${vizResult.url} and scored ${vizResult.score}/100.

Issues found:
${vizResult.issues.map(i=>"- "+i).join("\n")}${voiceCtx}

Write a clear, practical fix guide for a non-technical business owner. For each issue:
1. One or two sentences on why it matters for how ChatGPT, Claude, Gemini, and Perplexity understand their site.
2. The exact code or text to add — real robots.txt lines to allow AI crawlers, a working JSON-LD schema snippet, and a meta description written in a tone that fits "${niche||"their brand"}"${vizResult.siteCopy?" and matches the real voice shown above":""}.

Keep everything copy-paste ready. No filler, no disclaimers.`;
    await streamAPI(prompt,chunk=>setVizFixOutput(chunk));
    setVizFixing(false);
  }

  // ── "Learn My Brand" — analyzes real site copy and suggests Brand Brief fields ──
  async function analyzeBrandFromSite(){
    if(!vizResult?.siteCopy)return;
    setVizAnalyzingBrand(true);setVizBrandSuggestion(null);setVizBrandError("");
    const nicheList=NICHE_PRESETS.join(", ");
    const toneList=TONES.map(t=>t.id).join(", ");
    const prompt=`You are BISHOP. Read this real text pulled from a live website and infer the brand's identity. Respond with ONLY valid JSON, nothing else, no markdown fences, in exactly this shape:
{"brandName":"best guess at the actual brand/business name","niche":"closest match from this list: ${nicheList}","audience":"a short target audience description like 'urban males 18-35'","tones":["one or two tone ids from this list: ${toneList}"],"voiceSummary":"2 sentences describing how this brand actually sounds/writes, in plain language"}

Page title: ${vizResult.pageTitle||"(none found)"}

Site text:
"""${vizResult.siteCopy}"""`;
    try{
      const raw=await callAPI(prompt);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setVizBrandSuggestion(parsed);
    }catch(e){
      setVizBrandError("Couldn't read a clear brand identity from this page — try filling in Brand Brief manually instead.");
    }
    setVizAnalyzingBrand(false);
  }

  function applyBrandSuggestion(){
    if(!vizBrandSuggestion)return;
    if(vizBrandSuggestion.brandName)setBrand(vizBrandSuggestion.brandName);
    if(vizBrandSuggestion.niche)setNiche(vizBrandSuggestion.niche);
    if(vizBrandSuggestion.audience)setAudience(vizBrandSuggestion.audience);
    if(Array.isArray(vizBrandSuggestion.tones)&&vizBrandSuggestion.tones.length){
      setTone(vizBrandSuggestion.tones.filter(t=>TONES.some(x=>x.id===t)).slice(0,2));
    }
  }

  const brandJsonInstructions=(source)=>`Respond with ONLY valid JSON, nothing else, no markdown fences, in exactly this shape:
{"brandName":"best guess at the actual brand/business name","niche":"closest match from this list: ${NICHE_PRESETS.join(", ")}","audience":"a short target audience description like 'urban males 18-35'","tones":["one or two tone ids from this list: ${TONES.map(t=>t.id).join(", ")}"],"voiceSummary":"2 sentences describing how this brand actually sounds, in plain language, based on the ${source}"}`;

  function parseBrandJson(raw){
    return JSON.parse(raw.replace(/```json|```/g,"").trim());
  }

  // ── PATH 1: Paste a description — for anyone with no site and no socials connected ──
  async function analyzeBrandFromText(){
    if(!learnText.trim())return;
    setLearnAnalyzing(true);setLearnSuggestion(null);setLearnError("");
    const prompt=`You are BISHOP. Read this description a business owner wrote about their own brand and infer their identity.\n\n${brandJsonInstructions("description below")}\n\nDescription:\n"""${learnText.trim()}"""`;
    try{
      const raw=await callAPI(prompt);
      setLearnSuggestion(parseBrandJson(raw));
    }catch{
      setLearnError("Couldn't read a clear brand identity from that — try adding a bit more detail.");
    }
    setLearnAnalyzing(false);
  }

  // ── PATH 2: Upload a photo — product, flyer, storefront, business card ──
  function handleLearnImageFile(file){
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=e=>{
      setLearnImage({name:file.name,url:e.target.result,base64:e.target.result.split(",")[1],type:file.type});
    };
    reader.readAsDataURL(file);
  }
  async function analyzeBrandFromPhoto(){
    if(!learnImage)return;
    setLearnAnalyzing(true);setLearnSuggestion(null);setLearnError("");
    const content=[
      {type:"image",source:{type:"base64",media_type:learnImage.type,data:learnImage.base64}},
      {type:"text",text:`You are BISHOP. Look at this real photo of a business — a product, flyer, storefront, or business card — and infer the brand's identity from what's actually visible (style, colors, text on the image, vibe, quality level).\n\n${brandJsonInstructions("visual details in the image")}`}
    ];
    try{
      const raw=await callAPIContent(content,2048);
      setLearnSuggestion(parseBrandJson(raw));
    }catch{
      setLearnError("Couldn't read a clear brand identity from that photo — try a clearer shot or a different one.");
    }
    setLearnAnalyzing(false);
  }

  // ── PATH 3: Pull real captions from their connected Instagram via Postiz ──
  async function analyzeBrandFromInstagram(){
    if(!session?.user)return;
    setLearnAnalyzing(true);setLearnSuggestion(null);setLearnError("");
    try{
      const igIntegration=postizStatus.integrations?.find(i=>(i.platform||"").toLowerCase().includes("instagram"));
      const res=await fetch("/api/postiz-posts",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userId:session.user.id,integrationId:igIntegration?.id}),
      });
      const data=await res.json();
      if(!res.ok||data.error){
        setLearnError(typeof data.error==="string"?data.error:"Couldn't pull posts from Instagram — try reconnecting in Account.");
        setLearnAnalyzing(false);return;
      }
      if(!data.captions?.length){
        setLearnError("No real captions found on the connected account yet — post a few times, or try Paste a Description instead.");
        setLearnAnalyzing(false);return;
      }
      const prompt=`You are BISHOP. Here are real captions from a brand's own recent Instagram posts. Infer their identity from their actual writing.\n\n${brandJsonInstructions("captions below")}\n\nCaptions:\n"""${data.captions.join("\n---\n").slice(0,3000)}"""`;
      const raw=await callAPI(prompt);
      setLearnSuggestion(parseBrandJson(raw));
    }catch{
      setLearnError("Something went wrong reading Instagram — try again in a moment.");
    }
    setLearnAnalyzing(false);
  }

  function applyLearnSuggestion(){
    if(!learnSuggestion)return;
    if(learnSuggestion.brandName)setBrand(learnSuggestion.brandName);
    if(learnSuggestion.niche)setNiche(learnSuggestion.niche);
    if(learnSuggestion.audience)setAudience(learnSuggestion.audience);
    if(Array.isArray(learnSuggestion.tones)&&learnSuggestion.tones.length){
      setTone(learnSuggestion.tones.filter(t=>TONES.some(x=>x.id===t)).slice(0,2));
    }
    setLearnOpen(false);
  }

  async function postizPublishNow(integration){
    if(!session?.user)return;
    const caption=publishCaption||output.slice(0,500)||`${brand} — ${productName||niche}`;
    const mediaUrl=uploadedImage?.storageUrl||uploadedVideo?.storageUrl||null;

    setPostizPublishing(s=>({...s,[integration.id]:"publishing"}));
    try{
      const res=await fetch("/api/postiz-publish",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          userId:session.user.id,
          integrationId:integration.id,
          content:caption,
          imageUrl:mediaUrl,
        }),
      });
      const data=await res.json();
      if(!res.ok){
        if(res.status===401){
          setPostizPublishing(s=>({...s,[integration.id]:"expired"}));
        }else{
          setPostizPublishing(s=>({...s,[integration.id]:"error"}));
          console.error("Postiz publish failed:",data);
        }
        return;
      }
      setPostizPublishing(s=>({...s,[integration.id]:"done"}));
    }catch(err){
      setPostizPublishing(s=>({...s,[integration.id]:"error"}));
      console.error("Postiz publish error:",err);
    }
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
        const brandCtx=`BRAND: ${brand||"The Brand"} | NICHE: ${niche||"Fashion & Lifestyle"} | TARGET PLATFORM: ${platform} | TONE: ${toneLabel(tone)}${productCtx}`;

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
          full=await callClaudeVision(msg.content,setOutput,4096);
        }
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:"image_upload",tone,mode:"image",imageTool,aiBrain,output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      } else if(uploadedVideo){
        const productCtx=productDesc?`\nPRODUCT: ${productName||""} (${productType||"unknown type"}) — ${productDesc}${productPrice?` · ${productPrice}`:""}`:""
        const brandCtx=`BRAND: ${brand||"The Brand"} | NICHE: ${niche||"Fashion"} | PLATFORM: ${platform} | TONE: ${toneLabel(tone)}${productCtx}`;
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

  async function amplifyGenerate(){
    const file = uploadedImage||uploadedVideo;
    if(!file) return;
    const limit=currentPlan.gens;
    if(gensUsed>=limit&&limit!==Infinity){setUpgradeModal("more generations");return;}
    reset();setStep("running");
    const mediaType=uploadedImage?"image":"video";
    const hasVideoFrames=!!(uploadedVideo?.frames&&uploadedVideo.frames.length);

    // Runs full_suite as 5 sequential calls reusing the already-fast
    // individual prompt types, instead of 2 heavier custom blocks —
    // each call is small enough to reliably finish under Vercel's 60s timeout.
    const isSplit = amplifyType==="full_suite";
    const typesToRun = isSplit
      ? ["viral_hooks","caption_pack","seo_suite","ad_copy","trending_strategy"]
      : [amplifyType];
    try{
      let combined="";
      for(let i=0;i<typesToRun.length;i++){
        const runType=typesToRun[i];
        const prompt=buildAmplifyPrompt({
          type:runType,brand,niche,platform,tone,audience,goal,keywords,
          productName,productDesc,productType,productPrice,
          mediaType,mediaName:file.name,mediaSize:file.size||uploadedVideo?.size,hasVideoFrames,
          memory:activeMemoryText,
        });
        const ampTokens = AMPLIFY_TOKEN_LIMITS[runType] || AMPLIFY_TOKEN_LIMITS[amplifyType] || 2000;
        const priorText = combined;
        const onChunk = (chunk)=>{
          setOutput(priorText ? priorText + "\n\n" + chunk : chunk);
        };

        let part="";
        if(uploadedImage){
          if(aiBrain==="gemini"&&geminiKey){
            part=await callGeminiVision(prompt,uploadedImage.base64,uploadedImage.type,geminiKey,onChunk);
          }else if(aiBrain==="chatgpt"&&chatgptKey){
            part=await callChatGPTVision(prompt,uploadedImage.base64,uploadedImage.type,chatgptKey,onChunk);
          }else{
            const msg={role:"user",content:[
              {type:"image",source:{type:"base64",media_type:uploadedImage.type,data:uploadedImage.base64}},
              {type:"text",text:prompt}
            ]};
            part=await callClaudeVision(msg.content,onChunk,ampTokens);
          }
        }else if(hasVideoFrames&&!(aiBrain==="gemini"&&geminiKey)&&!(aiBrain==="chatgpt"&&chatgptKey)){
          const content=[
            ...uploadedVideo.frames.map(f=>({type:"image",source:{type:"base64",media_type:"image/jpeg",data:f}})),
            {type:"text",text:prompt}
          ];
          part=await callClaudeVision(content,onChunk,ampTokens);
        }else{
          if(aiBrain==="gemini"&&geminiKey) part=await callGemini(prompt,geminiKey,onChunk);
          else if(aiBrain==="chatgpt"&&chatgptKey) part=await callChatGPT(prompt,chatgptKey,onChunk);
          else part=await streamAPI(prompt,onChunk);
        }
        combined = combined ? combined + "\n\n" + part : part;
      }

      setGensUsed(g=>g+1);setStep("done");
      setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType:amplifyType,tone,mode,aiBrain,output:combined,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
    }catch(e){setOutput("⚠ Connection error. Please try again.");setStep("done");}
  }

  // Lowered from a flat 4096/4500 — smaller budgets finish faster and are
  // far less likely to clip Vercel's 60s function timeout on Hobby.
  // convert_score runs lightest of all since it's a focused analysis, not a content pack.
  const AMPLIFY_TOKEN_LIMITS = {
    viral_hooks: 1800,
    caption_pack: 2000,
    seo_suite: 1800,
    ad_copy: 2200,
    trending_strategy: 2000,
    convert_score: 1600,
    full_suite: 2200,
  };

  async function generate(){
    if(!brand||!niche)return;
    const limit=currentPlan.gens;
    if(gensUsed>=limit&&limit!==Infinity){setUpgradeModal("more generations");return;}
    reset();setStep("running");
    try{
      let full="";
      if(mode==="copy"){
        full=await streamAPI(buildCopy({brand,niche,platform,contentType,tone,audience,goal,keywords,productName,productDesc,productType,productPrice,memory:activeMemoryText}),setOutput);
        outputRef.current=full;
        setHistory(h=>[{id:Date.now(),brand,niche,platform,contentType,tone,mode:"copy",output:full,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      }else if(mode==="image"){
        if(!imageTool)return;
        const imgPrompt=buildImage({brand,niche,imageType,platform,tone,audience,imageTool,productName,productDesc,productType,memory:activeMemoryText});
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
        const vidPrompt=buildVideo({brand,niche,videoAdType,platform,tone,audience,goal,videoTool,productName,productDesc,productType,productPrice,memory:activeMemoryText});
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
          streamAPI(buildAB({brand,niche,platform,contentType,tone,audience,goal,keywords,abVariable:abVar,variant:"A",productName,productDesc,productType,productPrice,memory:activeMemoryText}),(t)=>{fA=t;setAbA(t);}),
          streamAPI(buildAB({brand,niche,platform,contentType,tone,audience,goal,keywords,abVariable:abVar,variant:"B",productName,productDesc,productType,productPrice,memory:activeMemoryText}),(t)=>{fB=t;setAbB(t);}),
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
    setHistActive(e);setBrand(e.brand);setNiche(e.niche);setPlatform(e.platform);setTone(Array.isArray(e.tone)?e.tone:[e.tone||"hype"]);
    setMode(e.mode||"copy");setContentType(e.contentType||"viral_hook");
    if(e.mode==="ab"){if(e.abA)setAbA(e.abA);if(e.abB)setAbB(e.abB);if(e.abVar)setAbVar(e.abVar);setAbTab("variants");}
    else if(e.mode==="image"){if(e.output)setOutput(e.output);if(e.imageTool)setImageTool(e.imageTool);}
    else if(e.mode==="video"){if(e.output)setOutput(e.output);if(e.videoTool)setVideoTool(e.videoTool);}
    else{if(e.output){setOutput(e.output);}}
    setStep("done");
  }

  const mc={copy:"#00e5ff",image:"#ff7c00",video:"#f0b429",ab:"#7c83fd",visibility:"#00ff88",campaign:"#f0b429"}[mode]||"#f0b429";
  // Stable luxury identity accent — used for chrome (rail, panel, active nav)
  // so the brand color doesn't shift hue every time the generation mode
  // changes. Mode colors (mc) are reserved for the Create Studio itself.
  const gold="#C9A961";
  const selTones=TONES.filter(t=>tone.includes(t.id));

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
                style={{padding:"8px 4px",border:`1px solid ${isActive?b.color+"88":"#24272E"}`,background:isActive?`${b.color}10`:"#0E1013",cursor:"pointer",textAlign:"center",transition:"all .15s",borderRadius:4}}>
                <div style={{fontSize:18,color:isActive?b.color:"#6B6F7A",lineHeight:1}}>{b.icon}</div>
                <div style={{fontSize:11,color:isActive?b.color:"#82858C",marginTop:3,letterSpacing:.5}}>{b.label}</div>
                <div style={{fontSize:10,color:hasKey&&b.id!=="claude"?"#00ff8866":"#45484F",marginTop:1}}>{b.id==="claude"?"built-in":hasKey?"✓ key saved":"+ add key"}</div>
              </div>
              {showKeyInput===b.id&&(
                <div style={{background:"#08090B",border:`1px solid ${b.color}33`,padding:"8px",borderRadius:"0 0 4px 4px",marginTop:-1}}>
                  <div style={{fontSize:10,color:b.color,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>
                    <a href={b.link} target="_blank" rel="noreferrer" style={{color:b.color,textDecoration:"none"}}>Get {b.label} key ↗</a>
                  </div>
                  <input type="password" placeholder={`Paste ${b.label} API key`} value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} className="inp" style={{marginBottom:5,fontSize:13,padding:"12px 14px"}}/>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>saveKey(showKeyInput)} style={{flex:1,padding:"6px",border:`1px solid ${b.color}55`,background:`${b.color}11`,color:b.color,fontSize:11,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:1}}>Save</button>
                    <button onClick={()=>setShowKeyInput(null)} style={{padding:"6px 8px",border:"1px solid #24272E",background:"transparent",color:"#82858C",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                  </div>
                </div>
              )}
              {hasKey&&b.id!=="claude"&&isActive&&(
                <button onClick={()=>clearKey(b.id)} style={{width:"100%",background:"none",border:"none",color:"#45484F",fontSize:10,cursor:"pointer",fontFamily:"inherit",marginTop:2,letterSpacing:1}}>clear key</button>
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
    <div className="ambient-glow" style={{minHeight:"100vh",height:"100vh",background:`radial-gradient(ellipse 1300px 800px at 10% -10%, rgba(124,90,255,0.20), transparent 55%),radial-gradient(ellipse 1100px 750px at 100% 0%, rgba(0,180,255,0.16), transparent 55%),radial-gradient(ellipse 900px 650px at 30% 115%, rgba(255,90,190,0.10), transparent 55%),radial-gradient(ellipse 700px 500px at 80% 100%, ${mc}14, transparent 60%),#08051A`,color:"#F5F6F8",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden",transition:"background 1.2s ease",position:"relative"}}>
      <div className="circuit-grid"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');html,body,#root{height:100%;margin:0;padding:0;}
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
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-track{background:#08090B;} ::-webkit-scrollbar-thumb{background:#2A2D33;}
        .gbtn{border:none;font-family:'Inter',-apple-system,'Helvetica Neue',sans-serif;font-weight:600;font-size:15px;letter-spacing:.2px;text-transform:none;padding:17px 0;cursor:pointer;transition:all .3s cubic-bezier(.2,.8,.2,1);width:100%;border-radius:999px;position:relative;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.35);}
        .gbtn:hover{filter:brightness(1.1);transform:translateY(-2px);box-shadow:0 10px 34px rgba(0,0,0,.5);}
        .gbtn:disabled{opacity:.32;cursor:not-allowed;transform:none;box-shadow:none;}
        .sm{background:rgba(255,255,255,.03);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);color:#9BA0AC;font-family:'Inter',-apple-system,'Helvetica Neue',sans-serif;font-size:11.5px;font-weight:500;letter-spacing:.2px;text-transform:none;padding:8px 16px;cursor:pointer;transition:all .2s;border-radius:999px;}
        .sm:hover{border-color:rgba(255,255,255,.22);color:#e8eaed;}
        .sm.on{border-color:${gold};color:${gold};background:${gold}14;}
        .chip{display:flex;align-items:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);backdrop-filter:blur(20px);color:#A8ABB2;font-size:13.5px;letter-spacing:0;padding:12px 16px;cursor:pointer;gap:8px;transition:all .2s;border-radius:16px;}
        .chip:hover{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.065);color:#EDEEF0;}
        .chip.on{border-color:${gold}77;background:${gold}12;color:${gold};}
        .inp{background:rgba(255,255,255,.045);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);color:#F0F1F4;font-family:'Inter',-apple-system,'Helvetica Neue',sans-serif;font-size:15px;padding:15px 17px;width:100%;outline:none;transition:all .2s;border-radius:16px;}
        .inp:focus{border-color:${gold}66;background:rgba(255,255,255,.045);} .inp::placeholder{color:#5C606A;}
        .sl{font-size:13px;letter-spacing:.2px;text-transform:none;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-weight:600;color:#B8BAC0;}
        .sl::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.07);}
        .ctc{background:rgba(255,255,255,.045);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);padding:16px 18px;cursor:pointer;transition:all .2s;border-radius:18px;}
        .ctc:hover{background:rgba(255,255,255,.065);border-color:rgba(255,255,255,.14);}
        .ctc.on{border-color:${gold}88;background:${gold}0d;box-shadow:0 8px 28px rgba(0,0,0,.3);}
        .ctc.locked{opacity:.35;cursor:not-allowed;}
        .otext{font-size:15.5px;line-height:1.85;color:#E8E9EB;white-space:pre-wrap;font-family:'Inter',-apple-system,'Helvetica Neue',sans-serif;word-break:break-word;overflow-wrap:break-word;max-width:100%;}
        .blink::after{content:'●';animation:bl .8s ease-in-out infinite;color:${gold};margin-left:2px;}
        @keyframes bl{0%,100%{opacity:1}50%{opacity:.15}}
        .gline{height:1px;animation:gl 1.1s linear infinite;margin:1px 0;}
        @keyframes gl{from{transform:translateX(-100%)}to{transform:translateX(100vw)}}
        .mbtn{background:rgba(255,255,255,.03);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.09);color:#9BA0AC;font-family:'Inter',-apple-system,'Helvetica Neue',sans-serif;font-size:13px;font-weight:500;letter-spacing:0;text-transform:none;padding:10px 18px;cursor:pointer;transition:all .2s;border-radius:999px;}
        .mbtn:hover{border-color:var(--hc,#45484F);color:var(--hc,#9BA0AC);}
        .vp{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .hi{padding:13px 15px;margin-bottom:4px;border-radius:14px;cursor:pointer;transition:background .15s;border-left:2px solid transparent;}
        .hi:hover{background:rgba(255,255,255,.04);border-left-color:${gold}88;}
        .nt{font-family:'Inter',-apple-system,'Helvetica Neue',sans-serif;font-size:12px;padding:6px 12px;background:transparent;border:1px solid rgba(255,255,255,.1);color:#9BA0AC;cursor:pointer;transition:all .15s;letter-spacing:0;border-radius:999px;}
        .nt:hover{border-color:${gold}55;color:${gold};}
        .toolc{display:flex;align-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);backdrop-filter:blur(20px);color:#A8ABB2;font-size:13.5px;padding:12px 16px;cursor:pointer;gap:7px;transition:all .2s;border-radius:16px;}
        .toolc:hover{border-color:${gold}55;color:#F0F1F4;}
        .lock-icon{font-size:9px;color:#6B6F7A;margin-left:4px;}
        .bishop-sidebar{background:rgba(8,9,11,.7);backdrop-filter:blur(24px);}
        .bishop-core-ring{fill:none;stroke:#6EE7FF;stroke-width:1.4;opacity:.5;animation:corePulse 2.6s ease-in-out infinite;transform-origin:center;}
        @keyframes corePulse{0%,100%{opacity:.25;transform:scale(.85);}50%{opacity:.9;transform:scale(1.05);}}
        .bishop-navitem{display:flex;align-items:center;gap:9px;padding:10px 10px;border-radius:11px;font-size:12px;font-weight:600;color:#82858C;cursor:pointer;transition:all .18s;}
        .bishop-navitem:hover{background:rgba(255,255,255,.05);filter:brightness(1.3);box-shadow:0 0 14px rgba(255,255,255,.06);}
        .ambient-glow{animation:ambientBreathe 8s ease-in-out infinite;}
        @keyframes ambientBreathe{0%,100%{filter:brightness(1);}50%{filter:brightness(1.18);}}
        @keyframes bishopFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .circuit-grid{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
          background-image:linear-gradient(rgba(124,90,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,255,.04) 1px,transparent 1px);
          background-size:48px 48px;mask-image:radial-gradient(ellipse 1000px 700px at 20% 0%,#000 40%,transparent 100%);}
        .grad-shimmer{background-size:220% 220%;animation:gradShimmer 5s ease infinite;}
        @keyframes gradShimmer{0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}
        .pulse-ring{position:absolute;border-radius:50%;border:1px solid currentColor;animation:pulseRing 2.4s ease-out infinite;}
        @keyframes pulseRing{0%{transform:scale(.8);opacity:.7;}100%{transform:scale(2.4);opacity:0;}}
      `}</style>

      {/* UPGRADE MODAL */}
      {upgradeModal&&<UpgradeModal featureName={upgradeModal} onClose={()=>setUpgradeModal(null)} onUpgrade={()=>{setUpgradeModal(null);setScreen("pricing");}}/>}

      {/* VAULT PICKER MODAL */}
      {vaultPickerOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setVaultPickerOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0E1013",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:22,maxWidth:480,width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:800,color:"#F5F6F8"}}>📁 {brand.toUpperCase()} VAULT</div>
              <span onClick={()=>setVaultPickerOpen(false)} style={{cursor:"pointer",color:"#82858C",fontSize:18}}>✕</span>
            </div>
            {vaultPickerLoading?(
              <div style={{textAlign:"center",padding:"30px 0",color:"#00e5ff",fontSize:12}}>⟳ Loading asset...</div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {vaultAssets.filter(a=>(a.file_type||"").startsWith("image/")).map(a=>(
                  <div key={a.id} onClick={()=>selectVaultAssetForUpload(a)}
                    style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",border:"1px solid #24272E",position:"relative"}}>
                    <img src={a.url} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,229,255,0)",transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,229,255,.15)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(0,229,255,0)"}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACCOUNT PANEL */}
      {showAccount&&<AccountPanel plan={plan} billing={billing} gensUsed={gensUsed} gensLimit={genLimit}
        session={session} authEmail={authEmail} setAuthEmail={setAuthEmail}
        sendMagicLink={sendMagicLink} magicLinkSent={magicLinkSent} authLoading={authLoading}
        postizStatus={postizStatus}
        onManage={()=>{setShowAccount(false);setScreen("pricing");}}
        onLogout={()=>{setShowAccount(false);setScreen("pricing");signOutAccount();}}
        onClose={()=>setShowAccount(false)}/>}

      {/* TOP DOCK — single-row nav per Brand Universe brief: logo, 6 primary tabs, active brand, Ask BISHOP, account */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isMobile?"10px 14px":"10px 20px",borderBottom:"1px solid rgba(255,255,255,.07)",background:"rgba(9,13,18,.75)",backdropFilter:"blur(24px)",flexShrink:0,zIndex:50,gap:16,flexWrap:isMobile?"wrap":"nowrap"}}>

        {/* Logo + primary tabs */}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?10:28,flexShrink:0,order:isMobile?1:0}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{display:"flex",gap:3}}>{["#ff2d2d","#f0b429","#7c83fd"].map((c,i)=><div key={i} style={{width:5,height:5,borderRadius:1,background:c}}/>)}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?18:19,letterSpacing:.3,color:"#F5F0E8"}}>GENTAGAI<span style={{color:gold}}>.</span></div>
          </div>
          {!isMobile&&(
            <div style={{display:"flex",alignItems:"center",gap:2}}>
              {TOP_NAV.map(t=>{
                const isActive=activeWorkspace===t.id;
                return(
                  <div key={t.id} onClick={()=>{handleModeSwitch(t.mode);setActiveWorkspace(t.id);}}
                    style={{padding:"8px 14px",borderRadius:10,fontSize:13.5,fontWeight:500,cursor:"pointer",transition:"all .18s",color:isActive?"#F5F6F8":"#7B7F87",background:isActive?"rgba(255,255,255,.06)":"transparent"}}>
                    {t.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Primary nav — horizontally scrollable row on mobile, since the tabs are hidden from the logo row there */}
        {isMobile&&(
          <div style={{display:"flex",gap:6,overflowX:"auto",width:"100%",order:4,paddingBottom:2,msOverflowStyle:"none",scrollbarWidth:"none"}}>
            {TOP_NAV.map(t=>{
              const isActive=activeWorkspace===t.id;
              return(
                <div key={t.id} onClick={()=>{handleModeSwitch(t.mode);setActiveWorkspace(t.id);}}
                  style={{padding:"7px 13px",borderRadius:999,fontSize:12.5,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,color:isActive?"#F5F6F8":"#7B7F87",background:isActive?"rgba(255,255,255,.08)":"rgba(255,255,255,.03)",border:`1px solid ${isActive?"rgba(255,255,255,.14)":"rgba(255,255,255,.06)"}`}}>
                  {t.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Active Brand Selector */}
        <div style={{position:"relative",order:isMobile?3:0,width:isMobile?"100%":"auto",flexShrink:0}}>
          <div onClick={()=>setProfileSwitcherOpen(o=>!o)}
            style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.03)",border:`1px solid ${profileSwitcherOpen?gold+"55":"rgba(255,255,255,.08)"}`,borderRadius:999,padding:isMobile?"8px 12px":"6px 14px",cursor:"pointer",justifyContent:isMobile?"space-between":"flex-start"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:gold,boxShadow:`0 0 8px ${gold}`,flexShrink:0,marginRight:8}}/>
            <span style={{fontSize:13,fontWeight:600,color:"#F5F6F8",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{brand||niche||"Not set yet"}</span>
            <span style={{fontSize:9,color:gold,marginLeft:8,transform:profileSwitcherOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
          </div>
          {profileSwitcherOpen&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,minWidth:220,zIndex:60,background:"rgba(14,16,19,.98)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:7,maxHeight:280,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.7)"}}>
              {brandProfiles.length===0&&(
                <div style={{fontSize:11,color:"#565A64",padding:"10px 8px",lineHeight:1.5}}>No saved brands yet — set up a Brand Brief, then save it.</div>
              )}
              {brandProfiles.map(p=>(
                <div key={p.id} onClick={()=>switchToBrandProfile(p)}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",borderRadius:8,cursor:"pointer",background:activeProfileId===p.id?`${gold}14`:"transparent"}}
                  onMouseEnter={e=>{if(activeProfileId!==p.id)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background=activeProfileId===p.id?`${gold}14`:"transparent";}}>
                  <div style={{overflow:"hidden"}}>
                    <div style={{fontSize:12,fontWeight:700,color:activeProfileId===p.id?mc:"#F0F1F4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.brand_name}</div>
                    <div style={{fontSize:9.5,color:"#565A64",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.niche||"No niche set"}</div>
                  </div>
                  <span onClick={e=>deleteBrandProfile(p.id,e)} style={{fontSize:11,color:"#45484F",padding:"2px 6px",flexShrink:0}}>✕</span>
                </div>
              ))}
              <div onClick={startNewBrandProfile}
                style={{marginTop:6,padding:"9px 10px",borderRadius:8,cursor:"pointer",fontSize:11.5,fontWeight:700,color:gold,border:`1px dashed ${gold}44`,textAlign:"center"}}>
                + New Brand Profile
              </div>
            </div>
          )}
        </div>

        {/* Right side — BISHOP status + Ask BISHOP + account */}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:12,flexShrink:0,order:isMobile?2:0}}>
          {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{position:"relative",width:6,height:6}}>
              <div className="pulse-ring" style={{inset:0,width:6,height:6,color:running?gold:"#00ff88"}}/>
              <div style={{position:"relative",width:6,height:6,borderRadius:"50%",background:running?gold:"#00ff88",animation:running?"bl .9s steps(1) infinite":"none",boxShadow:`0 0 6px ${running?gold:"#00ff88"}`}}/>
            </div>
            <span style={{fontSize:10,letterSpacing:1.5,color:running?gold:"#82858C",textTransform:"uppercase"}}>{running?"BISHOP GENERATING":"BISHOP ONLINE"}</span>
          </div>}
          {!isMobile&&(
            <div onClick={()=>{setCommandOpen(true);setCommandQuery("");}}
              style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:999,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.03)",cursor:"pointer",transition:"all .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.14)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.08)"}>
              <span style={{fontSize:12,color:"#9BA0AC"}}>Ask BISHOP</span>
              <span style={{fontSize:10,color:"#565A64",border:"1px solid rgba(255,255,255,.1)",borderRadius:5,padding:"1px 5px"}}>⌘K</span>
            </div>
          )}
          {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setShowAccount(true)}>
            <div style={{width:40,height:3,background:"#24272E",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:genPct>80?"#ff2d2d":currentPlan.color,width:`${genPct}%`,transition:"width .5s"}}/>
            </div>
            <div style={{fontSize:10,color:"#6B6F7A"}}>{genLimit===Infinity?"∞":`${gensUsed}/${genLimit}`}</div>
          </div>}
          <div onClick={()=>setShowAccount(true)} style={{fontSize:isMobile?10:11,letterSpacing:1,padding:"4px 10px",border:`1px solid ${currentPlan.color}44`,color:currentPlan.color,textTransform:"uppercase",cursor:"pointer",borderRadius:3}}>{currentPlan.badge}</div>
          {!isMobile&&lastSaved&&<div style={{fontSize:9,color:saveFlash?"#00ff88":"#2A2D33",transition:"color .3s"}}>● SAVED</div>}
        </div>

        {/* ── ASK BISHOP — real quick-jump palette, ⌘K ── */}
        {commandOpen&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"12vh"}} onClick={()=>setCommandOpen(false)}>
            <div onClick={e=>e.stopPropagation()} style={{width:"90%",maxWidth:520,background:"rgba(14,18,25,.98)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:18,boxShadow:"0 30px 80px rgba(0,0,0,.6)",overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
                <input autoFocus value={commandQuery} onChange={e=>setCommandQuery(e.target.value)}
                  placeholder="Jump to a page — Brand Brief, Campaigns, AI Viz..."
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#F0F1F4",fontSize:16,fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}/>
              </div>
              <div style={{maxHeight:340,overflowY:"auto",padding:8}}>
                {commandResults.length===0&&<div style={{padding:"20px 14px",fontSize:13,color:"#565A64"}}>Nothing matches that.</div>}
                {commandResults.map(it=>(
                  <div key={it.workspaceId+it.id} onClick={()=>it.built&&runCommand(it)}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderRadius:12,cursor:it.built?"pointer":"not-allowed",opacity:it.built?1:.45,transition:"background .12s"}}
                    onMouseEnter={e=>{if(it.built)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                    <div>
                      <span style={{fontSize:14,color:"#F0F1F4",fontWeight:500}}>{it.label}</span>
                      <span style={{fontSize:11,color:"#565A64",marginLeft:8}}>{it.workspaceLabel}</span>
                    </div>
                    {!it.built&&<span style={{fontSize:9,color:"#4a4d54"}}>soon</span>}
                  </div>

                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SUB-NAV STRIP — only shown for spaces with sub-pages (Create, Intelligence) ── */}
      {!isMobile&&TOP_NAV.find(t=>t.id===activeWorkspace)?.subpages&&(
        <div style={{display:"flex",alignItems:"center",gap:4,padding:"9px 20px",borderBottom:"1px solid rgba(255,255,255,.06)",background:"rgba(9,13,18,.5)",backdropFilter:"blur(20px)",flexShrink:0}}>
          {TOP_NAV.find(t=>t.id===activeWorkspace).subpages.map(sp=>(
            <div key={sp.id} onClick={()=>handleModeSwitch(sp.mode)}
              style={{padding:"6px 14px",borderRadius:999,fontSize:12.5,fontWeight:500,cursor:"pointer",transition:"all .15s",color:mode===sp.mode?mc:"#7B7F87",background:mode===sp.mode?`${mc}14`:"transparent"}}>
              {sp.label}
            </div>
          ))}
        </div>
      )}

      {/* BODY */}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>

        {/* ── MOBILE BOTTOM TAB BAR — only relevant for the legacy config/output split pages; the new full-page rooms scroll as one view ── */}
        {isMobile&&!["home","brand-hq","brand-brief","brand-memory","brand-vault","learn-brand","products"].includes(mode)&&(
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"#08090B",borderTop:"1px solid #24272E",display:"flex",padding:"0"}}>
            <button onClick={()=>setMobileTab("config")}
              style={{flex:1,padding:"12px 0",border:"none",background:mobileTab==="config"?"#0E1013":"transparent",color:mobileTab==="config"?"#00e5ff":"#6B6F7A",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",borderTop:mobileTab==="config"?"2px solid #00e5ff":"2px solid transparent"}}>
              ⚙ Configure
            </button>
            <button onClick={()=>setMobileTab("output")}
              style={{flex:1,padding:"12px 0",border:"none",background:mobileTab==="output"?"#0E1013":"transparent",color:mobileTab==="output"?"#00e5ff":"#6B6F7A",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",borderTop:mobileTab==="output"?"2px solid #00e5ff":"2px solid transparent",position:"relative"}}>
              {step==="running"&&<span style={{position:"absolute",top:8,right:"30%",width:6,height:6,borderRadius:"50%",background:"#00e5ff",animation:"bl .9s steps(1) infinite"}}/>}
              {step==="done"&&<span style={{position:"absolute",top:8,right:"30%",width:6,height:6,borderRadius:"50%",background:"#00ff88"}}/>}
              ▶ Output
            </button>
            <button onClick={()=>setMobileTab("sessions")}
              style={{flex:1,padding:"12px 0",border:"none",background:mobileTab==="sessions"?"#0E1013":"transparent",color:mobileTab==="sessions"?"#00e5ff":"#6B6F7A",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",borderTop:mobileTab==="sessions"?"2px solid #00e5ff":"2px solid transparent"}}>
              ◈ Sessions
            </button>
          </div>
        )}

        {/* ── BRAND HQ — 3D Immersive hub, entry point before the actual Brand Brief form ── */}
        {mode==="brand-hq"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"28px 16px 100px":"52px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:1000}}>

              {/* Immersive intro — orb + mascot + knowledge meter, same world as Home */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,marginBottom:40,position:"relative"}}>
                <div style={{position:"absolute",top:-50,left:-30,width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,90,255,.20),transparent 70%)",filter:"blur(10px)",pointerEvents:"none"}}/>
                <div style={{position:"relative",flex:1,minWidth:0}}>
                  <div style={{fontSize:11,letterSpacing:2,color:gold,textTransform:"uppercase",marginBottom:8}}>Brand</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?28:38,color:"#F8F7FF",lineHeight:1.15,textShadow:"0 0 40px rgba(124,90,255,.3)"}}>Brand HQ</div>
                  <div style={{fontSize:13.5,color:"#9591AC",marginTop:8,maxWidth:420,lineHeight:1.6}}>
                    Everything BISHOP knows about {brand||"your business"}.
                  </div>
                  {(()=>{
                    const hqChecks=[!!brand.trim(),!!niche.trim(),!!audience.trim(),tone&&tone.length>0,!!goal.trim(),!!keywords.trim()];
                    const hqPct=Math.round((hqChecks.filter(Boolean).length/hqChecks.length)*100);
                    return(
                      <div style={{marginTop:18,maxWidth:280}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:11,color:"#9BA0AC"}}>BISHOP Knowledge</span>
                          <span style={{fontSize:13,fontWeight:700,color:hqPct===100?"#4ADE80":gold}}>{hqPct}%</span>
                        </div>
                        <div style={{width:"100%",height:5,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${hqPct}%`,background:hqPct===100?"linear-gradient(90deg,#4ADE80,#22C55E)":`linear-gradient(90deg,${gold},#B8935A)`,borderRadius:4,transition:"width .5s ease"}}/>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {!isMobile&&(
                  <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                    <div style={{position:"relative",width:64,height:64,animation:"bishopFloat 4s ease-in-out infinite"}}>
                      <div style={{position:"absolute",inset:-10,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,229,255,.2),transparent 70%)",filter:"blur(5px)"}}/>
                      <img src="/bishop-mascot.png" alt="BISHOP" style={{position:"relative",width:64,height:64,objectFit:"contain",filter:"drop-shadow(0 6px 14px rgba(0,0,0,.4))"}}/>
                    </div>
                    <BishopCoreOrb size={110}/>
                  </div>
                )}
              </div>

              {/* 4 premium glass gradient-edge cards — command hub, not a form yet */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14}}>
                {[
                  {id:"brand-brief",label:"Brand Brief",sub:"Identity · Audience · Voice",grad:"linear-gradient(115deg,#F0C468,#C9A961,#F0C468)",icon:"◆",action:()=>{handleModeSwitch("brand-brief");}},
                  {id:"brand-memory",label:"BISHOP Memory",sub:activeProfileId?`${brandMemories.filter(m=>m.active).length} active rules`:"Save a brand to enable",grad:"linear-gradient(115deg,#4DE8FF,#7C5AFF,#4DE8FF)",icon:"◈",action:()=>{handleModeSwitch("brand-memory");}},
                  {id:"brand-vault",label:"Brand Vault",sub:activeProfileId?`${vaultAssets.length} assets`:"Save a brand to enable",grad:"linear-gradient(115deg,#9D7CFF,#4D5FFF,#9D7CFF)",icon:"▣",action:()=>{handleModeSwitch("brand-vault");}},
                  {id:"learn-brand",label:"Learn My Brand",sub:"Website · Instagram · Images",grad:"linear-gradient(115deg,#4DFFB8,#00D4FF,#4DFFB8)",icon:"✦",action:()=>{handleModeSwitch("learn-brand");}},
                ].map(c=>(
                  <div key={c.id} onClick={()=>c.action&&c.action()} className={c.action?"grad-shimmer":""}
                    style={{padding:1.4,borderRadius:22,backgroundImage:c.action?c.grad:"linear-gradient(115deg,#2A2D38,#2A2D38)",cursor:c.action?"pointer":"not-allowed",transition:"opacity .25s ease, transform .25s ease, filter .25s ease",opacity:c.action?.75:.4}}
                    onMouseEnter={e=>{if(c.action){e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(-4px) scale(1.015)";e.currentTarget.style.filter="drop-shadow(0 16px 36px rgba(124,90,255,.35))";}}}
                    onMouseLeave={e=>{if(c.action){e.currentTarget.style.opacity=".75";e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.filter="none";}}}>
                    <div style={{position:"relative",background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:21,padding:"20px 16px",minHeight:130,display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden",height:"100%"}}>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(255,255,255,.08),transparent 45%)",pointerEvents:"none"}}/>
                      <div style={{width:36,height:36,borderRadius:11,background:c.action?c.grad:"#3A3D48",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#0A0620",fontWeight:700,boxShadow:"0 4px 14px rgba(0,0,0,.35), inset 0 1px 2px rgba(255,255,255,.4)",position:"relative"}}>{c.icon}</div>
                      <div style={{position:"relative"}}>
                        <div style={{fontSize:14.5,fontWeight:600,color:"#F5F4FF"}}>{c.label}</div>
                        <div style={{fontSize:11.5,color:"#9591AC",marginTop:5,lineHeight:1.5}}>{c.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ):mode==="brand-memory"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"24px 16px 100px":"48px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:760}}>
              <div style={{marginBottom:28}}>
                <div style={{fontSize:11,letterSpacing:2,color:"#4DE8FF",textTransform:"uppercase",marginBottom:8}}>Brand · Retained Intelligence</div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?26:34,color:"#F8F7FF",textShadow:"0 0 30px rgba(77,232,255,.25)"}}>BISHOP Memory</div>
                <div style={{fontSize:13.5,color:"#9591AC",marginTop:8}}>Standing rules BISHOP carries into every generation for {brand||"this brand"}.</div>
              </div>

              {!activeProfileId?(
                <div style={{padding:1.4,borderRadius:22,backgroundImage:"linear-gradient(115deg,#4DE8FF,#7C5AFF,#4DE8FF)"}} className="grad-shimmer">
                  <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:21,padding:"28px 24px",textAlign:"center"}}>
                    <div style={{fontSize:14,color:"#F0F1F4",marginBottom:14}}>Save a Brand Brief first to unlock BISHOP Memory for it.</div>
                    <button className="gbtn" onClick={()=>handleModeSwitch("brand-brief")} style={{width:"auto",padding:"11px 26px",background:"linear-gradient(115deg,#4DE8FF,#7C5AFF)",color:"#0A0620"}}>Go to Brand Brief →</button>
                  </div>
                </div>
              ):(<>
                <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
                  <div style={{padding:1.4,borderRadius:18,backgroundImage:"linear-gradient(115deg,#4DE8FF,#7C5AFF,#4DE8FF)"}} className="grad-shimmer">
                    <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:17,padding:"14px 20px"}}>
                      <div style={{fontSize:26,fontWeight:700,color:"#4DE8FF",fontFamily:"'Fraunces',serif"}}>{brandMemories.filter(m=>m.active).length}</div>
                      <div style={{fontSize:11,color:"#9591AC",marginTop:2}}>Active Rules</div>
                    </div>
                  </div>
                </div>

                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={newMemoryText} onChange={e=>setNewMemoryText(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addBrandMemory()}
                    placeholder="e.g. never say 'cheap' — LEWCOR is premium"
                    className="inp" style={{flex:1}}/>
                  <button onClick={addBrandMemory} disabled={!newMemoryText.trim()||savingMemory}
                    className="gbtn" style={{width:"auto",padding:"0 26px",background:"linear-gradient(115deg,#4DE8FF,#7C5AFF)",color:"#0A0620"}}>
                    {savingMemory?"Saving...":"+ Add"}
                  </button>
                </div>
                {memoryError&&<div style={{fontSize:12,color:"#ff6a6a",marginBottom:16}}>{memoryError}</div>}

                <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:20}}>
                  {brandMemories.length===0&&<div style={{fontSize:13,color:"#565A64",padding:"20px 0"}}>Nothing remembered yet — add BISHOP's first standing rule above.</div>}
                  {brandMemories.map(mem=>(
                    <div key={mem.id} style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(16px)",border:`1px solid ${mem.active?"rgba(77,232,255,.25)":"rgba(255,255,255,.08)"}`,borderRadius:16,padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9.5,letterSpacing:1,color:mem.active?"#4DE8FF":"#565A64",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>{mem.active?"ACTIVE":"INACTIVE"}</div>
                        <div style={{fontSize:14,color:mem.active?"#F0F1F4":"#6B7280",lineHeight:1.5,textDecoration:mem.active?"none":"line-through"}}>{mem.content}</div>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button className="sm" onClick={()=>toggleBrandMemory(mem)} style={{borderColor:mem.active?"#4DE8FF55":"rgba(255,255,255,.1)",color:mem.active?"#4DE8FF":"#9BA0AC"}}>{mem.active?"Deactivate":"Activate"}</button>
                        <button className="sm" onClick={()=>deleteBrandMemory(mem.id)} style={{borderColor:"#ff6a6a33",color:"#ff6a6a"}}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>)}
            </div>
          </div>
        ):mode==="brand-vault"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"24px 16px 100px":"48px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:920}}>
              <div style={{marginBottom:28}}>
                <div style={{fontSize:11,letterSpacing:2,color:"#9D7CFF",textTransform:"uppercase",marginBottom:8}}>Brand · Asset Library</div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?26:34,color:"#F8F7FF",textShadow:"0 0 30px rgba(157,124,255,.25)"}}>Brand Vault</div>
                <div style={{fontSize:13.5,color:"#9591AC",marginTop:8}}>{vaultAssets.length} assets saved for {brand||"this brand"}.</div>
              </div>

              {!activeProfileId?(
                <div style={{padding:1.4,borderRadius:22,backgroundImage:"linear-gradient(115deg,#9D7CFF,#4D5FFF,#9D7CFF)"}} className="grad-shimmer">
                  <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:21,padding:"28px 24px",textAlign:"center"}}>
                    <div style={{fontSize:14,color:"#F0F1F4",marginBottom:14}}>Save a Brand Brief first to unlock the Vault for it.</div>
                    <button className="gbtn" onClick={()=>handleModeSwitch("brand-brief")} style={{width:"auto",padding:"11px 26px",background:"linear-gradient(115deg,#9D7CFF,#4D5FFF)",color:"#0A0620"}}>Go to Brand Brief →</button>
                  </div>
                </div>
              ):(<>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
                  {VAULT_CATEGORIES.map(c=>(
                    <button key={c.id} onClick={()=>setVaultCategory(c.id)}
                      style={{padding:"8px 16px",borderRadius:999,border:`1px solid ${vaultCategory===c.id?"#9D7CFF77":"rgba(255,255,255,.1)"}`,background:vaultCategory===c.id?"rgba(157,124,255,.12)":"transparent",color:vaultCategory===c.id?"#9D7CFF":"#9BA0AC",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                      {c.label}
                    </button>
                  ))}
                </div>

                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22}}>
                  {vaultAssets.filter(a=>a.category===vaultCategory).map(a=>(
                    <div key={a.id} style={{position:"relative",aspectRatio:"1",borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.03)"}}>
                      {(a.file_type||"").startsWith("image/")?(
                        <img src={a.url} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      ):(
                        <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🎬</div>
                      )}
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.75),transparent 50%)",display:"flex",alignItems:"flex-end",padding:10}}>
                        <div style={{fontSize:11,color:"#F0F1F4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%"}}>{a.name}</div>
                      </div>
                      <span onClick={()=>deleteVaultAsset(a.id)} style={{position:"absolute",top:6,right:6,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,.6)",color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</span>
                    </div>
                  ))}
                  {vaultAssets.filter(a=>a.category===vaultCategory).length===0&&(
                    <div style={{gridColumn:isMobile?"1/3":"1/5",fontSize:13,color:"#565A64",padding:"24px 0",textAlign:"center"}}>No {VAULT_CATEGORIES.find(c=>c.id===vaultCategory)?.label.toLowerCase()} yet.</div>
                  )}
                </div>

                <label style={{display:"block",padding:1.4,borderRadius:18,backgroundImage:"linear-gradient(115deg,#9D7CFF,#4D5FFF,#9D7CFF)",cursor:vaultUploading?"default":"pointer"}} className={vaultUploading?"":"grad-shimmer"}>
                  <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:17,padding:"16px",textAlign:"center",fontSize:13.5,fontWeight:600,color:vaultUploading?"#6B7280":"#F0F1F4"}}>
                    {vaultUploading?"⟳ Uploading...":`+ Add to ${VAULT_CATEGORIES.find(c=>c.id===vaultCategory)?.label}`}
                  </div>
                  <input type="file" accept="image/*,video/*" style={{display:"none"}} disabled={vaultUploading}
                    onChange={e=>{if(e.target.files?.[0])uploadToVault(e.target.files[0],vaultCategory);}}/>
                </label>
              </>)}
            </div>
          </div>
        ):mode==="learn-brand"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"24px 16px 100px":"48px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:760}}>
              <div style={{marginBottom:28}}>
                <div style={{fontSize:11,letterSpacing:2,color:"#4DFFB8",textTransform:"uppercase",marginBottom:8}}>Brand · BISHOP Learning Chamber</div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?26:34,color:"#F8F7FF",textShadow:"0 0 30px rgba(77,255,184,.25)"}}>Teach BISHOP</div>
                <div style={{fontSize:13.5,color:"#9591AC",marginTop:8}}>Paste a description, upload a photo, or connect Instagram — BISHOP reads your real voice, never guesses.</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:24}}>
                {[{id:"text",label:"Paste Description"},{id:"photo",label:"Upload Photo"},{id:"instagram",label:"Connect Instagram"}].map(t=>(
                  <div key={t.id} onClick={()=>{setLearnMode(t.id);setLearnSuggestion(null);setLearnError("");}} className={learnMode===t.id?"grad-shimmer":""}
                    style={{padding:1.4,borderRadius:18,backgroundImage:learnMode===t.id?"linear-gradient(115deg,#4DFFB8,#00D4FF,#4DFFB8)":"rgba(255,255,255,.08)",cursor:"pointer"}}>
                    <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:17,padding:"18px 14px",textAlign:"center"}}>
                      <div style={{fontSize:13.5,fontWeight:600,color:learnMode===t.id?"#4DFFB8":"#9BA0AC"}}>{t.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.09)",borderRadius:20,padding:22}}>
                {learnMode==="text"&&(<>
                  <textarea className="inp" rows={5} placeholder="Tell BISHOP about your brand — what you sell, who it's for, how you talk about it..." value={learnText} onChange={e=>setLearnText(e.target.value)} style={{marginBottom:14,resize:"vertical"}}/>
                  <button className="gbtn" disabled={!learnText.trim()||learnAnalyzing} onClick={analyzeBrandFromText} style={{background:"linear-gradient(115deg,#4DFFB8,#00D4FF)",color:"#0A0620"}}>
                    {learnAnalyzing?"⟳ BISHOP is reading...":"Learn My Brand"}
                  </button>
                </>)}

                {learnMode==="photo"&&(<>
                  {!learnImage?(
                    <label style={{display:"block",border:"1.5px dashed rgba(255,255,255,.15)",borderRadius:16,padding:"28px 16px",textAlign:"center",cursor:"pointer",marginBottom:14}}>
                      <div style={{fontSize:13,color:"#9BA0AC"}}>Tap to upload a product photo, flyer, or storefront shot</div>
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])handleLearnImageFile(e.target.files[0]);}}/>
                    </label>
                  ):(
                    <div style={{marginBottom:14,borderRadius:16,overflow:"hidden",position:"relative"}}>
                      <img src={learnImage.url} alt="" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/>
                      <button onClick={()=>setLearnImage(null)} style={{position:"absolute",top:8,right:8,background:"#ff2d2d",border:"none",color:"#fff",width:26,height:26,borderRadius:"50%",cursor:"pointer"}}>✕</button>
                    </div>
                  )}
                  <button className="gbtn" disabled={!learnImage||learnAnalyzing} onClick={analyzeBrandFromPhoto} style={{background:"linear-gradient(115deg,#4DFFB8,#00D4FF)",color:"#0A0620"}}>
                    {learnAnalyzing?"⟳ BISHOP is reading...":"Learn My Brand"}
                  </button>
                </>)}

                {learnMode==="instagram"&&(<>
                  <div style={{fontSize:13,color:"#9BA0AC",lineHeight:1.6,marginBottom:14}}>
                    {postizStatus.connected?"BISHOP will read your real recent captions to learn your voice.":"Connect Instagram via Postiz in Account first, then come back here."}
                  </div>
                  <button className="gbtn" disabled={!postizStatus.connected||learnAnalyzing} onClick={analyzeBrandFromInstagram} style={{background:"linear-gradient(115deg,#4DFFB8,#00D4FF)",color:"#0A0620",opacity:postizStatus.connected?1:.5}}>
                    {learnAnalyzing?"⟳ Reading your posts...":"Learn From My Instagram"}
                  </button>
                </>)}

                {learnError&&<div style={{fontSize:12,color:"#ff6a6a",marginTop:14}}>{learnError}</div>}

                {learnSuggestion&&(
                  <div style={{marginTop:20,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.08)"}}>
                    <div style={{fontSize:14,color:"#F0F1F4",lineHeight:1.7,marginBottom:14,fontStyle:"italic",fontFamily:"'Fraunces',serif"}}>"{learnSuggestion.voiceSummary}"</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                      {[["Brand",learnSuggestion.brandName],["Niche",learnSuggestion.niche],["Audience",learnSuggestion.audience],["Tone",(learnSuggestion.tones||[]).map(t=>TONES.find(x=>x.id===t)?.label).filter(Boolean).join(" + ")]].map(([label,val])=>(
                        <div key={label} style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:"9px 11px"}}>
                          <div style={{fontSize:9,color:"#565A64",textTransform:"uppercase"}}>{label}</div>
                          <div style={{fontSize:12.5,color:"#F0F1F4",marginTop:2}}>{val||"—"}</div>
                        </div>
                      ))}
                    </div>
                    <button className="gbtn" onClick={applyLearnSuggestion} style={{background:"linear-gradient(115deg,#4ADE80,#22C55E)",color:"#0A0620"}}>Apply to Brand Brief</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ):mode==="products"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"24px 16px 100px":"48px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:1000}}>

              {!activeProduct?(<>
                {/* ── SHOWROOM ── */}
                <div style={{marginBottom:28}}>
                  <div style={{fontSize:11,letterSpacing:2,color:"#FF9D4D",textTransform:"uppercase",marginBottom:8}}>Products · Showroom</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?26:34,color:"#F8F7FF",textShadow:"0 0 30px rgba(255,157,77,.25)"}}>Product Showroom</div>
                  <div style={{fontSize:13.5,color:"#9591AC",marginTop:8}}>Everything {brand||"your brand"} sells, organized for BISHOP. {products.length} product{products.length===1?"":"s"}.</div>
                </div>

                {!activeProfileId?(
                  <div style={{padding:1.4,borderRadius:22,backgroundImage:"linear-gradient(115deg,#FF9D4D,#FF5F6D,#FF9D4D)"}} className="grad-shimmer">
                    <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:21,padding:"28px 24px",textAlign:"center"}}>
                      <div style={{fontSize:14,color:"#F0F1F4",marginBottom:14}}>Save a Brand Brief first to start your Showroom.</div>
                      <button className="gbtn" onClick={()=>handleModeSwitch("brand-brief")} style={{width:"auto",padding:"11px 26px",background:"linear-gradient(115deg,#FF9D4D,#FF5F6D)",color:"#0A0620"}}>Go to Brand Brief →</button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:16}}>
                    {products.map(p=>(
                      <div key={p.id} onClick={()=>openProduct(p)} className="grad-shimmer"
                        style={{padding:1.4,borderRadius:22,backgroundImage:"linear-gradient(115deg,#FF9D4D,#FF5F6D,#FF9D4D)",cursor:"pointer",transition:"opacity .25s ease, transform .25s ease, filter .25s ease",opacity:.75}}
                        onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(-4px) scale(1.015)";e.currentTarget.style.filter="drop-shadow(0 16px 36px rgba(255,157,77,.3))";}}
                        onMouseLeave={e=>{e.currentTarget.style.opacity=".75";e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.filter="none";}}>
                        <div style={{position:"relative",background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:21,minHeight:170,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                          <span onClick={e=>deleteProduct(p.id,e)} style={{position:"absolute",top:10,right:10,fontSize:12,color:"#fff",background:"rgba(0,0,0,.5)",width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:2}}>✕</span>
                          {p.image_url?(
                            <div style={{width:"100%",height:110,overflow:"hidden",flexShrink:0}}>
                              <img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            </div>
                          ):(
                            <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(255,255,255,.06),transparent 45%)",pointerEvents:"none"}}/>
                          )}
                          <div style={{padding:"16px 18px",flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                            {!p.image_url&&(
                              <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(115deg,#FF9D4D,#FF5F6D)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,color:"#0A0620",fontWeight:700,boxShadow:"0 4px 14px rgba(0,0,0,.35), inset 0 1px 2px rgba(255,255,255,.4)",marginBottom:12}}>▣</div>
                            )}
                            <div style={{position:"relative"}}>
                              <div style={{fontSize:16,fontWeight:600,color:"#F5F4FF"}}>{p.name}</div>
                              <div style={{fontSize:12,color:"#9591AC",marginTop:4}}>{[p.product_type,p.price].filter(Boolean).join(" · ")||"No details yet"}</div>
                              <div style={{fontSize:11,color:"#FF9D4D",marginTop:10,fontWeight:600}}>OPEN PRODUCT →</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Introduce a Product tile */}
                    {!showNewProduct?(
                      <div onClick={()=>setShowNewProduct(true)}
                        style={{border:"1.5px dashed rgba(255,157,77,.4)",borderRadius:22,padding:"20px 18px",minHeight:170,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:8}}>
                        <div style={{fontSize:26,color:"#FF9D4D"}}>+</div>
                        <div style={{fontSize:13.5,fontWeight:600,color:"#FF9D4D",textAlign:"center"}}>Introduce a Product to BISHOP</div>
                      </div>
                    ):(
                      <div style={{gridColumn:isMobile?"1/3":"1/4",background:"rgba(255,255,255,.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,157,77,.3)",borderRadius:22,padding:22}}>
                        <div style={{fontSize:15,fontWeight:600,color:"#F5F4FF",marginBottom:16}}>Introduce a New Product</div>

                        <div style={{fontSize:11.5,letterSpacing:1,color:"#FF9D4D",marginBottom:4,fontWeight:600}}>UPLOAD PRODUCT IMAGE</div>
                        <div style={{fontSize:12,color:"#7B7F87",marginBottom:12}}>Add a product image so BISHOP can better understand what it is analyzing.</div>
                        {!npImage?(<>
                          <label style={{display:"block",border:"1.5px dashed rgba(255,157,77,.4)",borderRadius:16,padding:"22px 16px",textAlign:"center",cursor:"pointer",marginBottom:10}}>
                            <div style={{fontSize:13,color:"#9BA0AC"}}>Tap to upload a real photo of the product</div>
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])handleNpImageFile(e.target.files[0]);}}/>
                          </label>
                          {vaultAssets.filter(a=>(a.file_type||"").startsWith("image/")).length>0&&(
                            <button type="button" className="sm" onClick={()=>setShowVaultImagePicker(o=>!o)} style={{borderColor:"#FF9D4D55",color:"#FF9D4D",marginBottom:16}}>
                              {showVaultImagePicker?"Hide Brand Vault":"Select From Brand Vault"}
                            </button>
                          )}
                          {showVaultImagePicker&&(
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
                              {vaultAssets.filter(a=>(a.file_type||"").startsWith("image/")).map(a=>(
                                <div key={a.id} onClick={()=>{setNpImage({name:a.name,url:a.url,fromVault:true});setShowVaultImagePicker(false);}}
                                  style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",border:"1px solid rgba(255,255,255,.1)"}}>
                                  <img src={a.url} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                                </div>
                              ))}
                            </div>
                          )}
                        </>):(
                          <div style={{marginBottom:16,borderRadius:16,overflow:"hidden",position:"relative",maxWidth:220}}>
                            <img src={npImage.url} alt="" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block"}}/>
                            <button onClick={()=>setNpImage(null)} style={{position:"absolute",top:8,right:8,background:"#ff2d2d",border:"none",color:"#fff",width:26,height:26,borderRadius:"50%",cursor:"pointer"}}>✕</button>
                          </div>
                        )}

                        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                          <input className="inp" placeholder="Product name *" value={npName} onChange={e=>setNpName(e.target.value)}/>
                          <input className="inp" placeholder="Type (e.g. Hoodie)" value={npType} onChange={e=>setNpType(e.target.value)}/>
                          <input className="inp" placeholder="Price (e.g. $85)" value={npPrice} onChange={e=>setNpPrice(e.target.value)}/>
                        </div>
                        <div style={{fontSize:11.5,letterSpacing:1,color:"#FF9D4D",marginBottom:4,fontWeight:600}}>PRODUCT DESCRIPTION</div>
                        <div style={{fontSize:12,color:"#7B7F87",marginBottom:8}}>Tell BISHOP what this product is, what it's about, or anything important it should know.</div>
                        <textarea className="inp" rows={3} placeholder="Example: Premium heavyweight streetwear inspired by Chicago identity." value={npDesc} onChange={e=>setNpDesc(e.target.value)} style={{marginBottom:14,resize:"vertical"}}/>
                        {productError&&<div style={{fontSize:12,color:"#ff6a6a",marginBottom:10}}>{productError}</div>}
                        <div style={{display:"flex",gap:10}}>
                          <button className="gbtn" disabled={!npName.trim()||savingProduct} onClick={createProduct} style={{width:"auto",padding:"11px 26px",background:"linear-gradient(115deg,#FF9D4D,#FF5F6D)",color:"#0A0620"}}>
                            {savingProduct?(npImageUploading?"Uploading photo...":"Saving..."):"Save Product"}
                          </button>
                          <button className="sm" onClick={()=>{setShowNewProduct(false);setNpImage(null);}}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>):(<>
                {/* ── PRODUCT CHAMBER ── */}
                <button className="sm" onClick={()=>setActiveProductId(null)} style={{marginBottom:20}}>← All Products</button>
                <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:12}}>
                  {activeProduct.image_url&&(
                    <img src={activeProduct.image_url} alt={activeProduct.name} style={{width:72,height:72,borderRadius:16,objectFit:"cover",border:"1px solid rgba(255,157,77,.3)",flexShrink:0}}/>
                  )}
                  <div>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?24:30,color:"#F8F7FF"}}>{activeProduct.name}</div>
                    <div style={{fontSize:13,color:"#9591AC",marginTop:4}}>{[activeProduct.product_type,activeProduct.price].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>

                {/* BISHOP Product Knowledge — real, computed from what's actually filled */}
                {(()=>{
                  const pChecks=[!!activeProduct.description,!!activeProduct.image_url,!!activeProduct.story,!!activeProduct.customer,!!activeProduct.positioning];
                  const pPct=Math.round((pChecks.filter(Boolean).length/pChecks.length)*100);
                  return(
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
                      <span style={{fontSize:11.5,color:"#9BA0AC"}}>BISHOP Product Knowledge</span>
                      <span style={{fontSize:15,fontWeight:700,color:pPct===100?"#4ADE80":"#FF9D4D",fontFamily:"'Fraunces',serif"}}>{pPct}%</span>
                      <div style={{flex:1,maxWidth:160,height:4,background:"rgba(255,255,255,.08)",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pPct}%`,background:pPct===100?"linear-gradient(90deg,#4ADE80,#22C55E)":"linear-gradient(90deg,#FF9D4D,#FF5F6D)",borderRadius:4,transition:"width .5s"}}/>
                      </div>
                    </div>
                  );
                })()}

                {!activeProduct.story&&!activeProduct.customer&&!activeProduct.positioning&&(
                  <div style={{padding:1.4,borderRadius:20,backgroundImage:"linear-gradient(115deg,#FF9D4D,#FF5F6D,#FF9D4D)",marginBottom:24}} className="grad-shimmer">
                    <div style={{background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:19,padding:"20px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:14.5,fontWeight:600,color:"#F5F4FF"}}>BISHOP hasn't studied this product yet</div>
                        <div style={{fontSize:12.5,color:"#9591AC",marginTop:4}}>One click — BISHOP reads your brand, the description, and the photo to write Story, Customer, and Positioning.</div>
                        {productAnalysisError&&<div style={{fontSize:12,color:"#ff6a6a",marginTop:8}}>{productAnalysisError}</div>}
                      </div>
                      <button className="gbtn" disabled={analyzingProduct} onClick={analyzeProductWithBishop}
                        style={{width:"auto",padding:"12px 26px",background:"linear-gradient(115deg,#FF9D4D,#FF5F6D)",color:"#0A0620",flexShrink:0}}>
                        {analyzingProduct?"⟳ Analyzing...":"Analyze with BISHOP"}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:22,borderBottom:"1px solid rgba(255,255,255,.08)",paddingBottom:14}}>
                  {[
                    {id:"story",label:"Story",built:true},
                    {id:"customer",label:"Customer",built:true},
                    {id:"positioning",label:"Positioning",built:true},
                    {id:"assets",label:"Assets",built:false},
                    {id:"performance",label:"Performance",built:false},
                  ].map(t=>(
                    <button key={t.id} disabled={!t.built} onClick={()=>{if(t.built){setProductChamberTab(t.id);setChamberSaveError("");setChamberSaved(false);}}}
                      style={{padding:"7px 15px",borderRadius:999,border:`1px solid ${productChamberTab===t.id?"#FF9D4D77":"rgba(255,255,255,.1)"}`,background:productChamberTab===t.id?"rgba(255,157,77,.12)":"transparent",color:!t.built?"#4a4d54":productChamberTab===t.id?"#FF9D4D":"#9BA0AC",cursor:t.built?"pointer":"not-allowed",fontSize:12.5,opacity:t.built?1:.5}}>
                      {t.label}{!t.built&&<span style={{fontSize:9,marginLeft:5}}>soon</span>}
                    </button>
                  ))}
                </div>

                {(productChamberTab==="story"||productChamberTab==="customer"||productChamberTab==="positioning")&&(()=>{
                  const cfg={
                    story:{label:"Product Story",helper:"What this product is, why it exists, and what makes it worth buying.",placeholder:"Example: Premium heavyweight streetwear inspired by Chicago identity and designed around confidence, culture, and self-expression."},
                    customer:{label:"Ideal Customer",helper:"Who this product is genuinely for.",placeholder:"Example: Style-conscious consumers who value premium streetwear, culture, individuality, and limited releases."},
                    positioning:{label:"Positioning",helper:"How you want people to see and understand your product compared with everything else they could buy.",placeholder:"Example: Premium streetwear with better quality, stronger identity, and a unique Chicago story."},
                  }[productChamberTab];
                  const hasValue=!!activeProduct[productChamberTab];
                  return(
                    <div style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.09)",borderRadius:22,padding:22}}>
                      <div style={{fontSize:13,letterSpacing:1,color:"#FF9D4D",marginBottom:6,fontWeight:600}}>{cfg.label.toUpperCase()}</div>
                      <div style={{fontSize:12,color:"#7B7F87",marginBottom:14,lineHeight:1.5}}>{cfg.helper}</div>
                      <textarea className="inp" rows={6} placeholder={cfg.placeholder}
                        value={chamberDraft[productChamberTab]}
                        onChange={e=>setChamberDraft(d=>({...d,[productChamberTab]:e.target.value}))}
                        style={{resize:"vertical",marginBottom:14}}/>
                      <div style={{display:"flex",gap:10}}>
                        <button className="gbtn" disabled={savingChamber} onClick={()=>saveChamberField(productChamberTab)} style={{width:"auto",padding:"11px 26px",background:chamberSaved?"linear-gradient(115deg,#4DFFB8,#00D4FF)":"linear-gradient(115deg,#FF9D4D,#FF5F6D)",color:"#0A0620"}}>
                          {savingChamber?"Saving...":chamberSaved?"✓ Saved":"Save"}
                        </button>
                        {hasValue&&(
                          <button className="sm" disabled={analyzingProduct} onClick={analyzeProductWithBishop} style={{borderColor:"#FF9D4D55",color:"#FF9D4D"}}>
                            {analyzingProduct?"⟳ BISHOP is rethinking...":"Ask BISHOP to Improve"}
                          </button>
                        )}
                      </div>
                      {productAnalysisError&&<div style={{fontSize:12,color:"#ff6a6a",marginTop:10}}>{productAnalysisError}</div>}
                      {chamberSaveError&&<div style={{fontSize:12,color:"#ff6a6a",marginTop:10}}>⚠ {chamberSaveError}</div>}
                    </div>
                  );
                })()}
              </>)}
            </div>
          </div>
        ):mode==="brand-brief"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"24px 16px 100px":"48px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:720}}>

              <div style={{marginBottom:28}}>
                <div style={{fontSize:11,letterSpacing:2,color:gold,textTransform:"uppercase",marginBottom:8}}>Brand · Guided Setup</div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?26:34,color:"#F8F7FF",textShadow:"0 0 30px rgba(201,169,97,.25)"}}>Brand Brief</div>
              </div>

              {/* Saved brands — quick switch, kept lightweight on step 1 only */}
              {briefStep===1&&(
                <div style={{marginBottom:28}}>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {brandProfiles.map(p=>(
                      <div key={p.id} onClick={()=>{switchToBrandProfile(p);setBriefStep(1);}}
                        style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${activeProfileId===p.id?gold:"rgba(255,255,255,.08)"}`,background:activeProfileId===p.id?`${gold}14`:"rgba(255,255,255,.03)",cursor:"pointer",fontSize:12.5,color:activeProfileId===p.id?gold:"#9BA0AC"}}>
                        {p.brand_name}
                      </div>
                    ))}
                    <div onClick={startNewBrandProfile}
                      style={{padding:"8px 14px",borderRadius:10,border:`1px dashed ${gold}44`,color:gold,cursor:"pointer",fontSize:12.5,fontWeight:600}}>
                      + New Brand
                    </div>
                  </div>
                </div>
              )}

              {briefStep!=="done"&&(<>
                {/* Progress — 5 holographic segments */}
                <div style={{marginBottom:32}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:11.5,color:"#9BA0AC"}}>Step {briefStep} of 5</span>
                    <span style={{fontSize:11.5,color:gold,fontWeight:600}}>{Math.round((briefStep/5)*100)}%</span>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    {[1,2,3,4,5].map(n=>(
                      <div key={n} style={{flex:1,height:5,borderRadius:4,background:n<=briefStep?`linear-gradient(90deg,${gold},#B8935A)`:"rgba(255,255,255,.08)",boxShadow:n<=briefStep?`0 0 10px ${gold}66`:"none",transition:"all .3s"}}/>
                    ))}
                  </div>
                </div>

                <div style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.09)",borderRadius:22,padding:isMobile?"22px 18px":"32px 30px",marginBottom:24}}>

                  {briefStep===1&&(<>
                    <div style={{fontSize:20,fontWeight:600,color:"#F5F4FF",marginBottom:4}}>Who are you?</div>
                    <div style={{fontSize:13,color:"#9591AC",marginBottom:24}}>The name and world your brand lives in.</div>
                    <div style={{display:"flex",flexDirection:"column",gap:18}}>
                      <div>
                        <div style={{fontSize:12.5,letterSpacing:1,color:gold,marginBottom:8,fontWeight:600}}>BRAND NAME *</div>
                        <input ref={brandInputRef} className="inp" placeholder="e.g. L' LEWCOR" value={brand} onChange={e=>setBrand(e.target.value)}/>
                      </div>
                      <div>
                        <div style={{fontSize:12.5,letterSpacing:1,color:gold,marginBottom:8,fontWeight:600}}>NICHE *</div>
                        <input className="inp" placeholder="e.g. Urban Streetwear" value={niche} onChange={e=>setNiche(e.target.value)}/>
                        <div style={{position:"relative",marginTop:8}}>
                          <button type="button" className="chip" onClick={()=>setNicheOpen(o=>!o)} style={{width:"100%",justifyContent:"space-between"}}>
                            <span style={{color:"#9BA0AC",fontSize:12.5}}>Browse niche presets</span>
                            <span style={{fontSize:10,color:gold,transform:nicheOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                          </button>
                          {nicheOpen&&(
                            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:40,background:"rgba(14,16,19,.97)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:7,maxHeight:240,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.65)"}}>
                              {NICHE_PRESETS.map(n=>(
                                <div key={n} onClick={()=>{setNiche(n);setNicheOpen(false);}}
                                  style={{padding:"9px 11px",borderRadius:9,cursor:"pointer",fontSize:12.5,color:niche===n?gold:"#F0F1F4",background:niche===n?`${gold}14`:"transparent"}}>
                                  {n}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>)}

                  {briefStep===2&&(<>
                    <div style={{fontSize:20,fontWeight:600,color:"#F5F4FF",marginBottom:4}}>Who do you serve?</div>
                    <div style={{fontSize:13,color:"#9591AC",marginBottom:24}}>The audience BISHOP writes every word for.</div>
                    <div>
                      <div style={{fontSize:12.5,letterSpacing:1,color:gold,marginBottom:8,fontWeight:600}}>TARGET AUDIENCE</div>
                      <input className="inp" placeholder="Urban males 18-35" value={audience} onChange={e=>setAudience(e.target.value)}/>
                    </div>
                  </>)}

                  {briefStep===3&&(<>
                    <div style={{fontSize:20,fontWeight:600,color:"#F5F4FF",marginBottom:4}}>How do you sound?</div>
                    <div style={{fontSize:13,color:"#9591AC",marginBottom:24}}>Pick up to 2 — this shapes BISHOP's voice in everything it writes.</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                      {TONES.map(t=>{
                        const locked=plan==="free"&&!t.free;
                        const selected=tone.includes(t.id);
                        return <div key={t.id} onClick={()=>{
                            if(locked){setUpgradeModal(`${t.label} tone`);return;}
                            setTone(prev=>{
                              if(prev.includes(t.id)) return prev.length>1?prev.filter(x=>x!==t.id):prev;
                              if(prev.length>=2) return [prev[1],t.id];
                              return [...prev,t.id];
                            });
                          }}
                          style={{padding:"9px 16px",border:`1px solid ${selected&&!locked?gold:"rgba(255,255,255,.1)"}`,background:selected&&!locked?`${gold}14`:"rgba(255,255,255,.03)",cursor:locked?"not-allowed":"pointer",color:selected&&!locked?gold:"#9BA0AC",fontSize:13.5,borderRadius:12,transition:"all .15s",opacity:locked?.45:1}}>
                          {t.label}{selected&&<span style={{marginLeft:6}}>✓</span>}{locked&&<span className="lock-icon">🔒</span>}
                        </div>;
                      })}
                    </div>
                  </>)}

                  {briefStep===4&&(<>
                    <div style={{fontSize:20,fontWeight:600,color:"#F5F4FF",marginBottom:4}}>What are you trying to achieve?</div>
                    <div style={{fontSize:13,color:"#9591AC",marginBottom:24}}>BISHOP's north star for this brand.</div>
                    <div>
                      <div style={{fontSize:12.5,letterSpacing:1,color:gold,marginBottom:8,fontWeight:600}}>CAMPAIGN GOAL</div>
                      <input className="inp" placeholder="Drive sales, Launch Drop 001" value={goal} onChange={e=>setGoal(e.target.value)}/>
                    </div>
                  </>)}

                  {briefStep===5&&(<>
                    <div style={{fontSize:20,fontWeight:600,color:"#F5F4FF",marginBottom:4}}>How will people find you?</div>
                    <div style={{fontSize:13,color:"#9591AC",marginBottom:24}}>Keywords BISHOP threads into SEO-facing content.</div>
                    <div>
                      <div style={{fontSize:12.5,letterSpacing:1,color:gold,marginBottom:8,fontWeight:600}}>SEO KEYWORDS</div>
                      <input className="inp" placeholder="urban streetwear, limited drop" value={keywords} onChange={e=>setKeywords(e.target.value)}/>
                    </div>
                  </>)}
                </div>

                <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
                  <button className="sm" disabled={briefStep===1} onClick={()=>setBriefStep(s=>Math.max(1,s-1))}
                    style={{opacity:briefStep===1?.3:1,padding:"11px 22px"}}>← Back</button>
                  {briefStep<5?(
                    <button className="gbtn" disabled={briefStep===1&&(!brand.trim()||!niche.trim())} onClick={()=>setBriefStep(s=>s+1)}
                      style={{width:"auto",padding:"11px 32px",background:`linear-gradient(115deg,${gold},#B8935A)`,color:"#0A0620"}}>Continue →</button>
                  ):(
                    <button className="gbtn" disabled={!brand.trim()||!niche.trim()}
                      onClick={async()=>{
                        if(activeProfileId){await updateActiveBrandProfile();}else{await saveNewBrandProfile();}
                        setBriefStep("done");
                      }}
                      style={{width:"auto",padding:"11px 32px",background:`linear-gradient(115deg,${gold},#B8935A)`,color:"#0A0620"}}>
                      {savingProfile?"Saving...":"Complete Brand Brief"}
                    </button>
                  )}
                </div>
                {profileError&&<div style={{fontSize:12,color:"#ff6a6a",marginTop:10}}>{profileError}</div>}
              </>)}

              {/* ── Completion payoff ── */}
              {briefStep==="done"&&(()=>{
                const checks=[
                  {label:"Identity",ok:!!(brand.trim()&&niche.trim())},
                  {label:"Audience",ok:!!audience.trim()},
                  {label:"Voice",ok:tone&&tone.length>0},
                  {label:"Positioning",ok:!!goal.trim()},
                  {label:"Goals",ok:!!keywords.trim()},
                ];
                const pct=Math.round((checks.filter(c=>c.ok).length/checks.length)*100);
                return(
                  <div style={{textAlign:"center",padding:isMobile?"20px 10px":"20px"}}>
                    <div style={{position:"relative",width:110,height:110,margin:"0 auto 20px",animation:"bishopFloat 3s ease-in-out infinite"}}>
                      <div style={{position:"absolute",inset:-20,borderRadius:"50%",background:`radial-gradient(circle,${gold}33,transparent 70%)`,filter:"blur(8px)"}}/>
                      <img src="/bishop-mascot.png" alt="BISHOP" style={{position:"relative",width:110,height:110,objectFit:"contain",filter:`drop-shadow(0 0 24px ${gold}66)`}}/>
                    </div>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?24:30,color:"#F8F7FF",marginBottom:6}}>BISHOP understands your brand</div>
                    <div style={{fontSize:34,fontWeight:700,color:pct===100?"#4ADE80":gold,fontFamily:"'Fraunces',serif",marginBottom:20}}>{pct}%</div>
                    <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap",marginBottom:28}}>
                      {checks.map(c=>(
                        <div key={c.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}>
                          <span style={{color:c.ok?"#4ADE80":"#4a4d54"}}>{c.ok?"✓":"○"}</span>
                          <span style={{color:c.ok?"#D5D7DB":"#6B7280"}}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                      <button className="gbtn" onClick={()=>{handleModeSwitch("products");setActiveWorkspace("products");}}
                        style={{width:"auto",padding:"13px 28px",background:"linear-gradient(115deg,#FF9D4D,#FF5F6D)",color:"#0A0620"}}>
                        Add Your First Product →
                      </button>
                      <button className="sm" onClick={()=>setBriefStep(1)} style={{padding:"13px 22px"}}>Edit Brand Brief</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ):mode==="home"?(
          <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:isMobile?"28px 16px 100px":"56px 40px",minHeight:0}}>
            <div style={{width:"100%",maxWidth:1100}}>

              {/* Greeting */}
              <div style={{marginBottom:36,position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}>
                <div style={{position:"absolute",top:-60,left:-40,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,90,255,.22),transparent 70%)",filter:"blur(10px)",pointerEvents:"none"}}/>
                <div style={{position:"absolute",top:-30,left:180,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,200,255,.18),transparent 70%)",filter:"blur(8px)",pointerEvents:"none"}}/>
                <div style={{position:"relative",flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:"#9B9FB0",marginBottom:8}}>{(()=>{const h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening";})()}</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?30:44,color:"#F8F7FF",lineHeight:1.15,textShadow:"0 0 40px rgba(124,90,255,.3)"}}>
                    {brand?`${brand} is loaded.`:"What are we building today?"}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:14}}>
                    <div style={{position:"relative",width:7,height:7}}>
                      <div className="pulse-ring" style={{inset:0,width:7,height:7,color:"#4ADE80"}}/>
                      <div style={{position:"relative",width:7,height:7,borderRadius:"50%",background:"#4ADE80",boxShadow:"0 0 10px #4ADE80"}}/>
                    </div>
                    <span style={{fontSize:12.5,color:"#9BA0AC"}}>BISHOP CORE ONLINE</span>
                  </div>
                </div>
                {!isMobile&&(
                  <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                    <div style={{position:"relative",width:100,height:100,animation:"bishopFloat 4s ease-in-out infinite"}}>
                      <div style={{position:"absolute",inset:-16,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,229,255,.22),transparent 70%)",filter:"blur(6px)"}}/>
                      <img ref={bishopMascotRef} src="/bishop-mascot.png" alt="BISHOP" style={{position:"relative",width:100,height:100,objectFit:"contain",filter:"drop-shadow(0 10px 22px rgba(0,0,0,.4))",transition:"transform .35s cubic-bezier(.2,.8,.2,1)",willChange:"transform"}}/>
                    </div>
                    <BishopCoreOrb size={170}/>
                  </div>
                )}
              </div>

              {/* 5 large portal cards — glassmorphic gradient-edge tiles, LEWCOR digital-futures treatment */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:14,marginBottom:32}}>
                {[
                  {id:"brand",label:"Brand",sub:"Teach BISHOP your business",mode:"brand-hq",grad:"linear-gradient(115deg,#F0C468,#C9A961,#F0C468)",icon:"◆"},
                  {id:"products",label:"Products",sub:"Manage what you sell",mode:"products",grad:"linear-gradient(115deg,#FF9D4D,#FF5F6D,#FF9D4D)",icon:"▣"},
                  {id:"create",label:"Create",sub:"Copy · Images · Video · A/B",mode:"copy",grad:"linear-gradient(115deg,#4DE8FF,#7C5AFF,#4DE8FF)",icon:"▶"},
                  {id:"campaigns",label:"Campaigns",sub:"Plan · Schedule · Publish",mode:"campaign",grad:"linear-gradient(115deg,#9D7CFF,#4D5FFF,#9D7CFF)",icon:"⬡"},
                  {id:"intelligence",label:"Intelligence",sub:"Performance · AI Viz",mode:"visibility",grad:"linear-gradient(115deg,#4DFFB8,#00D4FF,#4DFFB8)",icon:"◉"},
                ].map(p=>(
                  <div key={p.id} onClick={()=>{handleModeSwitch(p.mode);setActiveWorkspace(p.id);}} className="grad-shimmer"
                    style={{padding:1.4,borderRadius:22,backgroundImage:p.grad,cursor:"pointer",transition:"opacity .25s ease, transform .25s ease, filter .25s ease",opacity:.75}}
                    onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(-4px) scale(1.015)";e.currentTarget.style.filter="drop-shadow(0 16px 36px rgba(124,90,255,.35))";}}
                    onMouseLeave={e=>{e.currentTarget.style.opacity=".75";e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.filter="none";}}>
                    <div style={{position:"relative",background:"linear-gradient(165deg,#100B26,#0A0620)",borderRadius:21,padding:"22px 18px",minHeight:138,display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden",height:"100%"}}>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(255,255,255,.08),transparent 45%)",pointerEvents:"none"}}/>
                      <div style={{position:"absolute",top:-26,right:-26,width:80,height:80,borderRadius:"50%",background:p.grad,opacity:.16,filter:"blur(8px)"}}/>
                      <div style={{width:38,height:38,borderRadius:12,background:p.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:"#0A0620",fontWeight:700,boxShadow:"0 4px 14px rgba(0,0,0,.35), inset 0 1px 2px rgba(255,255,255,.4)",position:"relative"}}>{p.icon}</div>
                      <div style={{position:"relative"}}>
                        <div style={{fontSize:16,fontWeight:600,color:"#F5F4FF"}}>{p.label}</div>
                        <div style={{fontSize:12,color:"#9591AC",marginTop:6,lineHeight:1.5}}>{p.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick status — only real, known data, per the brief's own "never fake" rule */}
              <div style={{fontSize:11,letterSpacing:1,color:"#565A64",textTransform:"uppercase",marginBottom:12}}>Quick Status</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
                {[
                  {label:"BISHOP Status",value:running?"Generating":"Online",color:running?gold:"#00ff88",dot:true},
                  {label:"Active Brand",value:brand||"Not set",color:brand?gold:"#565A64"},
                  {label:"Saved Brands",value:String(brandProfiles.length),color:brandProfiles.length?gold:"#565A64"},
                  {label:"Generations",value:`${gensUsed}/${genLimit===Infinity?"∞":genLimit}`,color:"#00e5ff"},
                  {label:"Active Campaigns",value:String(campaignsList.length),color:campaignsList.length?"#7c83fd":"#565A64"},
                  {label:"AI Visibility",value:vizResult?`${vizResult.score}/100`:"Not scanned yet",color:vizResult?(vizResult.score>=70?"#00ff88":vizResult.score>=40?"#f0b429":"#ff6a6a"):"#565A64"},
                  {label:"Social Connected",value:postizStatus.connected?`${postizStatus.integrations?.length||0} account(s)`:"Not connected",color:postizStatus.connected?"#00ff88":"#565A64"},
                  {label:"Next Move",value:!brand||!niche?"Complete Brand Brief":!productDesc.trim()?"Add Product Info":!postizStatus.connected?"Connect Social Accounts":"Create Content",color:gold},
                ].map(s=>(
                  <div key={s.label} style={{background:"linear-gradient(165deg,rgba(124,90,255,.06),rgba(0,180,255,.04))",backdropFilter:"blur(16px)",border:`1px solid ${s.color}2e`,borderRadius:16,padding:"14px 16px",boxShadow:`0 0 24px ${s.color}0a`}}>
                    <div style={{fontSize:10.5,color:"#8B8FA3",marginBottom:5}}>{s.label}</div>
                    <div style={{fontSize:15,fontWeight:600,color:s.color,display:"flex",alignItems:"center",gap:7}}>
                      {s.dot&&<span style={{width:6,height:6,borderRadius:"50%",background:s.color,boxShadow:`0 0 8px ${s.color}`,flexShrink:0}}/>}
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ):(<>
        {/* LEFT CONFIG */}
        <div style={{
          width:isMobile?"100%":370,
          maxWidth:isMobile?"100%":"35vw",
          borderRight:isMobile?"none":"1px solid #24272E",
          overflowY:"auto",
          padding:isMobile?"16px 14px 80px":"24px 20px",
          background:"#08090B",
          display:isMobile?(mobileTab==="config"?"flex":"none"):"flex",
          flexDirection:"column",
          gap:isMobile?20:28,
          flexShrink:0,
          minHeight:0,
          flex:isMobile?1:"unset",
        }}>

          {mode==="copy"&&(
            <div style={{background:"rgba(0,255,136,.04)",border:"1px solid #00ff8833",borderRadius:14,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setLearnOpen(o=>!o)}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#00ff88"}}>◆ No website? Let BISHOP learn your brand</div>
                  <div style={{fontSize:10.5,color:"#82858C",marginTop:2}}>Paste a description, upload a photo, or pull from Instagram</div>
                </div>
                <span style={{fontSize:11,color:"#00ff88",transform:learnOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>

              {learnOpen&&(
                <div style={{marginTop:14}}>
                  <div style={{display:"flex",gap:6,marginBottom:12}}>
                    {[{id:"text",label:"Paste"},{id:"photo",label:"Photo"},{id:"instagram",label:"Instagram"}].map(t=>(
                      <button key={t.id} onClick={()=>{setLearnMode(t.id);setLearnSuggestion(null);setLearnError("");}}
                        style={{flex:1,padding:"7px 0",fontSize:11,fontWeight:700,borderRadius:8,border:`1px solid ${learnMode===t.id?"#00ff8855":"#24272E"}`,background:learnMode===t.id?"#00ff8812":"transparent",color:learnMode===t.id?"#00ff88":"#82858C",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {learnMode==="text"&&(<>
                    <textarea className="inp" rows={4} placeholder="Tell BISHOP about your brand — what you sell, who it's for, how you talk about it..." value={learnText} onChange={e=>setLearnText(e.target.value)} style={{marginBottom:10,resize:"vertical"}}/>
                    <button className="sm" disabled={!learnText.trim()||learnAnalyzing} onClick={analyzeBrandFromText} style={{borderColor:"#00ff8855",color:"#00ff88",width:"100%",padding:"9px 0"}}>
                      {learnAnalyzing?"⟳ READING...":"◆ LEARN MY BRAND"}
                    </button>
                  </>)}

                  {learnMode==="photo"&&(<>
                    {!learnImage?(
                      <label style={{display:"block",border:"1.5px dashed #24272E",borderRadius:10,padding:"18px 12px",textAlign:"center",cursor:"pointer",marginBottom:10}}>
                        <div style={{fontSize:11.5,color:"#82858C"}}>Tap to upload a product photo, flyer, or storefront shot</div>
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])handleLearnImageFile(e.target.files[0]);}}/>
                      </label>
                    ):(
                      <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",position:"relative"}}>
                        <img src={learnImage.url} alt="" style={{width:"100%",maxHeight:120,objectFit:"cover",display:"block"}}/>
                        <button onClick={()=>setLearnImage(null)} style={{position:"absolute",top:6,right:6,background:"#ff2d2d",border:"none",color:"#fff",width:22,height:22,borderRadius:"50%",cursor:"pointer"}}>✕</button>
                      </div>
                    )}
                    <button className="sm" disabled={!learnImage||learnAnalyzing} onClick={analyzeBrandFromPhoto} style={{borderColor:"#00ff8855",color:"#00ff88",width:"100%",padding:"9px 0"}}>
                      {learnAnalyzing?"⟳ READING...":"◆ LEARN MY BRAND"}
                    </button>
                  </>)}

                  {learnMode==="instagram"&&(<>
                    <div style={{fontSize:11,color:"#82858C",lineHeight:1.6,marginBottom:10}}>
                      {postizStatus.connected?"BISHOP will read your real recent captions to learn your voice.":"Connect Instagram via Postiz in Account first, then come back here."}
                    </div>
                    <button className="sm" disabled={!postizStatus.connected||learnAnalyzing} onClick={analyzeBrandFromInstagram} style={{borderColor:"#00ff8855",color:"#00ff88",width:"100%",padding:"9px 0",opacity:postizStatus.connected?1:.5}}>
                      {learnAnalyzing?"⟳ READING YOUR POSTS...":"◆ LEARN FROM MY INSTAGRAM"}
                    </button>
                  </>)}

                  {learnError&&<div style={{fontSize:11,color:"#ff6a6a",marginTop:10,lineHeight:1.5}}>{learnError}</div>}

                  {learnSuggestion&&(
                    <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #00ff8822"}}>
                      <div style={{fontSize:12.5,color:"#F0F1F4",lineHeight:1.6,marginBottom:10,fontStyle:"italic"}}>"{learnSuggestion.voiceSummary}"</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                        <div style={{background:"rgba(255,255,255,.02)",borderRadius:8,padding:"7px 9px"}}><div style={{fontSize:8.5,color:"#565A64",textTransform:"uppercase"}}>Brand</div><div style={{fontSize:11.5,color:"#F0F1F4"}}>{learnSuggestion.brandName||"—"}</div></div>
                        <div style={{background:"rgba(255,255,255,.02)",borderRadius:8,padding:"7px 9px"}}><div style={{fontSize:8.5,color:"#565A64",textTransform:"uppercase"}}>Niche</div><div style={{fontSize:11.5,color:"#F0F1F4"}}>{learnSuggestion.niche||"—"}</div></div>
                        <div style={{background:"rgba(255,255,255,.02)",borderRadius:8,padding:"7px 9px"}}><div style={{fontSize:8.5,color:"#565A64",textTransform:"uppercase"}}>Audience</div><div style={{fontSize:11.5,color:"#F0F1F4"}}>{learnSuggestion.audience||"—"}</div></div>
                        <div style={{background:"rgba(255,255,255,.02)",borderRadius:8,padding:"7px 9px"}}><div style={{fontSize:8.5,color:"#565A64",textTransform:"uppercase"}}>Tone</div><div style={{fontSize:11.5,color:"#F0F1F4"}}>{(learnSuggestion.tones||[]).map(t=>TONES.find(x=>x.id===t)?.label).filter(Boolean).join(" + ")||"—"}</div></div>
                      </div>
                      <button className="gbtn" onClick={applyLearnSuggestion} style={{background:"linear-gradient(135deg,#00ff88,#00b894)",color:"#000",padding:"10px 0",fontSize:12}}>◆ APPLY TO BRAND BRIEF</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="sl" style={{color:mc}}>Brand</div>
            {brand&&niche?(
              <div onClick={()=>{handleModeSwitch("brand-brief");setActiveWorkspace("brand");}}
                style={{background:"rgba(255,255,255,.025)",border:`1px solid ${mc}33`,borderRadius:12,padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#F5F6F8"}}>{brand}</div>
                  <div style={{fontSize:12,color:"#82858C",marginTop:2}}>{niche}</div>
                </div>
                <span style={{fontSize:11,color:mc,letterSpacing:1}}>EDIT →</span>
              </div>
            ):(
              <div onClick={()=>{handleModeSwitch("brand-brief");setActiveWorkspace("brand");}}
                style={{background:"rgba(255,255,255,.025)",border:`1px dashed ${mc}55`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:13,color:mc,fontWeight:700}}>◆ SET UP BRAND BRIEF</div>
                <div style={{fontSize:11,color:"#82858C",marginTop:4}}>Required before BISHOP can generate</div>
              </div>
            )}
          </div>

          {/* ── PRODUCT INTEL ── */}
          <div>
            <div className="sl" style={{color:mc}}>02 — Product Intel</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>

              <div><div style={{fontSize:13,letterSpacing:2,color:mc,opacity:.85,marginBottom:8,fontWeight:700}}>PRODUCT NAME</div>
                <input className="inp" placeholder="e.g. Urban Roots Tee Drop 001" value={productName} onChange={e=>setProductName(e.target.value)}/></div>

              <div>
                <div style={{fontSize:13,letterSpacing:2,color:mc,opacity:.85,marginBottom:8,fontWeight:700}}>PRODUCT TYPE</div>
                <div style={{position:"relative",marginBottom:10}}>
                  <button type="button" className="chip" onClick={()=>{setProductTypeOpen(o=>!o);setNicheOpen(false);}}
                    style={{width:"100%",justifyContent:"space-between",padding:"11px 14px"}}>
                    <span style={{color:productType?mc:"#9BA0AC"}}>{productType||"Browse product types"}</span>
                    <span style={{fontSize:10,color:mc,transform:productTypeOpen?"rotate(180deg)":"none",transition:"transform .2s",display:"inline-block"}}>▾</span>
                  </button>
                  {productTypeOpen&&(
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:40,background:"rgba(14,16,19,.97)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:7,maxHeight:260,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.65)"}}>
                      {PRODUCT_TYPES.map(t=>(
                        <div key={t} onClick={()=>{setProductType(productType===t?"":t);setProductTypeOpen(false);}}
                          style={{padding:"10px 12px",borderRadius:9,cursor:"pointer",fontSize:12.5,color:productType===t?mc:"#F0F1F4",background:productType===t?`${mc}14`:"transparent",transition:"background .12s"}}
                          onMouseEnter={e=>{if(productType!==t)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                          onMouseLeave={e=>{if(productType!==t)e.currentTarget.style.background="transparent";}}>
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input className="inp" placeholder="Or type your own product type..." value={productType} onChange={e=>setProductType(e.target.value)}/>
              </div>

              <div>
                <div style={{fontSize:13,letterSpacing:2,color:mc,opacity:.85,marginBottom:8,fontWeight:700}}>PRODUCT DESCRIPTION *</div>
                <textarea className="inp"
                  placeholder={`Describe what makes your product unique.\n\nExamples:\n- Materials, features, quality\n- The story behind it\n- What problem it solves\n- Why someone would want it\n- Limited edition / drop details`}
                  value={productDesc}
                  onChange={e=>setProductDesc(e.target.value)}
                  style={{resize:"vertical",minHeight:110,lineHeight:1.7}}/>
                <div style={{fontSize:10,color:"#45484F",marginTop:4,letterSpacing:.5}}>
                  {productDesc.length}/500 — {productDesc.length<30?"Add more detail for better results":productDesc.length<100?"Good — more detail = better AI output":"✓ Great detail — AI will nail this"}
                </div>
              </div>

              <div><div style={{fontSize:13,letterSpacing:2,color:mc,opacity:.85,marginBottom:8,fontWeight:700}}>PRICE / VALUE PROP</div>
                <input className="inp" placeholder="e.g. $89 · Limited to 50 units" value={productPrice} onChange={e=>setProductPrice(e.target.value)}/></div>

              {/* Smart preview */}
              {(productName||productType||productDesc)&&(
                <div style={{background:"#15181D",border:`1px solid ${mc}22`,borderLeft:`2px solid ${mc}`,padding:"14px 16px",marginTop:2}}>
                  <div style={{fontSize:10,letterSpacing:3,color:mc,textTransform:"uppercase",marginBottom:6}}>AI will use this intel</div>
                  {productName&&<div style={{fontSize:12,color:"#bccfe0",marginBottom:2}}>📦 {productName}</div>}
                  {productType&&<div style={{fontSize:12,color:"#9BA0AC",marginBottom:2}}>🏷 {productType}</div>}
                  {productPrice&&<div style={{fontSize:12,color:"#9BA0AC",marginBottom:2}}>💰 {productPrice}</div>}
                  {productDesc&&<div style={{fontSize:11,color:"#82858C",lineHeight:1.6,marginTop:4}}>{productDesc.slice(0,100)}{productDesc.length>100?"...":""}</div>}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sl" style={{color:mc}}>03 — Platform</div>
            <div style={{position:"relative"}}>
              <button type="button" className="chip" onClick={()=>{setPlatformOpen(o=>!o);setNicheOpen(false);setProductTypeOpen(false);setContentTypeOpen(false);}}
                style={{width:"100%",justifyContent:"space-between",padding:"11px 14px"}}>
                <span>{platform?<><span style={{opacity:.5,marginRight:6}}>{PLATFORMS.find(p=>p.id===platform)?.icon}</span>{PLATFORMS.find(p=>p.id===platform)?.label}</>:<span style={{color:"#9BA0AC"}}>Select platform</span>}</span>
                <span style={{fontSize:10,color:mc,transform:platformOpen?"rotate(180deg)":"none",transition:"transform .2s",display:"inline-block"}}>▾</span>
              </button>
              {platformOpen&&(
                <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:40,background:"rgba(14,16,19,.97)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:7,maxHeight:280,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.65)"}}>
                  {PLATFORMS.map(p=>{
                    const locked=plan==="free"&&!p.free;
                    return (
                      <div key={p.id} onClick={()=>{if(locked){setUpgradeModal(`${p.label} platform`);}else{setPlatform(p.id);}setPlatformOpen(false);}}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:9,cursor:"pointer",fontSize:13,color:locked?"#565A64":platform===p.id?mc:"#F0F1F4",background:platform===p.id&&!locked?`${mc}14`:"transparent",opacity:locked?.55:1,transition:"background .12s"}}
                        onMouseEnter={e=>{if(platform!==p.id&&!locked)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=platform===p.id&&!locked?`${mc}14`:"transparent";}}>
                        <span><span style={{opacity:.5,marginRight:8}}>{p.icon}</span>{p.label}</span>
                        {locked&&<span className="lock-icon">🔒</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {(mode==="copy"||mode==="ab")&&(
            <div>
              <div className="sl" style={{color:mc}}>04 — Content Type</div>
              <div style={{position:"relative"}}>
                <button type="button" className="chip" onClick={()=>{setContentTypeOpen(o=>!o);setNicheOpen(false);setProductTypeOpen(false);setPlatformOpen(false);}}
                  style={{width:"100%",justifyContent:"space-between",padding:"11px 14px"}}>
                  <span style={{color:contentType?mc:"#9BA0AC"}}>{CONTENT_TYPES.find(c=>c.id===contentType)?.label||"Select content type"}</span>
                  <span style={{fontSize:10,color:mc,transform:contentTypeOpen?"rotate(180deg)":"none",transition:"transform .2s",display:"inline-block"}}>▾</span>
                </button>
                {contentTypeOpen&&(
                  <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:40,background:"rgba(14,16,19,.97)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:7,maxHeight:320,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.65)"}}>
                    {CONTENT_TYPES.map(ct=>{
                      const locked=plan==="free"&&!ct.free;
                      return (
                        <div key={ct.id} onClick={()=>{if(locked){setUpgradeModal(`${ct.label} content`);}else{setContentType(ct.id);}setContentTypeOpen(false);}}
                          style={{padding:"10px 12px",borderRadius:9,cursor:"pointer",background:contentType===ct.id&&!locked?`${mc}14`:"transparent",opacity:locked?.55:1,transition:"background .12s"}}
                          onMouseEnter={e=>{if(contentType!==ct.id&&!locked)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=contentType===ct.id&&!locked?`${mc}14`:"transparent";}}>
                          <div style={{fontSize:13,color:contentType===ct.id&&!locked?mc:"#F0F1F4",display:"flex",justifyContent:"space-between"}}>
                            {ct.label}{locked&&<span className="lock-icon">🔒</span>}
                          </div>
                          <div style={{fontSize:10.5,color:"#565A64",marginTop:1}}>{ct.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode==="image"&&(
            <div>
              <div style={{display:"flex",gap:4,marginBottom:16}}>
                <button onClick={()=>setImageFlow("generate")} style={{flex:1,padding:"10px 0",border:`1px solid ${imageFlow==="generate"?"#ff7c00":"#24272E"}`,background:imageFlow==="generate"?"#ff7c0012":"#111c2e",color:imageFlow==="generate"?"#ff7c00":"#82858C",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",transition:"all .2s"}}>
                  ⬡ Generate
                </button>
                <button onClick={()=>setImageFlow("amplify")} style={{flex:1,padding:"10px 0",border:`1px solid ${imageFlow==="amplify"?"#00e5ff":"#24272E"}`,background:imageFlow==="amplify"?"#00e5ff12":"#111c2e",color:imageFlow==="amplify"?"#00e5ff":"#82858C",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",transition:"all .2s"}}>
                  ◈ Upload & Amplify
                </button>
              </div>

              {imageFlow==="generate"&&(<>
                <div className="sl" style={{color:"#ff7c00"}}>Image Subject</div>
                <div style={{position:"relative",marginBottom:14}}>
                  <button type="button" className="chip" onClick={()=>setImageTypeOpen(o=>!o)}
                    style={{width:"100%",justifyContent:"space-between",padding:"11px 14px",borderColor:imageType?"#ff7c0055":undefined}}>
                    <span style={{color:imageType?"#ff7c00":"#9BA0AC"}}>{IMAGE_TYPES.find(c=>c.id===imageType)?.label||"Select image subject"}</span>
                    <span style={{fontSize:10,color:"#ff7c00",transform:imageTypeOpen?"rotate(180deg)":"none",transition:"transform .2s",display:"inline-block"}}>▾</span>
                  </button>
                  {imageTypeOpen&&(
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:40,background:"rgba(14,16,19,.97)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:7,maxHeight:280,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.65)"}}>
                      {IMAGE_TYPES.map(it=>(
                        <div key={it.id} onClick={()=>{setImageType(it.id);setImageTypeOpen(false);}}
                          style={{padding:"10px 12px",borderRadius:9,cursor:"pointer",background:imageType===it.id?"#ff7c0014":"transparent",transition:"background .12s"}}
                          onMouseEnter={e=>{if(imageType!==it.id)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=imageType===it.id?"#ff7c0014":"transparent";}}>
                          <div style={{fontSize:13,color:imageType===it.id?"#ff7c00":"#F0F1F4"}}>{it.label}</div>
                          <div style={{fontSize:10.5,color:"#565A64",marginTop:1}}>{it.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sl" style={{color:"#ff7c00"}}>Prompt Target Tool</div>
                <div style={{fontSize:11,color:"#565A64",marginBottom:6,lineHeight:1.6}}>Claude formats prompts for this tool. Nothing auto-runs — you paste the result.</div>
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
                {(!brand||!niche)&&<div style={{fontSize:11,color:"#45484F",textAlign:"center",marginTop:4}}>Brand + Niche required</div>}
              </>)}

              {imageFlow==="amplify"&&(<>
                {/* Upload Zone */}
                {!uploadedImage?(
                  <div style={{marginBottom:20}}>
                    <div style={{border:"2px dashed #2A2D33",background:"#0E1013",padding:"28px 16px",textAlign:"center",borderRadius:12,marginBottom:10}}>
                      <div style={{fontSize:40,marginBottom:10}}>🖼️</div>
                      <div style={{fontSize:16,color:"#F0F1F4",fontWeight:700,marginBottom:6}}>Upload Your Image</div>
                      <div style={{fontSize:13,color:"#82858C",marginBottom:16}}>JPG · PNG · WEBP · GIF</div>
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
                          fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",
                          letterSpacing:2,
                        }}
                      />
                    </div>
                    {activeProfileId&&vaultAssets.filter(a=>a.category==="product"||a.category==="logo").length>0&&(
                      <button onClick={()=>setVaultPickerOpen(true)}
                        style={{width:"100%",padding:"10px 0",borderRadius:8,border:"1px dashed #00e5ff55",background:"transparent",color:"#00e5ff",fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}>
                        📁 SELECT FROM {brand.toUpperCase()} VAULT
                      </button>
                    )}
                  </div>
                ):(
                  <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",border:"2px solid #00e5ff44",position:"relative"}}>
                    <img src={uploadedImage.url} alt="upload" style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,#08090Bee,transparent)"}}/>
                    <div style={{position:"absolute",bottom:10,left:12,right:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:"#00e5ff",letterSpacing:1,marginBottom:2}}>✓ IMAGE UPLOADED</div>
                        <div style={{fontSize:12,color:"#F0F1F4",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedImage.name}</div>
                        <div style={{fontSize:10,color:uploadedImage.uploading?"#f0b429":uploadedImage.storageUrl?"#5ce88a":"#ff6a6a",marginTop:2}}>{uploadedImage.uploading?"☁ Saving to cloud...":uploadedImage.storageUrl?"☁ Saved":"☁ Save failed — using local copy"}</div>
                        <div style={{fontSize:10,color:uploadedImage.resizing?"#f0b429":uploadedImage.base64?"#5ce88a":"#ff6a6a",marginTop:2}}>{uploadedImage.resizing?"🖼 Optimizing for BISHOP...":uploadedImage.base64?"🖼 Ready for analysis":"🖼 Optimization failed"}</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();setUploadedImage(null);}} style={{background:"#ff2d2d",border:"none",color:"#fff",fontSize:14,width:24,height:24,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                    </div>
                  </div>
                )}

                {/* Content Type Tiles */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <span>Choose What to Generate</span>
                  <div style={{flex:1,height:1,background:"#1a1d24"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:8,marginBottom:18}}>
                  {[
                    {id:"viral_hooks",emoji:"🔥",label:"Viral Hooks",desc:"10 scroll-stoppers"},
                    {id:"seo_suite",emoji:"🔍",label:"SEO Suite",desc:"Title, keywords, alt text"},
                    {id:"trending_strategy",emoji:"📈",label:"Trending",desc:"Algorithm + viral plan"},
                    {id:"caption_pack",emoji:"✍",label:"Captions",desc:"4 styles + hashtags"},
                    {id:"ad_copy",emoji:"💰",label:"Ad Copy",desc:"FB · TikTok · Google"},
                    {id:"convert_score",emoji:"🎯",label:"CONVERT SCORE",desc:"Will they buy or scroll?"},
                  ].map(a=>(
                    <div key={a.id} onClick={()=>setAmplifyType(a.id)}
                      style={{padding:"12px 10px",border:`1.5px solid ${amplifyType===a.id?"#00e5ff":"#1a1d24"}`,background:amplifyType===a.id?"rgba(0,229,255,.08)":"#0E1013",cursor:"pointer",borderRadius:8,textAlign:"center",transition:"all .15s",position:"relative"}}>
                      {amplifyType===a.id&&<div style={{position:"absolute",top:6,right:6,width:6,height:6,borderRadius:"50%",background:"#00e5ff"}}/>}
                      <div style={{fontSize:22,marginBottom:5}}>{a.emoji}</div>
                      <div style={{fontSize:13,color:amplifyType===a.id?"#00e5ff":"#F0F1F4",fontWeight:500,marginBottom:2}}>{a.label}</div>
                      <div style={{fontSize:11,color:"#6B6F7A",lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  ))}
                </div>

                {/* AI Brain */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <span>AI Brain</span><div style={{flex:1,height:1,background:"#1a1d24"}}/>
                </div>
                {renderBrainPicker("#00e5ff")}

                {/* Generate Button */}
                <button className="gbtn" disabled={!uploadedImage||uploadedImage?.resizing||!uploadedImage?.base64||running||!brand||!niche} onClick={amplifyGenerate}
                  style={{background:uploadedImage&&brand&&niche?"linear-gradient(135deg,#00e5ff,#0055ff)":"#1a1d24",color:uploadedImage&&brand&&niche?"#000":"#45484F",marginTop:4,fontSize:15,padding:"15px 0",letterSpacing:3}}>
                  {running?"⟳  GENERATING...":`◈  ${AI_BRAINS.find(b=>b.id===aiBrain)?.label||"AI"} GENERATE`}
                </button>
                {!brand||!niche?<div style={{textAlign:"center",fontSize:12,color:"#45484F",marginTop:6}}>↑ Add Brand + Niche in Section 01</div>
                :!uploadedImage?<div style={{textAlign:"center",fontSize:12,color:"#45484F",marginTop:6}}>↑ Upload an image above to begin</div>:null}
              </>)}
            </div>
          )}

          {mode==="video"&&(
            <div>
              <div style={{display:"flex",gap:4,marginBottom:16}}>
                <button onClick={()=>setVideoFlow("generate")} style={{flex:1,padding:"10px 0",border:`1px solid ${videoFlow==="generate"?"#f0b429":"#24272E"}`,background:videoFlow==="generate"?"#f0b42912":"#111c2e",color:videoFlow==="generate"?"#f0b429":"#82858C",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",transition:"all .2s"}}>
                  ▷ Generate Script
                </button>
                <button onClick={()=>setVideoFlow("amplify")} style={{flex:1,padding:"10px 0",border:`1px solid ${videoFlow==="amplify"?"#00e5ff":"#24272E"}`,background:videoFlow==="amplify"?"#00e5ff12":"#111c2e",color:videoFlow==="amplify"?"#00e5ff":"#82858C",fontSize:12,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",transition:"all .2s"}}>
                  ◈ Upload & Amplify
                </button>
              </div>

              {videoFlow==="generate"&&(<>
                <div className="sl" style={{color:"#f0b429"}}>Video Ad Format</div>
                <div style={{position:"relative",marginBottom:14}}>
                  <button type="button" className="chip" onClick={()=>setVideoTypeOpen(o=>!o)}
                    style={{width:"100%",justifyContent:"space-between",padding:"11px 14px",borderColor:videoAdType?"#f0b42955":undefined}}>
                    <span style={{color:videoAdType?"#f0b429":"#9BA0AC"}}>{VIDEO_AD_TYPES.find(c=>c.id===videoAdType)?.label||"Select video ad format"}</span>
                    <span style={{fontSize:10,color:"#f0b429",transform:videoTypeOpen?"rotate(180deg)":"none",transition:"transform .2s",display:"inline-block"}}>▾</span>
                  </button>
                  {videoTypeOpen&&(
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:40,background:"rgba(14,16,19,.97)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:7,maxHeight:280,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.65)"}}>
                      {VIDEO_AD_TYPES.map(vt=>(
                        <div key={vt.id} onClick={()=>{setVideoAdType(vt.id);setVideoTypeOpen(false);}}
                          style={{padding:"10px 12px",borderRadius:9,cursor:"pointer",background:videoAdType===vt.id?"#f0b42914":"transparent",transition:"background .12s"}}
                          onMouseEnter={e=>{if(videoAdType!==vt.id)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=videoAdType===vt.id?"#f0b42914":"transparent";}}>
                          <div style={{fontSize:13,color:videoAdType===vt.id?"#f0b429":"#F0F1F4"}}>{vt.label}</div>
                          <div style={{fontSize:10.5,color:"#565A64",marginTop:1}}>{vt.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sl" style={{color:"#f0b429"}}>Prompt Target Tool</div>
                <div style={{fontSize:11,color:"#565A64",marginBottom:6,lineHeight:1.6}}>Claude writes the script for this tool. Nothing auto-runs.</div>
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
                {(!brand||!niche)&&<div style={{fontSize:11,color:"#45484F",textAlign:"center",marginTop:4}}>Brand + Niche required</div>}
              </>)}

              {videoFlow==="amplify"&&(<>
                {/* Upload Zone */}
                {!uploadedVideo?(
                  <div style={{marginBottom:20}}>
                    <div style={{border:"2px dashed #2A2D33",background:"#0E1013",padding:"28px 16px",textAlign:"center",borderRadius:12,marginBottom:10}}>
                      <div style={{fontSize:40,marginBottom:10}}>🎬</div>
                      <div style={{fontSize:16,color:"#F0F1F4",fontWeight:700,marginBottom:6}}>Upload Your Video</div>
                      <div style={{fontSize:13,color:"#82858C",marginBottom:16}}>MP4 · MOV · WEBM · AVI</div>
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
                          fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",
                          letterSpacing:2,
                        }}
                      />
                    </div>
                  </div>
                ):(
                  <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",border:"2px solid #00e5ff44"}}>
                    <video src={uploadedVideo.url} style={{width:"100%",maxHeight:150,display:"block",objectFit:"cover"}} muted playsInline preload="metadata"/>
                    <div style={{padding:"14px 16px",background:"#0E1013",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:"#00e5ff",letterSpacing:1,marginBottom:2}}>✓ VIDEO UPLOADED</div>
                        <div style={{fontSize:12,color:"#F0F1F4",maxWidth:190,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedVideo.name}</div>
                        <div style={{fontSize:11,color:"#6B6F7A",marginTop:1}}>{uploadedVideo.size} MB</div>
                        <div style={{fontSize:10,color:uploadedVideo.uploading?"#f0b429":uploadedVideo.storageUrl?"#5ce88a":"#ff6a6a",marginTop:2}}>{uploadedVideo.uploading?"☁ Saving to cloud...":uploadedVideo.storageUrl?"☁ Saved":"☁ Save failed — using local copy"}</div>
                        <div style={{fontSize:10,color:uploadedVideo.extractingFrames?"#f0b429":uploadedVideo.frames?.length?"#5ce88a":"#ff6a6a",marginTop:2}}>{uploadedVideo.extractingFrames?"🎞 Sampling frames...":uploadedVideo.frames?.length?`🎞 ${uploadedVideo.frames.length} frames ready for BISHOP`:"🎞 No frames captured — will use text context only"}</div>
                      </div>
                      <button onClick={()=>setUploadedVideo(null)} style={{background:"#ff2d2d",border:"none",color:"#fff",fontSize:14,width:24,height:24,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                    </div>
                  </div>
                )}

                {/* Content Type Tiles */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <span>Choose What to Generate</span>
                  <div style={{flex:1,height:1,background:"#1a1d24"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:8,marginBottom:18}}>
                  {[
                    {id:"viral_hooks",emoji:"🔥",label:"Viral Hooks",desc:"10 scroll-stoppers"},
                    {id:"seo_suite",emoji:"🔍",label:"SEO Suite",desc:"Title, tags, keywords"},
                    {id:"trending_strategy",emoji:"📈",label:"Trending",desc:"Algorithm + viral plan"},
                    {id:"caption_pack",emoji:"✍",label:"Captions",desc:"4 styles + hashtags"},
                    {id:"ad_copy",emoji:"💰",label:"Ad Copy",desc:"FB · TikTok · YouTube"},
                    {id:"convert_score",emoji:"🎯",label:"CONVERT SCORE",desc:"Will they buy or scroll?"},
                  ].map(a=>(
                    <div key={a.id} onClick={()=>setAmplifyType(a.id)}
                      style={{padding:"12px 10px",border:`1.5px solid ${amplifyType===a.id?"#00e5ff":"#1a1d24"}`,background:amplifyType===a.id?"rgba(0,229,255,.08)":"#0E1013",cursor:"pointer",borderRadius:8,textAlign:"center",transition:"all .15s",position:"relative"}}>
                      {amplifyType===a.id&&<div style={{position:"absolute",top:6,right:6,width:6,height:6,borderRadius:"50%",background:"#00e5ff"}}/>}
                      <div style={{fontSize:22,marginBottom:5}}>{a.emoji}</div>
                      <div style={{fontSize:13,color:amplifyType===a.id?"#00e5ff":"#F0F1F4",fontWeight:500,marginBottom:2}}>{a.label}</div>
                      <div style={{fontSize:11,color:"#6B6F7A",lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  ))}
                </div>

                {/* AI Brain */}
                <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <span>AI Brain</span><div style={{flex:1,height:1,background:"#1a1d24"}}/>
                </div>
                {renderBrainPicker("#00e5ff")}

                {/* Generate Button */}
                <button className="gbtn" disabled={!uploadedVideo||running||!brand||!niche} onClick={amplifyGenerate}
                  style={{background:uploadedVideo&&brand&&niche?"linear-gradient(135deg,#00e5ff,#0055ff)":"#1a1d24",color:uploadedVideo&&brand&&niche?"#000":"#45484F",marginTop:4,fontSize:15,padding:"15px 0",letterSpacing:3}}>
                  {running?"⟳  GENERATING...":`◈  ${AI_BRAINS.find(b=>b.id===aiBrain)?.label||"AI"} GENERATE`}
                </button>
                {!brand||!niche?<div style={{textAlign:"center",fontSize:12,color:"#45484F",marginTop:6}}>↑ Add Brand + Niche in Section 01</div>
                :!uploadedVideo?<div style={{textAlign:"center",fontSize:12,color:"#45484F",marginTop:6}}>↑ Upload a video above to begin</div>:null}
              </>)}
            </div>
          )}

          {mode==="ab"&&(
            <div>
              <div className="sl" style={{color:"#7c83fd"}}>05 — A/B Variable</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {AB_VARIABLES.map(v=><div key={v.id} className={`ctc ${abVar===v.id?"on":""}`} onClick={()=>setAbVar(v.id)}>
                  <div style={{fontSize:13,color:abVar===v.id?"#7c83fd":"#C9CDD3"}}>{v.label}</div>
                  <div style={{fontSize:10,color:"#565A64",marginTop:1}}>{v.desc}</div>
                </div>)}
              </div>
            </div>
          )}
{mode==="visibility"&&(
  <div style={{maxWidth:680,margin:"0 auto",padding:"0 16px"}}>
    <div style={{textAlign:"center",marginBottom:28}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#00ff88",letterSpacing:2,marginBottom:8}}>◆ AI SEARCH VISIBILITY</div>
      <div style={{fontSize:12,color:"#82858C",lineHeight:1.7,maxWidth:480,margin:"0 auto"}}>Check whether ChatGPT, Claude, Gemini, and Perplexity can actually read and understand your site — then have BISHOP write the real fixes.</div>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:20}}>
      <input className="inp" placeholder="yourbrand.com" value={vizUrl}
        onChange={e=>setVizUrl(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&scanVisibility()}
        style={{flex:1}}/>
      <button className="gbtn" disabled={!vizUrl.trim()||vizScanning}
        onClick={scanVisibility}
        style={{width:"auto",padding:"0 24px",background:"linear-gradient(135deg,#00ff88,#00b894)",color:"#000",flexShrink:0}}>
        {vizScanning?"⟳ SCANNING":"SCAN"}
      </button>
    </div>

    {vizError&&<div style={{background:"#1a0f0f",border:"1px solid #ff6a6a44",borderRadius:10,padding:"12px 14px",color:"#ff6a6a",fontSize:12,marginBottom:20}}>{vizError}</div>}

    {vizScanning&&(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"30px 0"}}>
        <div style={{width:52,height:52}}>
          <svg viewBox="0 0 40 40"><circle className="bishop-core-ring" cx="20" cy="20" r="17" style={{stroke:"#00ff88",animationDuration:"1s"}}/><circle cx="20" cy="20" r="3.4" fill="#00ff88"/></svg>
        </div>
        <div style={{fontSize:11,letterSpacing:2,color:"#82858C",textTransform:"uppercase"}}>Checking robots.txt and homepage signals...</div>
      </div>
    )}

    {vizResult&&!vizScanning&&(
      <>
        <div style={{display:"flex",alignItems:"center",gap:20,background:"rgba(255,255,255,.025)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:40,color:vizResult.score>=70?"#00ff88":vizResult.score>=40?"#f0b429":"#ff6a6a",flexShrink:0}}>{vizResult.score}</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#F5F6F8",marginBottom:3}}>AI Visibility Score</div>
            <div style={{fontSize:11,color:"#82858C",lineHeight:1.5}}>{vizResult.url}</div>
          </div>
        </div>

        {vizResult.siteCopy&&!vizBrandSuggestion&&(
          <div style={{background:"rgba(0,255,136,.05)",border:"1px solid #00ff8833",borderRadius:14,padding:18,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#00ff88",marginBottom:6}}>◆ Real Site Copy Pulled</div>
            <div style={{fontSize:11.5,color:"#82858C",lineHeight:1.6,marginBottom:12}}>BISHOP can read this brand's actual words and suggest a Brand Brief — niche, audience, tone, voice — instead of you typing it in by hand.</div>
            <button className="sm" disabled={vizAnalyzingBrand} onClick={analyzeBrandFromSite} style={{borderColor:"#00ff8855",color:"#00ff88"}}>
              {vizAnalyzingBrand?"⟳ READING YOUR BRAND...":"◆ LEARN MY BRAND FROM THIS SITE"}
            </button>
            {vizBrandError&&<div style={{fontSize:11,color:"#ff6a6a",marginTop:10}}>{vizBrandError}</div>}
          </div>
        )}

        {vizBrandSuggestion&&(
          <div style={{background:"rgba(255,255,255,.025)",backdropFilter:"blur(16px)",border:"1px solid #00ff8844",borderRadius:14,padding:18,marginBottom:16}}>
            <div style={{fontSize:9.5,letterSpacing:2,color:"#00ff88",textTransform:"uppercase",marginBottom:12}}>BISHOP's Read On Your Brand</div>
            <div style={{fontSize:13,color:"#F0F1F4",lineHeight:1.7,marginBottom:14,fontStyle:"italic"}}>"{vizBrandSuggestion.voiceSummary}"</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              <div style={{background:"rgba(255,255,255,.02)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:9,color:"#565A64",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Brand Name</div><div style={{fontSize:12.5,color:"#F0F1F4"}}>{vizBrandSuggestion.brandName||"—"}</div></div>
              <div style={{background:"rgba(255,255,255,.02)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:9,color:"#565A64",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Niche</div><div style={{fontSize:12.5,color:"#F0F1F4"}}>{vizBrandSuggestion.niche||"—"}</div></div>
              <div style={{background:"rgba(255,255,255,.02)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:9,color:"#565A64",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Audience</div><div style={{fontSize:12.5,color:"#F0F1F4"}}>{vizBrandSuggestion.audience||"—"}</div></div>
              <div style={{background:"rgba(255,255,255,.02)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:9,color:"#565A64",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Tone</div><div style={{fontSize:12.5,color:"#F0F1F4"}}>{(vizBrandSuggestion.tones||[]).map(t=>TONES.find(x=>x.id===t)?.label).filter(Boolean).join(" + ")||"—"}</div></div>
            </div>
            <button className="gbtn" onClick={applyBrandSuggestion} style={{background:"linear-gradient(135deg,#00ff88,#00b894)",color:"#000"}}>◆ APPLY TO BRAND BRIEF</button>
            <div style={{fontSize:10.5,color:"#565A64",textAlign:"center",marginTop:8}}>This fills your Brand Brief on the Copy tab — you can still edit anything by hand.</div>
          </div>
        )}

        <div style={{marginBottom:16}}>
          <div style={{fontSize:9.5,letterSpacing:2,color:"#82858C",textTransform:"uppercase",marginBottom:10}}>AI Crawlers</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {vizResult.crawlers.map(c=>(
              <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,.08)",background:c.blocked?"#1a0f0f":"rgba(255,255,255,.02)"}}>
                <div>
                  <div style={{fontSize:11.5,fontWeight:600,color:"#F0F1F4"}}>{c.label}</div>
                  <div style={{fontSize:9.5,color:"#565A64"}}>{c.org}</div>
                </div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:1,color:c.blocked?"#ff6a6a":"#00ff88"}}>{c.blocked?"BLOCKED":"OK"}</div>
              </div>
            ))}
          </div>
        </div>

        {vizResult.issues.length>0&&(
          <div style={{background:"rgba(255,255,255,.025)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:18,marginBottom:16}}>
            <div style={{fontSize:9.5,letterSpacing:2,color:"#82858C",textTransform:"uppercase",marginBottom:12}}>Issues Found</div>
            {vizResult.issues.map((iss,i)=>(
              <div key={i} style={{display:"flex",gap:9,marginBottom:9,alignItems:"flex-start"}}>
                <span style={{color:"#f0b429",fontSize:10,marginTop:2,flexShrink:0}}>◆</span>
                <span style={{fontSize:12,color:"#C9CDD3",lineHeight:1.6}}>{iss}</span>
              </div>
            ))}
          </div>
        )}

        {vizResult.issues.length>0&&!vizFixOutput&&(
          <button className="gbtn" disabled={vizFixing} onClick={generateVizFixes}
            style={{background:"linear-gradient(135deg,#00ff88,#00b894)",color:"#000",marginBottom:16}}>
            {vizFixing?"⟳ BISHOP IS WRITING FIXES...":"◆ GENERATE FIXES WITH BISHOP"}
          </button>
        )}

        {vizResult.issues.length===0&&(
          <div style={{textAlign:"center",padding:"20px 0",color:"#00ff88",fontSize:13,fontWeight:600}}>✓ No issues found — this site is AI-visible.</div>
        )}

        {vizFixOutput&&(
          <div style={{background:"rgba(255,255,255,.025)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:20,marginBottom:20}}>
            <div style={{fontSize:9.5,letterSpacing:2,color:"#00ff88",textTransform:"uppercase",marginBottom:12}}>BISHOP's Fixes</div>
            <div className={`otext ${vizFixing?"blink":""}`} style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{vizFixOutput}</div>
            {!vizFixing&&<button className="sm" style={{marginTop:14}} onClick={()=>copy(vizFixOutput,"viz")}>{copied==="viz"?"✓ COPIED":"COPY FIXES"}</button>}
          </div>
        )}
      </>
    )}
  </div>
)}
{mode==="campaign"&&(
  <div style={{padding:"0 4px"}}>
    <div style={{marginBottom:20}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:19,color:"#f0b429",letterSpacing:1,marginBottom:6}}>⬡ CAMPAIGN BUILDER</div>
      <div style={{fontSize:12,color:"#82858C",lineHeight:1.6}}>Connect Copy, Images, Video, and A/B into one real multi-day workflow — not five separate tools.</div>
    </div>

    {!activeProfileId&&(
      <div style={{fontSize:12,color:"#45484F",lineHeight:1.6}}>💡 Save a brand profile above (Active Brand → Save As Profile) to start building campaigns.</div>
    )}

    {activeProfileId&&!activeCampaign&&(
      <>
        {campaignsList.length>0&&(
          <div style={{marginBottom:22}}>
            <div style={{fontSize:9.5,letterSpacing:2,color:"#82858C",textTransform:"uppercase",marginBottom:10}}>Past Campaigns</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {campaignsList.map(c=>(
                <div key={c.id} onClick={()=>openCampaign(c)}
                  style={{padding:"10px 12px",borderRadius:9,border:"1px solid #24272E",cursor:"pointer",background:"rgba(255,255,255,.02)"}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#F0F1F4"}}>{c.name}</div>
                  <div style={{fontSize:10.5,color:"#565A64",marginTop:2}}>{c.length_days} days · {c.goal||"no goal set"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{fontSize:9.5,letterSpacing:2,color:"#82858C",textTransform:"uppercase",marginBottom:10}}>New Campaign</div>
        <div style={{fontSize:9,letterSpacing:1,color:"#565A64",textTransform:"uppercase",marginBottom:6}}>Campaign Name</div>
        <input className="inp" placeholder={`${brand||"Brand"} Launch`} value={cName} onChange={e=>setCName(e.target.value)} style={{marginBottom:14}}/>

        <div style={{fontSize:9,letterSpacing:1,color:"#565A64",textTransform:"uppercase",marginBottom:6}}>Campaign Goal *</div>
        <input className="inp" placeholder="Launch Urban Roots Hoodie" value={cGoal} onChange={e=>setCGoal(e.target.value)} style={{marginBottom:14}}/>

        <div style={{fontSize:9,letterSpacing:1,color:"#565A64",textTransform:"uppercase",marginBottom:6}}>Length (Days)</div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[3,5,7,10].map(n=>(
            <button key={n} onClick={()=>setCLength(n)}
              style={{flex:1,padding:"9px 0",borderRadius:8,border:`1px solid ${cLength===n?"#f0b42966":"#24272E"}`,background:cLength===n?"#f0b42912":"transparent",color:cLength===n?"#f0b429":"#6B6F7A",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",fontSize:12,fontWeight:700}}>
              {n}
            </button>
          ))}
        </div>

        <div style={{fontSize:9,letterSpacing:1,color:"#565A64",textTransform:"uppercase",marginBottom:6}}>Platforms</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
          {CAMPAIGN_PLATFORMS.map(p=>{
            const sel=cPlatforms.includes(p.id);
            return(
              <button key={p.id} onClick={()=>setCPlatforms(prev=>sel?prev.filter(x=>x!==p.id):[...prev,p.id])}
                style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${sel?"#f0b42966":"#24272E"}`,background:sel?"#f0b42912":"transparent",color:sel?"#f0b429":"#6B6F7A",cursor:"pointer",fontSize:11.5,fontWeight:600}}>
                {sel?"✓ ":""}{p.label}
              </button>
            );
          })}
        </div>

        <button className="gbtn" disabled={!!campaignBuilding||!cGoal.trim()} onClick={buildCampaign}
          style={{background:"linear-gradient(135deg,#f0b429,#ff7c00)",color:"#000"}}>
          {campaignBuilding||"⬡ BUILD WITH BISHOP"}
        </button>
        {campaignError&&<div style={{fontSize:11,color:"#ff6a6a",marginTop:10}}>{campaignError}</div>}
      </>
    )}

    {activeCampaign&&(
      <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:800,color:"#F5F6F8"}}>{activeCampaign.name}</div>
          <button className="sm" onClick={newCampaignForm} style={{borderColor:"#24272E"}}>← ALL CAMPAIGNS</button>
        </div>
        {campaignPieces.length===0&&campaignBuilding&&(
          <div style={{textAlign:"center",padding:"20px 0",color:"#f0b429",fontSize:12}}>⟳ {campaignBuilding}</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {campaignPieces.map(p=>{
            const statusColor={draft:"#82858C",approved:"#00e5ff",scheduled:"#7c83fd",published:"#00ff88"}[p.status];
            const statusNext={draft:"Approve",approved:"Schedule",scheduled:"Publish",published:null}[p.status];
            return(
              <div key={p.id} style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#f0b429"}}>DAY {p.day_number} — {p.day_theme.toUpperCase()}</div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:1,color:statusColor,textTransform:"uppercase"}}>{p.status}</div>
                </div>
                <div style={{fontSize:12,color:"#C9CDD3",lineHeight:1.6,whiteSpace:"pre-wrap",marginBottom:10}}>{p.content}</div>

                {p.status==="published"&&pieceMetrics[p.id]&&(()=>{
                  const draft=metricsDraft[p.id]||{views:0,likes:0,comments:0,shares:0,notes:""};
                  const saving=savingMetrics[p.id];
                  return(
                    <div style={{marginTop:4,marginBottom:10,padding:"12px",background:"rgba(255,255,255,.02)",border:"1px solid #24272E",borderRadius:8}}>
                      <div style={{fontSize:9.5,letterSpacing:2,color:"#00ff88",textTransform:"uppercase",marginBottom:8}}>📊 Performance</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:8}}>
                        {[["views","Views"],["likes","Likes"],["comments","Comments"],["shares","Shares"]].map(([field,label])=>(
                          <div key={field}>
                            <div style={{fontSize:8.5,color:"#565A64",textTransform:"uppercase",marginBottom:3}}>{label}</div>
                            <input type="number" min="0" value={draft[field]}
                              onChange={e=>updateMetricsDraft(p.id,field,e.target.value)}
                              style={{width:"100%",background:"#0E1013",border:"1px solid #24272E",borderRadius:5,padding:"6px 7px",color:"#F0F1F4",fontSize:12,fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",outline:"none"}}/>
                          </div>
                        ))}
                      </div>
                      <input placeholder="Notes (what worked, what didn't...)" value={draft.notes}
                        onChange={e=>updateMetricsDraft(p.id,"notes",e.target.value)}
                        style={{width:"100%",background:"#0E1013",border:"1px solid #24272E",borderRadius:5,padding:"7px 9px",color:"#F0F1F4",fontSize:11.5,fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",outline:"none",marginBottom:8}}/>
                      <button className="sm" disabled={saving} onClick={()=>savePerformanceLog(p.id)} style={{borderColor:"#00ff8855",color:"#00ff88"}}>
                        {saving?"⟳ SAVING...":"💾 SAVE METRICS"}
                      </button>
                    </div>
                  );
                })()}

                {statusNext&&(
                  <button className="sm" onClick={()=>advancePieceStatus(p)} style={{borderColor:`${statusColor}55`,color:statusColor}}>
                    {statusNext} →
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {campaignBuilding&&campaignPieces.length>0&&(
          <div style={{textAlign:"center",padding:"14px 0",color:"#f0b429",fontSize:11}}>⟳ {campaignBuilding}</div>
        )}
      </>
    )}
  </div>
)}
          <div>
            <div className="sl" style={{color:mc}}>{mode==="ab"?"06":"05"} — Tone <span style={{opacity:.5,fontWeight:400,textTransform:"none",letterSpacing:0}}>(pick up to 2)</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {TONES.map(t=>{
                const locked=plan==="free"&&!t.free;
                const selected=tone.includes(t.id);
                return <div key={t.id} onClick={()=>{
                    if(locked){setUpgradeModal(`${t.label} tone`);return;}
                    setTone(prev=>{
                      if(prev.includes(t.id)) return prev.length>1?prev.filter(x=>x!==t.id):prev;
                      if(prev.length>=2) return [prev[1],t.id];
                      return [...prev,t.id];
                    });
                  }}
                  style={{padding:"5px 10px",border:`1px solid ${selected&&!locked?t.color:"#24272E"}`,background:selected&&!locked?`${t.color}12`:"#0E1013",cursor:locked?"not-allowed":"pointer",color:selected&&!locked?t.color:"#82858C",fontSize:12,letterSpacing:1,transition:"all .15s",opacity:locked?.45:1}}>
                  {t.label}{selected&&<span style={{marginLeft:5,opacity:.8}}>✓</span>}{locked&&<span className="lock-icon">🔒</span>}
                </div>;
              })}
            </div>
          </div>

          {mode!=="visibility"&&(
          <button className="gbtn"
            disabled={!brand||!niche||running||(mode==="video"&&(!videoAdType||!videoTool))||(mode==="image"&&!imageTool)}
            onClick={generate}
            style={{background:mode==="video"?"linear-gradient(135deg,#f0b429,#ff8c00)":mode==="image"?"linear-gradient(135deg,#ff7c00,#ff2200)":mode==="ab"?"linear-gradient(135deg,#7c83fd,#0044ff)":"linear-gradient(135deg,#00e5ff,#0044ff)",color:"#000"}}>
            {running?"⟳  GENERATING...":mode==="image"?"⬡  GENERATE PROMPTS":mode==="video"?"▷  GENERATE VIDEO AD":mode==="ab"?"⇄  RUN A/B TEST":"▶  GENERATE CONTENT"}
          </button>
          )}

          {/* Required selection hints */}
          {mode!=="visibility"&&(!brand||!niche)&&<div style={{fontSize:11,color:"#45484F",textAlign:"center",letterSpacing:1,marginTop:-10}}>Brand + Niche required</div>}
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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 18px",borderBottom:"1px solid #1a1d24",background:"#08090B",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
              {mode==="ab"?(
                <><button className={`sm ${abTab==="variants"?"on":""}`} onClick={()=>setAbTab("variants")}>⇄ Variants</button>
                <button className={`sm ${abTab==="scores"?"on":""}`} onClick={()=>setAbTab("scores")} disabled={!abA||!abB}>◈ Scores</button></>
              ):(
                <><div style={{fontSize:10,letterSpacing:3,color:"#565A64",textTransform:"uppercase"}}>
                  {mode==="image"?(IMAGE_TYPES.find(c=>c.id===imageType)?.label):mode==="video"?(VIDEO_AD_TYPES.find(c=>c.id===videoAdType)?.label):(CONTENT_TYPES.find(c=>c.id===contentType)?.label)}
                </div>
                {selTones.map(st=>(
                  <div key={st.id} style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${st.color}33`,color:st.color,textTransform:"uppercase"}}>{st.label}</div>
                ))}
                {mode==="image"&&<div style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${IMAGE_TOOLS.find(t=>t.id===imageTool)?.color||"#2A2D33"}44`,color:IMAGE_TOOLS.find(t=>t.id===imageTool)?.color||"#6B6F7A",textTransform:"uppercase"}}>{IMAGE_TOOLS.find(t=>t.id===imageTool)?.label}</div>}
                {mode==="video"&&<div style={{fontSize:10,letterSpacing:2,padding:"2px 7px",border:`1px solid ${VIDEO_TOOLS.find(t=>t.id===videoTool)?.color||"#2A2D33"}44`,color:VIDEO_TOOLS.find(t=>t.id===videoTool)?.color||"#6B6F7A",textTransform:"uppercase"}}>{VIDEO_TOOLS.find(t=>t.id===videoTool)?.label}</div>}
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
            {step==="idle"&&(()=>{
              const checks=[
                {label:"Brand Voice",ok:tone&&tone.length>0},
                {label:"Target Audience",ok:!!audience.trim()},
                {label:"Product Info",ok:!!(productDesc.trim()||goal.trim())},
                {label:"Keywords",ok:!!keywords.trim()},
                {label:"Social Accounts",ok:postizStatus.connected},
                {label:"Performance Data",ok:history.length>0},
              ];
              const readyCount=checks.filter(c=>c.ok).length;
              const knowledgePct=Math.round((readyCount/checks.length)*100);
              const configured=!!(brand.trim()&&niche.trim());
              return(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:22,userSelect:"none",padding:"0 20px"}}>
                  <style>{`@keyframes bishopFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

                  {!configured?(
                    <>
                      {/* BISHOP mascot — real THREE11 Motion Tech artwork, served from /public */}
                      <div style={{position:"relative",width:120,height:120}}>
                        <div style={{position:"absolute",inset:-20,borderRadius:"50%",background:`radial-gradient(circle,${gold}22,transparent 70%)`,filter:"blur(6px)"}}/>
                        <img src="/bishop-mascot.png" alt="BISHOP" style={{position:"relative",width:120,height:120,objectFit:"contain",filter:"drop-shadow(0 10px 24px rgba(0,0,0,.4))"}}/>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:24,color:"#F0F1F4",marginBottom:8}}>BISHOP is ready when you are</div>
                        <div style={{fontSize:14,color:"#82858C",lineHeight:1.6,maxWidth:300}}>He just needs to know your brand's name and niche before he can start creating.</div>
                      </div>
                      <button className="gbtn" onClick={()=>{handleModeSwitch("brand-brief");setActiveWorkspace("brand");setTimeout(()=>brandInputRef.current?.focus(),100);}} style={{width:"auto",padding:"14px 32px",background:`linear-gradient(135deg,${gold},#B8935A)`,color:"#0B0D12"}}>Complete Brand Brief →</button>
                    </>
                  ):(
                    <div style={{width:"100%",maxWidth:920,display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:14,padding:isMobile?"0":"8px 0"}}>

                      {/* Hero tile — mascot + welcome, spans 2x2 */}
                      <div style={{gridColumn:"span 2",gridRow:"span 2",background:"rgba(255,255,255,.035)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.09)",borderRadius:24,padding:isMobile?"24px 20px":"32px 28px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:14}}>
                        <div style={{position:"relative",width:76,height:76,animation:"bishopFloat 4s ease-in-out infinite"}}>
                          <div style={{position:"absolute",inset:-14,borderRadius:"50%",background:`radial-gradient(circle,${gold}20,transparent 70%)`,filter:"blur(4px)"}}/>
                          <img src="/bishop-mascot.png" alt="BISHOP" style={{position:"relative",width:76,height:76,objectFit:"contain",filter:"drop-shadow(0 8px 18px rgba(0,0,0,.4))"}}/>
                        </div>
                        <div>
                          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontStyle:"italic",fontSize:isMobile?20:24,color:"#F0F1F4"}}>{brand} is loaded</div>
                          <div style={{fontSize:12.5,color:"#6B7280",marginTop:5}}>BISHOP knows this brand — ready to create.</div>
                        </div>
                      </div>

                      {/* Knowledge tile — spans 2x1 */}
                      <div style={{gridColumn:"span 2",background:"rgba(255,255,255,.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.08)",borderRadius:22,padding:"18px 20px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                          <span style={{fontSize:12,color:"#9BA0AC",fontWeight:500}}>BISHOP Knowledge</span>
                          <span style={{fontSize:22,fontWeight:700,color:knowledgePct===100?"#4ADE80":gold,fontFamily:"'Fraunces',serif"}}>{knowledgePct}%</span>
                        </div>
                        <div style={{width:"100%",height:5,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${knowledgePct}%`,background:knowledgePct===100?"linear-gradient(90deg,#4ADE80,#22C55E)":`linear-gradient(90deg,${gold},#B8935A)`,borderRadius:4,transition:"width .5s ease"}}/>
                        </div>
                      </div>

                      {/* Checklist tile — spans 2x1 */}
                      <div style={{gridColumn:"span 2",background:"rgba(255,255,255,.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.08)",borderRadius:22,padding:"18px 20px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {checks.map(c=>(
                            <div key={c.label} style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5}}>
                              <span style={{color:c.ok?"#4ADE80":"#4a4d54",flexShrink:0}}>{c.ok?"✓":"○"}</span>
                              <span style={{color:c.ok?"#D5D7DB":"#6B7280"}}>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick action tiles — 1x1 each, real navigation */}
                      {[
                        {label:"Create Content",sub:"Copy · Images · Video",action:()=>{handleModeSwitch("copy");setActiveWorkspace("create");}},
                        {label:"Campaigns",sub:"Build & manage",action:()=>{handleModeSwitch("campaign");setActiveWorkspace("campaigns");}},
                        {label:"AI Viz",sub:"Visibility check",action:()=>{handleModeSwitch("visibility");setActiveWorkspace("intelligence");}},
                        {label:"Connections",sub:"Social accounts",action:()=>setShowAccount(true)},
                      ].map(t=>(
                        <div key={t.label} onClick={t.action}
                          style={{background:"rgba(255,255,255,.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.08)",borderRadius:20,padding:"16px 16px",cursor:"pointer",transition:"all .2s",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:88}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=`${gold}55`;e.currentTarget.style.transform="translateY(-3px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.08)";e.currentTarget.style.transform="translateY(0)";}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:"#EDEEF0"}}>{t.label}</div>
                          <div style={{fontSize:11,color:"#6B7280",marginTop:4}}>{t.sub}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {(mode==="copy"||mode==="image"||mode==="video")&&(step==="running"||step==="done"||output.length>0||outputRef.current.length>0)&&(
              <div>
                {brand&&<div style={{marginBottom:20,paddingBottom:14,borderBottom:"1px solid #1a1d24"}}>
                  <div style={{fontSize:10,letterSpacing:4,color:"#45484F",textTransform:"uppercase",marginBottom:5}}>
                    {uploadedImage||uploadedVideo?"Analyzing":"Generating"} for
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#fff",letterSpacing:2}}>{brand}</div>
                  <div style={{fontSize:12,color:"#565A64",marginTop:3}}>{niche}{mode==="video"&&` · ${VIDEO_AD_TYPES.find(v=>v.id===videoAdType)?.label}`}</div>
                </div>}

                {/* Uploaded image preview */}
                {mode==="image"&&uploadedImage&&imageFlow==="amplify"&&(
                  <div style={{marginBottom:20,display:"flex",gap:14,alignItems:"flex-start",padding:"14px",background:"#15181D",border:"1px solid #ff7c0033",borderRadius:6}}>
                    <img src={uploadedImage.url} alt="uploaded" style={{width:80,height:80,objectFit:"cover",borderRadius:4,flexShrink:0,border:"1px solid #ff7c0055"}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,letterSpacing:2,color:"#ff7c00",textTransform:"uppercase",marginBottom:4}}>Analyzing This Image</div>
                      <div style={{fontSize:13,color:"#bccfe0",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedImage.name}</div>
                      <div style={{fontSize:11,color:"#6B6F7A"}}>{uploadedImage.size} KB</div>
                    </div>
                  </div>
                )}

                {/* Uploaded video preview */}
                {mode==="video"&&uploadedVideo&&videoFlow==="amplify"&&(
                  <div style={{marginBottom:20,background:"#15181D",border:"1px solid #f0b42933",borderRadius:6,overflow:"hidden"}}>
                    <video src={uploadedVideo.url} controls style={{width:"100%",maxHeight:160,display:"block",background:"#000"}}/>
                    <div style={{padding:"10px 14px",display:"flex",gap:12,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#f0b429",textTransform:"uppercase",marginBottom:2}}>{uploadedVideo.frames?.length?`Analyzing ${uploadedVideo.frames.length} Sampled Frames`:"Using Brand Context Only"}</div>
                        <div style={{fontSize:12,color:"#82858C",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedVideo.name} · {uploadedVideo.size} MB</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`otext ${running?"blink":""}`} style={{minHeight:"20px",display:"block"}}>{output||outputRef.current}</div>

                {/* ── PUBLISH PANEL ── */}
                {step==="done"&&output&&(
                  <div style={{marginTop:32,borderTop:"2px solid #24272E",paddingTop:24}}>

                    {/* Header */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                      <div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#fff",letterSpacing:1,marginBottom:4}}>
                          📤 Publish Your {mode==="image"?"Image":"Video"}
                        </div>
                        <div style={{fontSize:13,color:"#82858C",lineHeight:1.6}}>
                          {uploadedImage?"Your image is ready to post."
                          :uploadedVideo?"Your video is ready to post."
                          :mode==="image"?"Use the AI prompts above to generate your image, then come back to post it."
                          :"Use the script above to create your video, then come back to post it."}
                        </div>
                      </div>
                      <button onClick={downloadFile} style={{padding:"10px 16px",border:"1px solid #24272E",background:"transparent",color:"#82858C",fontSize:12,letterSpacing:1,cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",borderRadius:4,flexShrink:0,display:uploadedImage||uploadedVideo?"block":"none"}}>↓ Download</button>
                    </div>

                    {/* Upload your finished image/video if not already uploaded */}
                    {!uploadedImage&&!uploadedVideo&&(
                      <div style={{marginBottom:24}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#9BA0AC",textTransform:"uppercase",marginBottom:10,fontWeight:500}}>
                          Upload Your Finished {mode==="image"?"Image":"Video"} to Publish
                        </div>
                        {mode==="image"?(
                          <>
                            <div style={{border:"2px dashed #2A2D33",background:"#0E1013",padding:"20px 16px",textAlign:"center",borderRadius:10,marginBottom:8}}>
                              <div style={{fontSize:30,marginBottom:8}}>🖼️</div>
                              <div style={{fontSize:14,color:"#F0F1F4",fontWeight:600,marginBottom:4}}>Upload Your Image</div>
                              <div style={{fontSize:12,color:"#6B6F7A",marginBottom:14}}>JPG · PNG · WEBP · GIF</div>
                              <input type="file" accept="image/*"
                                onChange={e=>{if(e.target.files&&e.target.files[0])handleImageFile(e.target.files[0]);}}
                                style={{display:"block",width:"100%",padding:"12px",background:"#00e5ff",color:"#000",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}
                              />
                            </div>
                          </>
                        ):(
                          <>
                            <div style={{border:"2px dashed #2A2D33",background:"#0E1013",padding:"20px 16px",textAlign:"center",borderRadius:10,marginBottom:8}}>
                              <div style={{fontSize:30,marginBottom:8}}>🎬</div>
                              <div style={{fontSize:14,color:"#F0F1F4",fontWeight:600,marginBottom:4}}>Upload Your Video</div>
                              <div style={{fontSize:12,color:"#6B6F7A",marginBottom:14}}>MP4 · MOV · WEBM · AVI</div>
                              <input type="file" accept="video/*"
                                onChange={e=>{if(e.target.files&&e.target.files[0])handleVideoFile(e.target.files[0]);}}
                                style={{display:"block",width:"100%",padding:"12px",background:"#f0b429",color:"#000",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif"}}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Show uploaded file preview in publish panel */}
                    {uploadedImage&&(
                      <div style={{marginBottom:20,display:"flex",gap:14,alignItems:"center",padding:"14px",background:"#08090B",border:"1px solid #00e5ff33",borderRadius:8}}>
                        <img src={uploadedImage.url} alt="ready" style={{width:80,height:80,objectFit:"cover",borderRadius:6,flexShrink:0,border:"2px solid #00e5ff44"}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:"#00e5ff",letterSpacing:1,marginBottom:3}}>✓ IMAGE READY TO PUBLISH</div>
                          <div style={{fontSize:13,color:"#F0F1F4",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedImage.name}</div>
                          <div style={{fontSize:11,color:"#565A64"}}>{uploadedImage.size} KB</div>
                        </div>
                        <button onClick={()=>setUploadedImage(null)} style={{background:"none",border:"1px solid #24272E",color:"#82858C",fontSize:11,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",borderRadius:4}}>Change</button>
                      </div>
                    )}
                    {uploadedVideo&&(
                      <div style={{marginBottom:20,background:"#08090B",border:"1px solid #00e5ff33",borderRadius:8,overflow:"hidden"}}>
                        <video src={uploadedVideo.url} style={{width:"100%",maxHeight:160,display:"block",objectFit:"cover"}} muted playsInline preload="metadata"/>
                        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:"#00e5ff",letterSpacing:1,marginBottom:2}}>✓ VIDEO READY TO PUBLISH</div>
                            <div style={{fontSize:13,color:"#F0F1F4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedVideo.name}</div>
                            <div style={{fontSize:11,color:"#565A64",marginTop:2}}>{uploadedVideo.size} MB</div>
                          </div>
                          <button onClick={()=>setUploadedVideo(null)} style={{background:"none",border:"1px solid #24272E",color:"#82858C",fontSize:11,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",borderRadius:4}}>Change</button>
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    <div style={{marginBottom:20}}>
                      <div style={{fontSize:12,letterSpacing:2,color:"#9BA0AC",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>Your Post Caption</div>
                      <textarea value={publishCaption} onChange={e=>setPublishCaption(e.target.value)}
                        placeholder={output.slice(0,200)||`${brand} — ${productName||niche} #newdrop`}
                        style={{width:"100%",background:"#0E1013",border:"1.5px solid #2A2D33",color:"#F5F6F8",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",fontSize:14,padding:"14px 16px",resize:"vertical",minHeight:90,outline:"none",lineHeight:1.8,borderRadius:6}}/>
                      <div style={{fontSize:11,color:"#565A64",marginTop:4}}>{publishCaption.length>0?`${publishCaption.length} chars — copy-paste ready`:"Leave blank to use the AI-generated content above"}</div>
                    </div>

                    {/* Platform URL Setup */}
                    <div style={{marginBottom:20}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#9BA0AC",textTransform:"uppercase",fontWeight:500}}>Your Platform Profiles</div>
                        <button onClick={()=>setShowURLSetup(s=>!s)}
                          style={{fontSize:11,padding:"5px 12px",border:"1px solid #24272E",background:showURLSetup?"#1a1d24":"transparent",color:"#82858C",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",borderRadius:4,letterSpacing:1}}>
                          {showURLSetup?"Hide":"⚙ Setup URLs"}
                        </button>
                      </div>
                      <div style={{fontSize:12,color:"#565A64",marginBottom:showURLSetup?12:0,lineHeight:1.6}}>
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
                                  style={{width:"100%",background:"#08090B",border:"1px solid #24272E",color:"#F0F1F4",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",fontSize:12,padding:"10px 12px",outline:"none",borderRadius:4}}
                                />
                              </div>
                              {platformURLs[pf.id]&&<div style={{width:8,height:8,borderRadius:"50%",background:"#00ff88",flexShrink:0}}/>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── REAL AUTO-POST via connected Postiz accounts ── */}
                    {postizStatus.connected&&postizStatus.integrations?.length>0&&(
                      <div style={{marginBottom:22,background:"#08090B",border:"1px solid #00ff8844",borderRadius:8,padding:"14px 16px"}}>
                        <div style={{fontSize:12,letterSpacing:2,color:"#00ff88",textTransform:"uppercase",marginBottom:4,fontWeight:600}}>🚀 Auto-Post — Live Accounts</div>
                        <div style={{fontSize:11,color:"#6B6F7A",marginBottom:12,lineHeight:1.5}}>
                          {(uploadedImage?.storageUrl||uploadedVideo?.storageUrl)
                            ?"Posts directly to your connected account — no copy-paste, no new tab."
                            :(uploadedImage||uploadedVideo)
                            ?"Still saving your file to the cloud — one sec, then Post Now will unlock."
                            :"Upload an image or video above first, so there's media to attach."}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {postizStatus.integrations.map(intg=>{
                            const status=postizPublishing[intg.id];
                            const mediaReady=!!(uploadedImage?.storageUrl||uploadedVideo?.storageUrl);
                            const isBusy=status==="publishing";
                            const isDone=status==="done";
                            const isExpired=status==="expired";
                            const isError=status==="error";
                            return(
                              <div key={intg.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#0E1013",border:"1px solid #24272E",borderRadius:6}}>
                                {intg.picture&&<img src={intg.picture} alt="" style={{width:26,height:26,borderRadius:"50%",flexShrink:0}}/>}
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:13,color:"#F0F1F4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{intg.name||intg.username||intg.platform}</div>
                                  <div style={{fontSize:10,color:"#565A64",textTransform:"uppercase",letterSpacing:1}}>{intg.platform||""}</div>
                                </div>
                                {isExpired?(
                                  <a href={`/api/postiz-connect?userId=${session.user.id}`}
                                    style={{fontSize:11,padding:"7px 12px",background:"#f0b429",color:"#000",borderRadius:4,fontWeight:600,textDecoration:"none",flexShrink:0}}>
                                    Reconnect
                                  </a>
                                ):(
                                  <button
                                    disabled={!mediaReady||isBusy}
                                    onClick={()=>postizPublishNow(intg)}
                                    style={{fontSize:11,padding:"7px 14px",border:"none",borderRadius:4,fontWeight:600,cursor:mediaReady&&!isBusy?"pointer":"not-allowed",flexShrink:0,fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",
                                      background:isDone?"#00ff8822":!mediaReady||isBusy?"#1a1d24":"linear-gradient(135deg,#00ff88,#00b894)",
                                      color:isDone?"#00ff88":!mediaReady||isBusy?"#45484F":"#000"}}>
                                    {isDone?"✓ Posted":isBusy?"Posting...":"Post Now"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {Object.values(postizPublishing).some(s=>s==="error")&&
                          <div style={{fontSize:11,color:"#ff6a6a",marginTop:10}}>Something didn't go through on one account — try again in a moment.</div>}
                      </div>
                    )}

                    {/* Platform Picker — select up to 3 */}
                    <div style={{fontSize:12,letterSpacing:2,color:"#9BA0AC",textTransform:"uppercase",marginBottom:12,fontWeight:500}}>
                      Select Platforms <span style={{color:"#565A64",fontSize:11,fontWeight:400,letterSpacing:1}}>(up to 3)</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                      {PUBLISH_PLATFORMS.map(pf=>{
                        const isPicked=publishPicks.includes(pf.id);
                        const hasURL=!!platformURLs[pf.id];
                        const isDone=publishStatus[pf.id]==="done";
                        return(
                          <div key={pf.id} onClick={()=>!isDone&&togglePublishPick(pf.id)}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",border:`1.5px solid ${isPicked?pf.color+"88":"#24272E"}`,background:isPicked?`${pf.color}0d`:"#0E1013",cursor:publishPicks.length>=3&&!isPicked?"not-allowed":"pointer",transition:"all .15s",borderRadius:6,opacity:publishPicks.length>=3&&!isPicked?.4:1,position:"relative"}}>
                            <span style={{fontSize:18}}>{pf.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,color:isPicked?pf.color:"#F0F1F4",fontWeight:isPicked?500:400}}>{pf.label}</div>
                              <div style={{fontSize:10,color:hasURL?"#00ff8866":"#45484F",marginTop:1}}>{hasURL?"✓ URL saved":"No URL yet"}</div>
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
                          style={{width:"100%",padding:"16px 0",border:"none",background:"linear-gradient(135deg,#00e5ff,#0055ff)",color:"#000",fontSize:14,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",fontWeight:600,borderRadius:6,marginBottom:10}}>
                          {publishPicks.length===1
                            ?`↗ POST TO ${PUBLISH_PLATFORMS.find(p=>p.id===publishPicks[0])?.label.toUpperCase()}`
                            :`↗ POST TO ${publishPicks.length} PLATFORMS AT ONCE`}
                        </button>
                        <div style={{background:"#08090B",border:"1px solid #1a1d24",borderRadius:6,padding:"12px 16px"}}>
                          <div style={{fontSize:11,color:"#565A64",marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>What happens when you click:</div>
                          {publishPicks.map(id=>{
                            const pf=PUBLISH_PLATFORMS.find(p=>p.id===id);
                            const hasURL=!!platformURLs[id];
                            return(
                              <div key={id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8,paddingBottom:8,borderBottom:"1px solid #1a1d24"}}>
                                <span style={{fontSize:15,flexShrink:0}}>{pf?.icon}</span>
                                <div>
                                  <div style={{fontSize:13,color:pf?.color||"#9BA0AC",fontWeight:500,marginBottom:2}}>{pf?.label}</div>
                                  <div style={{fontSize:11,color:"#6B6F7A",lineHeight:1.6}}>
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
                      <div style={{textAlign:"center",padding:"20px",border:"1px dashed #1a1d24",borderRadius:6}}>
                        <div style={{fontSize:13,color:"#565A64"}}>↑ Select at least one platform above to publish</div>
                      </div>
                    )}

                    {/* ── STEP-BY-STEP GUIDE — shows after clicking post ── */}
                    {activePlatformGuide&&PLATFORM_STEPS[activePlatformGuide]&&(()=>{
                      const guide=PLATFORM_STEPS[activePlatformGuide];
                      return(
                        <div style={{marginTop:20,background:"#08090B",border:`2px solid ${guide.color}55`,borderRadius:10,overflow:"hidden"}}>
                          <div style={{background:`${guide.color}22`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:22}}>{guide.icon}</span>
                              <div>
                                <div style={{fontSize:14,color:guide.color,fontWeight:600,letterSpacing:1}}>How to Post on {guide.name}</div>
                                <div style={{fontSize:11,color:"#82858C",marginTop:2}}>Follow these steps — takes under 30 seconds</div>
                              </div>
                            </div>
                            <button onClick={()=>setActivePlatformGuide(null)}
                              style={{background:"none",border:"none",color:"#82858C",fontSize:18,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>✕</button>
                          </div>
                          <div style={{padding:"18px"}}>
                            {guide.steps.map((step,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
                                <div style={{width:24,height:24,borderRadius:"50%",background:i===0?`${guide.color}33`:"#0E1013",border:`1px solid ${i===0?guide.color:"#24272E"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                                  <span style={{fontSize:11,color:i===0?guide.color:"#82858C",fontWeight:600}}>{i+1}</span>
                                </div>
                                <div style={{fontSize:13,color:i===0?"#00ff88":"#F0F1F4",lineHeight:1.6,fontWeight:i===0?500:400}}>{step}</div>
                              </div>
                            ))}
                            <div style={{marginTop:16,padding:"12px 14px",background:"#0E1013",borderRadius:6,border:`1px solid ${guide.color}33`}}>
                              <div style={{fontSize:11,color:"#6B6F7A",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>💡 Pro Tip</div>
                              <div style={{fontSize:12,color:"#9BA0AC",lineHeight:1.6}}>{guide.tip}</div>
                            </div>
                            <div style={{marginTop:14,padding:"10px 14px",background:`${guide.color}11`,borderRadius:6,display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:16}}>📋</span>
                              <div>
                                <div style={{fontSize:12,color:guide.color,fontWeight:500}}>Caption copied to clipboard!</div>
                                <div style={{fontSize:11,color:"#82858C",marginTop:2}}>Just paste it (Ctrl+V or hold → Paste) in the {guide.name} app or website</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Mobile share button */}
                    <div style={{marginTop:16,textAlign:"center"}}>
                      <button onClick={webShare}
                        style={{padding:"12px 24px",border:"1px solid #24272E",background:"transparent",color:"#82858C",fontSize:12,letterSpacing:2,cursor:"pointer",fontFamily:"'Inter',-apple-system,'Helvetica Neue',sans-serif",borderRadius:6,textTransform:"uppercase"}}>
                        📱 Mobile Share (iOS/Android)
                      </button>
                      <div style={{fontSize:11,color:"#45484F",marginTop:6}}>Opens native share sheet on mobile devices</div>
                    </div>

                    {/* Phase 2 notice */}
                    <div style={{marginTop:16,padding:"14px 16px",background:"#08090B",border:"1px solid #1a1d24",borderRadius:6}}>
                      <div style={{fontSize:11,color:"#45484F",lineHeight:1.8}}>
                        🔒 <span style={{color:"#565A64"}}>Auto-posting coming in Phase 2</span> — direct API posting to Instagram, TikTok & YouTube requires platform API approval. Currently the fastest manual flow: caption copies instantly, platform opens, paste & post in under 30 seconds.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode==="ab"&&step!=="idle"&&abTab==="variants"&&(
              <div style={{display:"flex",height:"100%"}}>
                <div className="vp" style={{borderRight:"1px solid #1a1d24"}}>
                  <div style={{padding:"10px 15px",borderBottom:"1px solid #1a1d24",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#08090B",flexShrink:0}}>
                    <div style={{fontSize:12,letterSpacing:3,color:"#00e5ff",textTransform:"uppercase"}}>Variant A</div>
                    {abA&&<button className="sm" style={{padding:"3px 9px",fontSize:11,color:copied==="A"?"#00ff88":""}} onClick={()=>copy(abA,"A")}>{copied==="A"?"✓":"COPY"}</button>}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}><div className={`otext ${running&&!abA?"blink":""}`} style={{fontSize:14.5}}>{abA}</div></div>
                </div>
                <div className="vp">
                  <div style={{padding:"10px 15px",borderBottom:"1px solid #1a1d24",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#08090B",flexShrink:0}}>
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
                    <div style={{marginBottom:20,paddingBottom:14,borderBottom:"1px solid #1a1d24"}}>
                      <div style={{fontSize:10,letterSpacing:4,color:"#f0b429",textTransform:"uppercase",marginBottom:6}}>Analysis Complete</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#fff"}}>Variant {scores.winner} Wins</div>
                      <div style={{fontSize:14,color:"#82858C",marginTop:5,lineHeight:1.7}}>{scores.winnerReason}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {["A","B"].map(v=>{
                        const s=v==="A"?scores.variantA:scores.variantB;
                        const isW=scores.winner===v;const ac=v==="A"?"#00e5ff":"#7c83fd";
                        return(<div key={v} style={{background:isW?`${ac}05`:"#0E1013",border:`1px solid ${isW?ac+"44":"#243650"}`,padding:"16px"}}>
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
                          <div style={{marginTop:10,padding:"12px 14px",background:"#172236",borderLeft:`2px solid ${ac}44`,fontSize:12,color:"#82858C",lineHeight:1.6}}>{s.verdict}</div>
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
          borderLeft:isMobile?"none":"1px solid #1a1d24",
          background:"#08090B",
          display:isMobile?(mobileTab==="sessions"?"flex":"none"):"flex",
          flexDirection:"column",
          overflow:"hidden",
          flexShrink:0,
          paddingBottom:isMobile?"80px":0,
          position:isMobile?"absolute":"relative",
          inset:isMobile?"0":"auto",
          zIndex:isMobile?100:"auto",
        }}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1a1d24",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:10,letterSpacing:4,color:"#3a5572",textTransform:"uppercase"}}>Sessions</div>
            {history.length>0&&<button onClick={()=>{if(window.confirm("Clear all sessions?"))setHistory([]);}} style={{background:"none",border:"none",color:"#45484F",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>CLEAR</button>}
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {history.length===0
              ?<div style={{padding:14,fontSize:11,color:"#2A2D33",letterSpacing:.5,lineHeight:2}}>Auto-saved sessions appear here.</div>
              :history.map(e=>{
                const mColor={copy:"#00e5ff",image:"#ff7c00",video:"#f0b429",ab:"#7c83fd",visibility:"#00ff88"}[mode]||"#6B6F7A";
                const mIcon={copy:"◈",image:"⬡",video:"▷",ab:"⇄"}[e.mode]||"·";
                const label=e.mode==="image"?(IMAGE_TYPES.find(c=>c.id===e.contentType)?.label):e.mode==="video"?(VIDEO_AD_TYPES.find(c=>c.id===e.contentType)?.label):(CONTENT_TYPES.find(c=>c.id===e.contentType)?.label)||e.contentType;
                return(<div key={e.id} className="hi" onClick={()=>loadHist(e)} style={{borderLeftColor:histActive?.id===e.id?mColor:"transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}><span style={{fontSize:11,color:mColor}}>{mIcon}</span><span style={{fontSize:12,color:"#a8c0d8"}}>{e.brand}</span></div>
                  <div style={{fontSize:10,color:"#565A64",letterSpacing:1,textTransform:"uppercase",marginBottom:1}}>{label}</div>
                  <div style={{fontSize:10,color:"#2A2D33"}}>{e.ts}</div>
                </div>);
              })
            }
          </div>
          <div style={{padding:"12px",borderTop:"1px solid #1a1d24",fontSize:10,letterSpacing:1,lineHeight:2.4,textTransform:"uppercase"}}>
            <div style={{color:"#f0b429",marginBottom:4,fontSize:11}}>GENTAGAI v{VERSION}</div>
            <div style={{color:"#2A2D33"}}>{DOMAIN}</div>
            <div style={{color:"#00e5ff44"}}>◈ Copy Engine</div>
            <div style={{color:"#ff7c0044"}}>⬡ Image Prompts</div>
            <div style={{color:"#f0b42944"}}>▷ Video Ads</div>
            <div style={{color:"#7c83fd44"}}>⇄ A/B Testing</div>
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
}
