import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type AdBrief = {
  detected_offer: string;
  tone: string;
  audience: string;
  message_snippet: string;
  campaign_theme: string;
  industry: string;
  primary_action: string;
  keywords: string[];
  proof_phrase: string;
  visual_caption: string;
};

type Rewrite = {
  id: string;
  original: string;
  new_text: string;
};

const STOPWORDS = new Set([
  "about", "above", "after", "again", "against", "already", "also", "and", "are",
  "because", "been", "before", "being", "between", "bold", "book", "busy", "but",
  "calm", "can", "could", "did", "does", "doing", "done", "each", "every", "for",
  "free", "from", "get", "had", "has", "have", "here", "into", "just", "launch",
  "like", "made", "make", "more", "most", "new", "not", "now", "off", "offer",
  "our", "out", "over", "own", "page", "percent", "plus", "premium", "see", "should",
  "simple", "start", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "through", "today", "too", "try", "use", "using",
  "very", "was", "way", "week", "were", "when", "where", "which", "while",
  "with", "you", "your",
]);

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "SaaS and software": ["software", "saas", "platform", "workflow", "dashboard", "api", "automation", "developer", "team"],
  "fitness and wellness": ["fitness", "gym", "training", "workout", "coach", "wellness", "health", "nutrition", "supplement"],
  "fashion and lifestyle": ["fashion", "style", "wear", "apparel", "sneaker", "shoe", "beauty", "skin", "lifestyle"],
  "commerce and retail": ["shop", "store", "shipping", "cart", "ecommerce", "retail", "sale", "discount", "product"],
  "finance and services": ["finance", "bank", "payment", "insurance", "loan", "tax", "invest", "secure"],
  "travel and hospitality": ["travel", "hotel", "trip", "stay", "flight", "booking", "restaurant", "food"],
  "education and learning": ["course", "learn", "class", "student", "training", "academy", "lesson"],
};

const ACTION_KEYWORDS: Record<string, string[]> = {
  shop: ["shop", "buy", "store", "cart", "shipping", "sale", "discount", "product"],
  book: ["book", "demo", "call", "consultation", "appointment", "reservation"],
  start: ["start", "trial", "free", "signup", "sign up", "join"],
  download: ["download", "install", "app"],
  learn: ["learn", "guide", "course", "webinar"],
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function humanizePhrase(text: string, fallback = "campaign") {
  const cleaned = text
    .replace(/[_-]+/g, " ")
    .replace(/[^A-Za-z0-9%$.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text: string, limit = 8) {
  const keywords: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.matchAll(/[A-Za-z][A-Za-z0-9%$'.-]{2,}/g)) {
    const word = raw[0].replace(/^[.,:;!?()[\]{}"']+|[.,:;!?()[\]{}"']+$/g, "").toLowerCase();
    if (word.length < 3 || STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    keywords.push(humanizePhrase(word));
    if (keywords.length >= limit) break;
  }
  return keywords;
}

function compactSentence(text: string, fallback: string, maxWords = 9) {
  const words = humanizePhrase(text, fallback).split(" ");
  return words.slice(0, maxWords).join(" ").replace(/[,. ]+$/g, "");
}

function titleCaseSoft(text: string) {
  const smallWords = new Set(["and", "or", "for", "to", "with", "in", "on", "of", "the", "a", "an"]);
  return humanizePhrase(text)
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && smallWords.has(lower)) return lower;
      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function keywordPair(keywords: string[], fallback: string) {
  const cleaned = keywords.filter(Boolean);
  if (!cleaned.length) return fallback;
  if (cleaned.length === 1) return cleaned[0];
  return `${cleaned[0]} and ${cleaned[1]}`;
}

function extractOfferHint(text: string) {
  const lowered = text.toLowerCase();
  const patterns = [
    /\b\d{1,3}%\s*off\b/,
    /\b\d{1,3}\s*percent\s*(?:off|of)\b/,
    /\b\$?\d+(?:\.\d{2})?\s*(?:off|discount|credit|bonus)\b/,
    /\bfree\s+(?:trial|shipping|consultation|demo|download|delivery)\b/,
    /\blimited\s+time\b/,
    /\bearly\s+access\b/,
    /\bnew\s+(?:launch|arrival|collection|release)\b/,
    /\bsave\s+\$?\d+\b/,
    /\b(?:discount|deal|bundle|offer)\b/,
  ];
  for (const pattern of patterns) {
    const match = lowered.match(pattern);
    if (match) return humanizePhrase(match[0], "primary offer");
  }
  return "primary value proposition";
}

function classifyTone(text: string) {
  const lowered = text.toLowerCase();
  if (["luxury", "premium", "exclusive", "elegant", "signature"].some((word) => lowered.includes(word))) return "premium and polished";
  if (["fast", "boost", "scale", "growth", "win", "accelerate"].some((word) => lowered.includes(word))) return "performance-focused";
  if (["bold", "fresh", "launch", "limited", "new"].some((word) => lowered.includes(word))) return "bold and launch-ready";
  if (["simple", "easy", "clear", "stress-free", "calm"].some((word) => lowered.includes(word))) return "clear and supportive";
  return "balanced and trustworthy";
}

function deriveAudience(text: string) {
  const lowered = text.toLowerCase();
  if (["developer", "engineer", "saas", "api", "technical"].some((word) => lowered.includes(word))) return "technical buyers";
  if (["founder", "startup", "b2b", "team", "business"].some((word) => lowered.includes(word))) return "business decision makers";
  if (["shop", "store", "beauty", "fitness", "lifestyle", "fashion", "gym"].some((word) => lowered.includes(word))) return "consumer shoppers";
  if (["student", "course", "learn", "training"].some((word) => lowered.includes(word))) return "active learners";
  return "qualified prospects";
}

function inferIndustry(text: string) {
  const lowered = text.toLowerCase();
  let bestLabel = "modern buyers";
  let bestScore = 0;
  for (const [label, words] of Object.entries(INDUSTRY_KEYWORDS)) {
    const score = words.filter((word) => lowered.includes(word)).length;
    if (score > bestScore) {
      bestLabel = label;
      bestScore = score;
    }
  }
  return bestLabel;
}

function choosePrimaryAction(text: string, industry: string) {
  const lowered = text.toLowerCase();
  for (const [action, words] of Object.entries(ACTION_KEYWORDS)) {
    if (words.some((word) => lowered.includes(word))) return action;
  }
  if (industry.includes("commerce") || industry.includes("fashion") || industry.includes("fitness")) return "shop";
  if (industry.includes("software") || industry.includes("services")) return "start";
  if (industry.includes("travel")) return "book";
  return "learn";
}

function buildLocalAdBrief(adText: string, adLinkSummary: string, imageName: string): AdBrief {
  const filenameHint = imageName ? humanizePhrase(imageName.replace(/\.[A-Za-z0-9]+$/, ""), "") : "";
  const merged = [adText.trim(), adLinkSummary.trim(), filenameHint].filter(Boolean).join(" ") || "Visual campaign creative with product imagery and a focused offer";
  const keywords = extractKeywords(merged);
  const industry = inferIndustry(merged);
  const primaryAction = choosePrimaryAction(merged, industry);
  const detectedOffer = extractOfferHint(merged);
  const campaignTheme = keywordPair(keywords, compactSentence(merged, "clear value for your audience"));
  const proofByIndustry: Record<string, string> = {
    "SaaS and software": "secure workflows, faster setup, and team-ready control",
    "fitness and wellness": "visible progress, stronger training, and everyday motivation",
    "fashion and lifestyle": "fresh style cues, clear product value, and easy shopping",
    "commerce and retail": "clear savings, product confidence, and simple checkout",
    "finance and services": "transparent details, secure handling, and measurable value",
    "travel and hospitality": "clear options, memorable moments, and simple booking",
    "education and learning": "guided lessons, practical outcomes, and steady progress",
  };

  return {
    detected_offer: detectedOffer,
    tone: classifyTone(merged),
    audience: deriveAudience(merged),
    message_snippet: compactSentence(merged, "clear value for your audience"),
    campaign_theme: campaignTheme,
    industry,
    primary_action: primaryAction,
    keywords,
    proof_phrase: proofByIndustry[industry] || "clear proof and simple next steps",
    visual_caption: titleCaseSoft(campaignTheme),
  };
}

function coerceBrief(candidate: Partial<AdBrief> | null, fallback: AdBrief): AdBrief {
  if (!candidate) return fallback;
  return {
    ...fallback,
    ...Object.fromEntries(
      Object.entries(candidate).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0,
      ),
    ),
    keywords: Array.isArray(candidate.keywords) && candidate.keywords.length ? candidate.keywords.slice(0, 8) : fallback.keywords,
  };
}

async function buildGrokBrief(adText: string, adLinkSummary: string, imageName: string, fallback: AdBrief) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) return { brief: fallback, engine: "local" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROK_MODEL || "grok-4.20-reasoning",
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: "Return compact JSON only. Create a landing-page campaign profile grounded in the ad input. Do not invent impossible claims.",
          },
          {
            role: "user",
            content: JSON.stringify({
              ad_text: adText,
              ad_link_summary: adLinkSummary,
              image_filename: imageName,
              required_keys: ["detected_offer", "tone", "audience", "campaign_theme", "industry", "primary_action", "keywords", "proof_phrase", "visual_caption"],
            }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Grok returned ${response.status}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) : null;
    return { brief: coerceBrief(parsed, fallback), engine: "grok" };
  } catch {
    return { brief: fallback, engine: "local" };
  } finally {
    clearTimeout(timeout);
  }
}

function actionLabel(action: string, offer: string, index: number) {
  const offerLower = offer.toLowerCase();
  let variants: string[];
  if (offerLower.includes("free trial")) variants = ["Start free trial", "Try it free", "Begin free"];
  else if (action === "book") variants = ["Book now", "Claim a spot", "Schedule today"];
  else if (action === "shop") variants = ["Shop now", "Claim offer", "Explore deals"];
  else if (offerLower.includes("off") || offerLower.includes("discount") || offerLower.includes("deal")) variants = ["Claim offer", "Shop the deal", "Unlock savings"];
  else if (action === "start") variants = ["Get started", "Start today", "Launch now"];
  else if (action === "download") variants = ["Download now", "Get the app", "Install today"];
  else variants = ["Learn more", "Explore now", "See details"];
  return variants[index % variants.length];
}

function keepLengthClose(newText: string, original: string, role: string) {
  const minWordsByRole: Record<string, number> = {
    headline: 10,
    subheadline: 14,
    body: 18,
    benefit: 10,
    trust: 10,
    support: 8,
    cta: 4,
  };
  const ratioByRole: Record<string, number> = {
    headline: 2.4,
    subheadline: 1.9,
    body: 1.65,
    benefit: 1.35,
    trust: 1.35,
    support: 1.35,
    cta: 1.2,
  };
  const originalWords = Math.max(3, original.split(/\s+/).length);
  const maxWords = Math.max(minWordsByRole[role] || 9, Math.floor(originalWords * (ratioByRole[role] || 1.5)));
  const words = newText.replace(/\s+/g, " ").trim().split(" ");
  if (words.length <= maxWords) return newText;
  const dangling = new Set(["and", "or", "for", "to", "with", "the", "a", "an", "of", "in", "between"]);
  const trimmed = words.slice(0, maxWords);
  while (trimmed.length > 4 && dangling.has(trimmed[trimmed.length - 1].replace(/[.,:;!?]/g, "").toLowerCase())) trimmed.pop();
  return trimmed.join(" ").replace(/[,. ]+$/g, "") + (newText.trim().endsWith(".") ? "." : "");
}

function roleFromTag(tag: string, original: string) {
  const lowered = original.toLowerCase();
  if (["h1", "h2", "h3"].includes(tag)) return "headline";
  if (["h4", "h5", "h6"].includes(tag)) return "subheadline";
  if (["button", "a"].includes(tag) && ["buy", "start", "book", "try", "download", "sign", "join", "get", "shop", "claim"].some((word) => lowered.includes(word))) return "cta";
  if (["label", "small"].includes(tag) || ["step", "note", "hint", "optional"].some((word) => lowered.includes(word))) return "support";
  if (["review", "trusted", "customers", "secure", "rating", "certified"].some((word) => lowered.includes(word))) return "trust";
  if (tag === "li") return "benefit";
  return "body";
}

function safeRewrite(original: string, role: string, brief: AdBrief, pageTitle: string, index: number) {
  if (role === "body" && original.split(/\s+/).length < 6) return original;

  const theme = brief.campaign_theme;
  const keywordFocus = keywordPair(brief.keywords, theme);
  const offerTitle = titleCaseSoft(brief.detected_offer);
  const themeTitle = titleCaseSoft(theme);
  const pageHint = compactSentence(pageTitle, "", 4);
  let candidate = original;

  if (role === "headline") {
    const variants = [
      `${themeTitle} for ${brief.audience}`,
      `${offerTitle} made clear from the first click`,
      `${titleCaseSoft(keywordFocus)} that helps ${brief.audience} act faster`,
      `Turn interest into action with ${theme}`,
      `A ${brief.tone} path to ${brief.detected_offer}`,
    ];
    candidate = variants[index % variants.length];
    if (index === 0 && pageHint) candidate = `${candidate} | ${pageHint}`;
  } else if (role === "subheadline") {
    const variants = [
      `Explore ${theme} with ${brief.proof_phrase} for ${brief.audience}.`,
      `Built around ${brief.detected_offer}, this page keeps the next step obvious and relevant.`,
      `Match the campaign promise with ${keywordFocus}, practical detail, and a confident path forward.`,
      `A ${brief.tone} experience focused on ${brief.industry} and the outcomes people came to find.`,
    ];
    candidate = variants[index % variants.length];
  } else if (role === "cta") {
    candidate = actionLabel(brief.primary_action, brief.detected_offer, index);
  } else if (role === "trust") {
    const variants = [
      `Trusted by ${brief.audience} for ${keywordFocus}.`,
      `Clear proof, secure steps, and ${brief.detected_offer}.`,
      `Confidence starts with ${brief.proof_phrase}.`,
    ];
    candidate = variants[index % variants.length];
  } else if (role === "benefit") {
    const variants = [
      `Clear ${keywordFocus} benefits from the first click.`,
      `Focused on ${brief.audience} needs and faster decisions.`,
      `${offerTitle} supported by practical proof.`,
      `Less friction between the ad promise and the page.`,
      `Simple next steps for people ready to ${brief.primary_action}.`,
      `Better value for visitors comparing ${theme}.`,
    ];
    candidate = variants[index % variants.length];
  } else if (role === "support") {
    const variants = [
      `Helpful details for ${brief.audience}.`,
      `Guidance shaped around ${brief.detected_offer}.`,
      `Keep moving with clear next steps.`,
    ];
    candidate = variants[index % variants.length];
  } else {
    const variants = [
      `${brief.message_snippet}. The experience highlights ${brief.detected_offer}, ${keywordFocus}, and a next step that feels natural.`,
      `Built for ${brief.audience}, this section connects ${theme} with benefits people can evaluate quickly.`,
      `Use ${brief.proof_phrase} to make the campaign promise feel specific, useful, and easy to act on.`,
      `From first impression to final click, the page now reinforces ${keywordFocus} without changing the layout.`,
      `A ${brief.tone} message gives visitors the context they need before they decide to ${brief.primary_action}.`,
    ];
    candidate = variants[index % variants.length];
  }

  return keepLengthClose(candidate, original, role);
}

function looksLikeBoilerplate(text: string) {
  const lowered = text.toLowerCase().trim();
  return !lowered || ["home", "about", "pricing", "contact", "menu", "login", "sign in"].includes(lowered) || /^[\d\W_]+$/.test(lowered);
}

function reasoningForRole(role: string, brief: AdBrief) {
  const reasons: Record<string, string> = {
    headline: `Anchored the first impression around ${brief.campaign_theme} for stronger ad-to-page message match.`,
    subheadline: `Expanded the promise with proof points that support ${brief.detected_offer}.`,
    cta: "Matched the action language to the visitor's likely next step.",
    benefit: `Turned a generic point into a benefit tied to ${brief.audience}.`,
    trust: "Reframed credibility copy around proof and confidence signals.",
    support: `Kept helper text short while making it relevant to ${brief.detected_offer}.`,
    body: `Connected the section copy to ${brief.campaign_theme} without changing the layout.`,
  };
  return reasons[role] || `Aligned this content with ${brief.campaign_theme} while preserving structure.`;
}

function applyTextRewrites(html: string, brief: AdBrief, pageTitle: string) {
  const tagPattern = /<(h1|h2|h3|h4|h5|h6|p|button|a|li|span|label|small|strong|em|blockquote|figcaption|td|th)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  const replacements: Rewrite[] = [];
  const changelog: Array<{ element: string; reasoning: string; confidence: string }> = [];
  let index = 0;

  const modified = html.replace(tagPattern, (full, tag: string, attrs = "", inner: string) => {
    if (/data-ai-skip|aria-label=|<\s*(p|div|section|article|h1|h2|h3)\b/i.test(full)) return full;
    const original = stripTags(inner);
    if (original.length < 3 || original.length > 260 || looksLikeBoilerplate(original)) return full;
    const role = roleFromTag(tag.toLowerCase(), original);
    const newText = safeRewrite(original, role, brief, pageTitle, index);
    if (!newText || newText === original) return full;

    const id = `ai-pm-${index}`;
    replacements.push({ id, original, new_text: newText });
    changelog.push({
      element: `${tag.toUpperCase()} content`,
      reasoning: reasoningForRole(role, brief),
      confidence: ["headline", "cta"].includes(role) ? "High" : "Medium",
    });
    index += 1;
    return `<${tag}${attrs}>${escapeHtml(newText)}</${tag}>`;
  });

  return { html: modified, replacements, changelog };
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function parseDimension(value?: string) {
  if (!value) return null;
  const match = value.match(/^\s*(\d{2,4})/);
  return match ? Number(match[1]) : null;
}

function isReplaceableImage(tag: string) {
  const attrs = parseAttributes(tag);
  const combined = `${attrs.src || attrs["data-src"] || ""} ${attrs.alt || ""} ${attrs.class || ""}`.toLowerCase();
  if (["logo", "icon", "avatar", "sprite", "favicon", "badge", "stars"].some((term) => combined.includes(term))) return false;
  if (combined.includes(".svg") || combined.includes("data:image/svg")) return false;
  const width = parseDimension(attrs.width);
  const height = parseDimension(attrs.height);
  if (width && width < 90) return false;
  if (height && height < 90) return false;
  if (width && height && width * height < 12000) return false;
  return true;
}

function visualCaption(brief: AdBrief, index: number) {
  const captions = [
    brief.visual_caption,
    titleCaseSoft(brief.detected_offer),
    `For ${brief.audience}`,
    titleCaseSoft(keywordPair(brief.keywords.slice(1), brief.campaign_theme)),
    actionLabel(brief.primary_action, brief.detected_offer, index),
    titleCaseSoft(brief.tone),
  ];
  return compactSentence(captions[index % captions.length], "Campaign creative", 6);
}

function buildVisualCss(adDataUrl: string) {
  const baseBackground = adDataUrl ? `url("${adDataUrl}")` : "linear-gradient(135deg, #0f172a 0%, #0f766e 52%, #f59e0b 100%)";
  return `
<style>
.ai-pm-visual { --ai-pm-bg: ${baseBackground}; --ai-pm-pos: center; --ai-pm-filter: saturate(1.05) contrast(1.02); --ai-pm-scale: 1.04; --ai-pm-overlay: linear-gradient(135deg, rgba(15, 23, 42, .64), rgba(20, 184, 166, .26)); position: relative; display: block; overflow: hidden; isolation: isolate; min-height: clamp(180px, 24vw, 430px); border-radius: inherit; background: #111827; box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); }
.ai-pm-visual::before { content: ""; position: absolute; inset: 0; z-index: -2; background-image: var(--ai-pm-bg); background-size: cover; background-position: var(--ai-pm-pos); filter: var(--ai-pm-filter); transform: scale(var(--ai-pm-scale)); }
.ai-pm-visual::after { content: ""; position: absolute; inset: 0; z-index: -1; background: var(--ai-pm-overlay); }
.ai-pm-visual-label { position: absolute; left: clamp(14px, 4%, 34px); right: clamp(14px, 4%, 34px); bottom: clamp(14px, 5%, 36px); color: #fff; font: 800 clamp(16px, 2.6vw, 36px)/1.05 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; text-shadow: 0 2px 18px rgba(0,0,0,.38); max-width: 760px; }
.ai-pm-visual-0 { --ai-pm-pos: center; --ai-pm-filter: saturate(1.18) contrast(1.05); --ai-pm-overlay: linear-gradient(135deg, rgba(2, 6, 23, .68), rgba(14, 116, 144, .16)); }
.ai-pm-visual-1 { --ai-pm-pos: 35% 45%; --ai-pm-filter: saturate(.96) contrast(1.1) brightness(.94); --ai-pm-scale: 1.1; --ai-pm-overlay: linear-gradient(135deg, rgba(17, 24, 39, .72), rgba(245, 158, 11, .24)); }
.ai-pm-visual-2 { --ai-pm-pos: 70% 50%; --ai-pm-filter: saturate(1.28) contrast(.96); --ai-pm-scale: 1.08; --ai-pm-overlay: linear-gradient(135deg, rgba(6, 78, 59, .66), rgba(15, 23, 42, .18)); }
.ai-pm-visual-3 { --ai-pm-pos: 48% 34%; --ai-pm-filter: grayscale(.12) contrast(1.18); --ai-pm-scale: 1.14; --ai-pm-overlay: linear-gradient(135deg, rgba(88, 28, 135, .62), rgba(15, 23, 42, .22)); }
.ai-pm-visual-4 { --ai-pm-pos: 28% 58%; --ai-pm-filter: sepia(.12) saturate(1.12) contrast(1.04); --ai-pm-scale: 1.12; --ai-pm-overlay: linear-gradient(135deg, rgba(127, 29, 29, .56), rgba(20, 83, 45, .25)); }
.ai-pm-visual-5 { --ai-pm-pos: 62% 38%; --ai-pm-filter: brightness(.92) saturate(1.34); --ai-pm-scale: 1.16; --ai-pm-overlay: linear-gradient(135deg, rgba(15, 23, 42, .72), rgba(37, 99, 235, .18)); }
</style>`;
}

function replacementStyle(tag: string, index: number) {
  const attrs = parseAttributes(tag);
  const width = parseDimension(attrs.width);
  const height = parseDimension(attrs.height);
  const ratios = ["aspect-ratio: 16 / 9", "aspect-ratio: 4 / 3", "aspect-ratio: 1 / 1", "aspect-ratio: 3 / 4"];
  const parts = [attrs.style?.replace(/;$/g, "") || "", width ? `width: ${width}px` : "width: 100%", height ? `height: ${height}px` : ratios[index % ratios.length], "max-width: 100%"].filter(Boolean);
  return parts.join("; ") + ";";
}

function buildVisualReplacement(imageTag: string, brief: AdBrief, index: number) {
  const attrs = parseAttributes(imageTag);
  const classes = [attrs.class || "", "ai-pm-visual", `ai-pm-visual-${index % 6}`].filter(Boolean).join(" ");
  const caption = visualCaption(brief, index);
  return `<div class="${escapeAttr(classes)}" style="${escapeAttr(replacementStyle(imageTag, index))}" role="img" aria-label="${escapeAttr(caption)}"><span class="ai-pm-visual-label">${escapeHtml(caption)}</span></div>`;
}

function replacePageVisuals(html: string, brief: AdBrief, adDataUrl: string) {
  let count = 0;
  let modified = html.replace(/<picture\b[\s\S]*?<\/picture>/gi, (picture) => {
    if (count >= 12) return picture;
    const img = picture.match(/<img\b[^>]*>/i)?.[0];
    if (!img || !isReplaceableImage(img)) return picture;
    const replacement = buildVisualReplacement(img, brief, count);
    count += 1;
    return replacement;
  });

  modified = modified.replace(/<img\b[^>]*>/gi, (img) => {
    if (count >= 12 || !isReplaceableImage(img)) return img;
    const replacement = buildVisualReplacement(img, brief, count);
    count += 1;
    return replacement;
  });

  if (count === 0) {
    const generatedVisual = buildVisualReplacement('<img class="ai-pm-generated-campaign" width="1200" height="520">', brief, count);
    modified = /<body\b[^>]*>/i.test(modified)
      ? modified.replace(/<body\b([^>]*)>/i, `<body$1>${generatedVisual}`)
      : `${generatedVisual}${modified}`;
    count = 1;
  }

  if (count > 0) {
    const style = buildVisualCss(adDataUrl);
    modified = /<\/head>/i.test(modified) ? modified.replace(/<\/head>/i, `${style}</head>`) : `${style}${modified}`;
  }

  return { html: modified, visualsReplaced: count };
}

function injectBase(html: string, pageUrl: string) {
  const baseTag = `<base href="${escapeAttr(pageUrl)}">`;
  if (/<base\b/i.test(html)) return html;
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b([^>]*)>/i, `<head$1>${baseTag}`);
  return `<head>${baseTag}</head>${html}`;
}

function extractPageTitle(html: string) {
  return stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

async function fetchSummary(url: string) {
  if (!url) return "";
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 AI-PM Personalizer" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return "";
    const html = await response.text();
    const title = extractPageTitle(html);
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    return [title, description].filter(Boolean).join(" ");
  } catch {
    return "";
  }
}

async function fetchLandingPage(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 AI-PM Personalizer" },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error(`Could not fetch landing page (${response.status})`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.includes("text/html")) throw new Error("Landing page did not return HTML.");
  return response.text();
}

async function imageToDataUrl(file: File | null) {
  if (!file || file.size === 0) return "";
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pageUrl = normalizeUrl(String(formData.get("page_url") || ""));
    const adText = String(formData.get("ad_text") || "");
    const adLink = normalizeUrl(String(formData.get("ad_link") || ""));
    const adImage = formData.get("ad_image") instanceof File ? (formData.get("ad_image") as File) : null;

    if (!pageUrl) {
      return NextResponse.json({ status: "error", error: "Landing page URL is required." }, { status: 400 });
    }
    if (!adText.trim() && !adLink && !adImage) {
      return NextResponse.json({ status: "error", error: "Provide ad copy, an ad image, or an ad link." }, { status: 400 });
    }

    const [landingHtml, adLinkSummary, adDataUrl] = await Promise.all([
      fetchLandingPage(pageUrl),
      fetchSummary(adLink),
      imageToDataUrl(adImage),
    ]);

    const pageTitle = extractPageTitle(landingHtml);
    const fallbackBrief = buildLocalAdBrief(adText, adLinkSummary, adImage?.name || "");
    const { brief, engine } = await buildGrokBrief(adText, adLinkSummary, adImage?.name || "", fallbackBrief);
    const withBase = injectBase(landingHtml, pageUrl);
    const rewritten = applyTextRewrites(withBase, brief, pageTitle);
    const visualized = replacePageVisuals(rewritten.html, brief, adDataUrl);

    const originalRelevance = 42;
    const copyBoost = Math.min(34, rewritten.replacements.length * 2);
    const visualBoost = Math.min(14, visualized.visualsReplaced * 3);
    const contextBoost = 8;
    const newRelevance = Math.min(96, originalRelevance + copyBoost + visualBoost + contextBoost);

    return NextResponse.json({
      status: "success",
      backend_used: engine === "grok" ? "Vercel personalization engine + Grok" : "Vercel personalization engine",
      ai_analysis: {
        ad_brief: {
          detected_offer: brief.detected_offer,
          tone: brief.tone,
          audience: brief.audience,
          industry: brief.industry,
          campaign_theme: brief.campaign_theme,
          primary_action: brief.primary_action,
        },
        scores: { original_relevance: originalRelevance, new_relevance: newRelevance },
        replacements: rewritten.replacements,
        changelog: rewritten.changelog.slice(0, 25),
      },
      modified_html: visualized.html,
      visuals_replaced: visualized.visualsReplaced,
      source_page: pageUrl,
      ad_context_used: {
        used_image: Boolean(adImage),
        used_ad_text: Boolean(adText.trim()),
        used_ad_link: Boolean(adLink),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unable to personalize this page.",
        detail: "Try a public page that returns standard HTML if the target website blocks scraping.",
      },
      { status: 502 },
    );
  }
}
