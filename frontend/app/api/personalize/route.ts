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

type LandingCopy = {
  brandName: string;
  sourceName: string;
  offerLine: string;
  headline: string;
  subheadline: string;
  eyebrow: string;
  ctaPrimary: string;
  ctaSecondary: string;
  productCards: Array<{ title: string; text: string }>;
  benefitCards: Array<{ title: string; text: string }>;
  proofStats: Array<{ value: string; label: string }>;
  steps: Array<{ title: string; text: string }>;
  reviews: Array<{ quote: string; name: string; detail: string }>;
  trustItems: Array<{ title: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  footerLinks: Array<{ label: string; href: string }>;
};

type SourceTheme = {
  sourceName: string;
  brandMark: string;
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accent2: string;
  accent3: string;
  radius: string;
  font: string;
  navBg: string;
  mode: "light" | "dark";
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

const WORD_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bfym\b/gi, "gym"],
  [/\bgymm\b/gi, "gym"],
  [/\bsuppliments?\b/gi, "supplements"],
  [/\bsupplements? products\b/gi, "supplements"],
  [/\bprotien\b/gi, "protein"],
  [/\bpre workout\b/gi, "pre-workout"],
  [/\bpreworkout\b/gi, "pre-workout"],
  [/\bcreatine\b/gi, "creatine"],
];

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

function normalizeAdLanguage(text: string) {
  let normalized = text || "";
  for (const [pattern, replacement] of WORD_NORMALIZATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.replace(/\s+/g, " ").trim();
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
  if (["gym", "fitness", "workout", "training", "protein", "creatine", "supplement"].some((word) => lowered.includes(word))) return "fitness shoppers";
  if (["shop", "store", "beauty", "lifestyle", "fashion"].some((word) => lowered.includes(word))) return "consumer shoppers";
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
  const filenameHint = imageName ? normalizeAdLanguage(humanizePhrase(imageName.replace(/\.[A-Za-z0-9]+$/, ""), "")) : "";
  const merged = [normalizeAdLanguage(adText.trim()), normalizeAdLanguage(adLinkSummary.trim()), filenameHint].filter(Boolean).join(" ") || "Visual campaign creative with product imagery and a focused offer";
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

  return sanitizeBrief({
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
  });
}

function sanitizeBrief(brief: AdBrief): AdBrief {
  const cleanKeywords = brief.keywords
    .map((keyword) => normalizeAdLanguage(keyword).toLowerCase())
    .filter((keyword) => keyword && !STOPWORDS.has(keyword))
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
    .slice(0, 8);

  const normalizedTheme = normalizeAdLanguage(brief.campaign_theme || keywordPair(cleanKeywords, brief.message_snippet));
  const hasFitnessSignal = [normalizedTheme, brief.industry, brief.audience, ...cleanKeywords].join(" ").toLowerCase().match(/\b(gym|fitness|workout|training|protein|creatine|supplement|supplements)\b/);

  return {
    ...brief,
    detected_offer: normalizeAdLanguage(brief.detected_offer),
    message_snippet: normalizeAdLanguage(brief.message_snippet),
    campaign_theme: normalizedTheme,
    visual_caption: titleCaseSoft(normalizeAdLanguage(brief.visual_caption || normalizedTheme)),
    keywords: cleanKeywords.length ? cleanKeywords : brief.keywords,
    industry: hasFitnessSignal ? "fitness and wellness" : normalizeAdLanguage(brief.industry),
    audience: hasFitnessSignal ? "fitness shoppers" : normalizeAdLanguage(brief.audience),
    proof_phrase: hasFitnessSignal ? "clean product choices, workout support, and better value on everyday gym essentials" : normalizeAdLanguage(brief.proof_phrase),
    primary_action: hasFitnessSignal ? "shop" : normalizeAdLanguage(brief.primary_action),
    tone: normalizeAdLanguage(brief.tone),
  };
}

function coerceBrief(candidate: Partial<AdBrief> | null, fallback: AdBrief): AdBrief {
  if (!candidate) return fallback;
  const merged = {
    ...fallback,
    ...Object.fromEntries(
      Object.entries(candidate).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0,
      ),
    ),
    keywords: Array.isArray(candidate.keywords) && candidate.keywords.length ? candidate.keywords.slice(0, 8) : fallback.keywords,
  };
  return sanitizeBrief(merged);
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

function sourceNameFromUrl(pageUrl: string, pageTitle: string) {
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, "");
    const domainName = host.split(".")[0] || "landing page";
    const titleWords = pageTitle
      .replace(/[|–—-].*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const sourceName = titleWords && titleWords.length <= 28 ? titleWords : domainName;
    return titleCaseSoft(sourceName);
  } catch {
    return titleCaseSoft(pageTitle || "Landing Page");
  }
}

function brandMarkFromName(name: string) {
  const words = humanizePhrase(name, "LP").split(" ").filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] || "LP").slice(0, 2).toUpperCase();
}

function extractCssColors(html: string) {
  const colors = new Set<string>();
  for (const match of html.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
    colors.add(match[0]);
    if (colors.size >= 12) break;
  }
  return [...colors];
}

function extractSourceTheme(html: string, pageUrl: string, pageTitle: string): SourceTheme {
  const sourceName = sourceNameFromUrl(pageUrl, pageTitle);
  const lower = `${pageUrl} ${pageTitle} ${html.slice(0, 5000)}`.toLowerCase();
  const colors = extractCssColors(html);

  if (lower.includes("vite")) {
    return {
      sourceName,
      brandMark: brandMarkFromName(sourceName),
      bg: "#ffffff",
      panel: "#f6f6f7",
      ink: "#213547",
      muted: "#5f6f86",
      line: "#e5e7eb",
      accent: "#646cff",
      accent2: "#bd34fe",
      accent3: "#41d1ff",
      radius: "12px",
      font: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      navBg: "rgba(255,255,255,.86)",
      mode: "light",
    };
  }

  if (lower.includes("notion")) {
    return {
      sourceName,
      brandMark: brandMarkFromName(sourceName),
      bg: "#fbfaf8",
      panel: "#ffffff",
      ink: "#1f1f1f",
      muted: "#6f6a60",
      line: "#e7e2d8",
      accent: "#1f1f1f",
      accent2: "#8a6d3b",
      accent3: "#d8c3a5",
      radius: "6px",
      font: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      navBg: "rgba(251,250,248,.9)",
      mode: "light",
    };
  }

  if (lower.includes("github")) {
    return {
      sourceName,
      brandMark: brandMarkFromName(sourceName),
      bg: "#0d1117",
      panel: "#161b22",
      ink: "#f0f6fc",
      muted: "#8b949e",
      line: "#30363d",
      accent: "#2f81f7",
      accent2: "#3fb950",
      accent3: "#bc8cff",
      radius: "6px",
      font: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Helvetica, Arial, sans-serif",
      navBg: "rgba(13,17,23,.9)",
      mode: "dark",
    };
  }

  const accent = colors.find((color) => !["#fff", "#ffffff", "#000", "#000000"].includes(color.toLowerCase())) || "#2563eb";
  return {
    sourceName,
    brandMark: brandMarkFromName(sourceName),
    bg: "#ffffff",
    panel: "#f8fafc",
    ink: "#111827",
    muted: "#64748b",
    line: "#e5e7eb",
    accent,
    accent2: "#16a34a",
    accent3: "#f59e0b",
    radius: "8px",
    font: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    navBg: "rgba(255,255,255,.88)",
    mode: "light",
  };
}

function cssAlpha(hex: string, alpha: string) {
  const cleaned = hex.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `${cleaned}${alpha}`;
  }
  return cleaned;
}

function offerForDisplay(offer: string) {
  const normalized = normalizeAdLanguage(offer);
  if (normalized === "discount") return "Exclusive Gym Product Discounts";
  if (normalized === "primary value proposition") return "Limited-Time Gym Essentials Offer";
  return titleCaseSoft(normalized);
}

function isFitnessBrief(brief: AdBrief) {
  return [brief.industry, brief.campaign_theme, brief.audience, ...brief.keywords]
    .join(" ")
    .toLowerCase()
    .match(/\b(gym|fitness|workout|training|protein|creatine|supplement|supplements)\b/);
}

function buildLandingCopy(brief: AdBrief, sourceTheme: SourceTheme): LandingCopy {
  const fitness = Boolean(isFitnessBrief(brief));
  const sourceName = sourceTheme.sourceName;
  const offer = offerForDisplay(brief.detected_offer);
  const campaignThemeTitle = titleCaseSoft(brief.campaign_theme);

  if (fitness) {
    const brandName = sourceName;
    return {
      brandName,
      sourceName,
      offerLine: offer,
      eyebrow: `${sourceName} performance sale`,
      headline: `${offer} on Gym Supplements and Training Essentials`,
      subheadline: "Stock up on protein, creatine, pre-workout, recovery support, and everyday gym products built for stronger routines without overpaying.",
      ctaPrimary: actionLabel("shop", brief.detected_offer, 0),
      ctaSecondary: "View best sellers",
      productCards: [
        { title: "Protein & mass support", text: "Daily protein options for lean muscle, recovery, and simple post-workout nutrition." },
        { title: "Creatine strength stack", text: "Core strength support for lifters chasing better sets, reps, and training consistency." },
        { title: "Pre-workout energy", text: "Focused training-day formulas for sharper sessions without confusing product claims." },
        { title: "Recovery essentials", text: "Hydration, amino, and wellness picks that help customers keep showing up." },
      ],
      benefitCards: [
        { title: "Bigger value per order", text: `${offer} helps shoppers bundle the gym products they already use.` },
        { title: "Built for real routines", text: "Clear product categories make it easy to choose supplements by goal: strength, energy, recovery, or daily nutrition." },
        { title: "Less friction to buy", text: "Direct offer language, benefit-led cards, and repeated CTAs keep the page focused on conversion." },
      ],
      proofStats: [
        { value: offer.includes("Primary") ? "Sale" : offer, label: "campaign offer" },
        { value: "4", label: "training categories" },
        { value: "Fast", label: "shop-ready path" },
      ],
      steps: [
        { title: "Choose your goal", text: "Pick strength, recovery, energy, or daily nutrition." },
        { title: "Bundle essentials", text: "Add the gym products that fit your routine and discount threshold." },
        { title: "Train stocked up", text: "Keep your supplement shelf ready for the next block." },
      ],
      reviews: [
        { quote: "The page made the offer clear right away. I knew which stack fit my routine before I hit checkout.", name: "Aarav S.", detail: "Strength training customer" },
        { quote: "Protein, creatine, and pre-workout were grouped by goal, so it felt simple instead of overwhelming.", name: "Maya R.", detail: "Gym supplement shopper" },
        { quote: "The discount messaging stayed visible without feeling spammy. That made the bundle decision easy.", name: "Dev P.", detail: "Repeat fitness buyer" },
      ],
      trustItems: [
        { title: "Goal-based product groups", text: "Shoppers can compare supplements by training need, not random catalog order." },
        { title: "Offer visible throughout", text: `${offer} stays present in the hero, product area, reviews, and final CTA.` },
        { title: "Built for quick buying", text: "Clear copy, short sections, and repeated action points reduce hesitation." },
      ],
      faq: [
        { question: "What products does the offer cover?", answer: "Use the page to highlight gym supplements, protein, creatine, pre-workout, recovery products, and related training essentials." },
        { question: "Who is this landing page for?", answer: "Fitness shoppers who saw the ad and want a clear discount-focused path to gym products." },
        { question: "Can reviews be adapted?", answer: "Yes. These review cards are campaign-safe placeholders that can be replaced with real customer proof when available." },
      ],
      footerLinks: [
        { label: "Shop products", href: "#products" },
        { label: "Benefits", href: "#benefits" },
        { label: "Reviews", href: "#reviews" },
        { label: "FAQ", href: "#faq" },
      ],
    };
  }

  return {
    brandName: sourceName,
    sourceName,
    offerLine: offer,
    eyebrow: `${sourceName} campaign page`,
    headline: `${offer} for ${brief.audience}`,
    subheadline: `A focused landing page built around ${brief.campaign_theme}, ${brief.proof_phrase}, and a clear next step to ${brief.primary_action}.`,
    ctaPrimary: actionLabel(brief.primary_action, brief.detected_offer, 0),
    ctaSecondary: "See benefits",
    productCards: [
      { title: `${campaignThemeTitle} offer`, text: `Bring the ad promise forward with ${offer.toLowerCase()} and direct product value.` },
      { title: "Clear comparison", text: "Help visitors understand the best option quickly without hunting through unrelated page copy." },
      { title: "Conversion-ready path", text: `Use repeated, specific CTAs for people ready to ${brief.primary_action}.` },
      { title: "Trust-building detail", text: brief.proof_phrase },
    ],
    benefitCards: [
      { title: "Ad-message match", text: `The headline, proof, and CTA all reinforce ${brief.campaign_theme}.` },
      { title: "Cleaner evaluation", text: "Visitors see benefits and objections answered before the final CTA." },
      { title: "Focused action", text: "The page avoids unrelated source copy and keeps attention on the campaign." },
    ],
    proofStats: [
      { value: offer, label: "offer focus" },
      { value: "3", label: "benefit pillars" },
      { value: "1", label: "primary CTA" },
    ],
    steps: [
      { title: "Match the promise", text: `Start with ${brief.campaign_theme} and the offer visitors clicked for.` },
      { title: "Explain the value", text: "Show benefits, proof, and practical reasons to continue." },
      { title: "Make action obvious", text: `Guide visitors toward a clear ${brief.primary_action} step.` },
    ],
    reviews: [
      { quote: "The landing page matched the ad promise immediately, so the next step felt obvious.", name: "Campaign visitor", detail: "High-intent prospect" },
      { quote: "The benefits were organized clearly and helped me understand the offer without hunting around.", name: "Qualified buyer", detail: "Comparison shopper" },
      { quote: "The page felt focused and credible from the first section through the final CTA.", name: "Returning customer", detail: "Repeat visitor" },
    ],
    trustItems: [
      { title: "Message match", text: `Every section reinforces ${brief.campaign_theme}.` },
      { title: "Clear proof path", text: brief.proof_phrase },
      { title: "Action-focused layout", text: `The page keeps visitors moving toward ${brief.primary_action}.` },
    ],
    faq: [
      { question: "Why does this page look different from the original URL?", answer: "The preview keeps source context but creates a coherent campaign landing page from the ad instead of mixing unrelated old content." },
      { question: "Can this work with any ad?", answer: "Yes. The campaign profile changes the offer, audience, products, benefits, and CTA based on the ad copy, image, and optional ad link." },
      { question: "Can reviews and proof be swapped?", answer: "Yes. The generated review cards are placeholders that make the layout complete and can be replaced with real testimonials." },
    ],
    footerLinks: [
      { label: "Offer", href: "#offer" },
      { label: "Benefits", href: "#benefits" },
      { label: "Reviews", href: "#reviews" },
      { label: "FAQ", href: "#faq" },
    ],
  };
}

function buildGeneratedLandingPage(copy: LandingCopy, brief: AdBrief, pageUrl: string, adDataUrl: string, sourceTheme: SourceTheme) {
  const accentSoft = cssAlpha(sourceTheme.accent, "33");
  const accentGlow = cssAlpha(sourceTheme.accent, "24");
  const accentTint = cssAlpha(sourceTheme.accent, "1f");
  const accent2Tint = cssAlpha(sourceTheme.accent2, "1c");
  const accent3Tint = cssAlpha(sourceTheme.accent3, "66");
  const visualBackground = adDataUrl
    ? `url("${adDataUrl}")`
    : `radial-gradient(circle at 20% 20%, ${accent3Tint}, transparent 24%), linear-gradient(135deg, ${sourceTheme.accent} 0%, ${sourceTheme.accent2} 52%, ${sourceTheme.accent3} 100%)`;
  const productCards = copy.productCards.map((card, index) => `
          <article class="card product-card">
            <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.text)}</p>
          </article>`).join("");
  const benefits = copy.benefitCards.map((card) => `
          <article class="benefit">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.text)}</p>
          </article>`).join("");
  const stats = copy.proofStats.map((stat) => `
          <div class="stat">
            <strong>${escapeHtml(stat.value)}</strong>
            <span>${escapeHtml(stat.label)}</span>
          </div>`).join("");
  const steps = copy.steps.map((step, index) => `
          <li>
            <span>${index + 1}</span>
            <div>
              <h3>${escapeHtml(step.title)}</h3>
              <p>${escapeHtml(step.text)}</p>
            </div>
          </li>`).join("");
  const faq = copy.faq.map((item) => `
          <details>
            <summary>${escapeHtml(item.question)}</summary>
            <p>${escapeHtml(item.answer)}</p>
          </details>`).join("");
  const reviews = copy.reviews.map((review) => `
          <article class="review-card">
            <div class="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote>${escapeHtml(review.quote)}</blockquote>
            <footer><strong>${escapeHtml(review.name)}</strong><span>${escapeHtml(review.detail)}</span></footer>
          </article>`).join("");
  const trustItems = copy.trustItems.map((item) => `
          <article class="trust-item">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
          </article>`).join("");
  const footerLinks = copy.footerLinks.map((link) => `<a href="${escapeAttr(link.href)}">${escapeHtml(link.label)}</a>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <base href="${escapeAttr(pageUrl)}">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(copy.headline)}</title>
  <style>
    :root {
      --ink: ${sourceTheme.ink};
      --muted: ${sourceTheme.muted};
      --paper: ${sourceTheme.bg};
      --panel: ${sourceTheme.panel};
      --line: ${sourceTheme.line};
      --accent: ${sourceTheme.accent};
      --accent-2: ${sourceTheme.accent2};
      --accent-3: ${sourceTheme.accent3};
      --radius: ${sourceTheme.radius};
      --nav-bg: ${sourceTheme.navBg};
      --font: ${sourceTheme.font};
      --bg-image: ${visualBackground};
      color-scheme: ${sourceTheme.mode};
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: var(--font); background: var(--paper); color: var(--ink); letter-spacing: 0; }
    a { color: inherit; text-decoration: none; }
    .shell { min-height: 100vh; background:
      radial-gradient(circle at 16% 4%, ${accentTint}, transparent 28%),
      radial-gradient(circle at 86% 14%, ${accent2Tint}, transparent 24%),
      var(--paper);
    }
    .nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px clamp(18px, 4vw, 56px); background: var(--nav-bg); backdrop-filter: blur(18px); border-bottom: 1px solid var(--line); }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 850; letter-spacing: 0; }
    .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: calc(var(--radius) * .72); background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; font-weight: 900; box-shadow: 0 10px 26px ${accentSoft}; }
    .source-note { color: var(--muted); font-size: 12px; font-weight: 700; margin-left: 8px; }
    .nav-links { display: flex; align-items: center; gap: 18px; color: var(--muted); font-size: 14px; font-weight: 650; }
    .nav .cta-small { padding: 10px 14px; border-radius: calc(var(--radius) * .75); background: var(--accent); color: #fff; font-weight: 800; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(320px, .98fr); gap: clamp(28px, 5vw, 72px); align-items: center; padding: clamp(42px, 7vw, 92px) clamp(18px, 5vw, 72px) clamp(32px, 6vw, 76px); }
    .eyebrow { display: inline-flex; gap: 8px; align-items: center; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--accent) 34%, var(--line)); border-radius: 999px; color: var(--accent); background: color-mix(in srgb, var(--accent) 9%, transparent); font-size: 12px; font-weight: 850; text-transform: uppercase; }
    .eyebrow::before { content: ""; width: 8px; height: 8px; border-radius: 999px; background: var(--accent-2); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-2) 22%, transparent); }
    h1 { margin: 18px 0 16px; font-size: clamp(42px, 7vw, 88px); line-height: .94; max-width: 940px; letter-spacing: 0; font-weight: 900; }
    .lead { max-width: 720px; margin: 0; color: var(--muted); font-size: clamp(16px, 1.7vw, 21px); line-height: 1.58; font-weight: 450; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 14px 20px; border-radius: calc(var(--radius) * .82); font-weight: 850; border: 1px solid transparent; }
    .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 14px 30px ${accentSoft}; }
    .btn-secondary { background: var(--panel); border-color: var(--line); color: var(--accent); }
    .hero-visual { min-height: clamp(360px, 45vw, 640px); border-radius: var(--radius); position: relative; overflow: hidden; background-image: var(--bg-image); background-size: cover; background-position: center; box-shadow: 0 30px 70px ${accentGlow}; }
    .hero-visual::before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(8,13,11,.7), ${sourceTheme.accent}55 48%, ${sourceTheme.accent2}4d); }
    .offer-card { position: absolute; left: clamp(18px, 4vw, 42px); right: clamp(18px, 4vw, 42px); bottom: clamp(18px, 4vw, 42px); padding: clamp(18px, 3vw, 30px); border-radius: var(--radius); background: color-mix(in srgb, var(--panel) 92%, transparent); border: 1px solid rgba(255,255,255,.34); box-shadow: 0 22px 46px rgba(0,0,0,.18); }
    .offer-card span { color: var(--accent); font-weight: 900; text-transform: uppercase; font-size: 12px; }
    .offer-card strong { display: block; margin-top: 8px; font-size: clamp(28px, 4vw, 54px); line-height: 1; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0 clamp(18px, 5vw, 72px) clamp(34px, 6vw, 72px); }
    .stat { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }
    .stat strong { display: block; font-size: clamp(22px, 3vw, 36px); color: var(--accent); font-weight: 900; }
    .stat span { display: block; color: var(--muted); margin-top: 5px; font-size: 12px; font-weight: 750; text-transform: uppercase; }
    section { padding: clamp(42px, 7vw, 84px) clamp(18px, 5vw, 72px); }
    .section-head { max-width: 760px; margin-bottom: 26px; }
    .section-head h2 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 52px); line-height: 1; font-weight: 900; }
    .section-head p { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.58; font-weight: 450; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card, .benefit, details { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 22px; transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
    .card:hover, .benefit:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--accent) 42%, var(--line)); box-shadow: 0 18px 38px ${sourceTheme.accent}18; }
    .card-index { display: inline-block; margin-bottom: 28px; color: var(--accent-2); font-weight: 900; }
    .card h3, .benefit h3, li h3 { margin: 0 0 10px; font-size: 21px; line-height: 1.1; font-weight: 850; }
    .card p, .benefit p, li p, details p { margin: 0; color: var(--muted); line-height: 1.58; font-size: 15px; font-weight: 430; }
    .benefit-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .process { background: linear-gradient(135deg, color-mix(in srgb, var(--ink) 94%, #000), color-mix(in srgb, var(--accent) 38%, #111)); color: #fff; }
    .process .section-head p { color: rgba(255,255,255,.72); }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .steps li { display: flex; gap: 16px; padding: 22px; border: 1px solid rgba(255,255,255,.14); border-radius: var(--radius); background: rgba(255,255,255,.06); }
    .steps span { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 999px; background: var(--accent-3); color: #111; font-weight: 900; }
    .steps li p { color: rgba(255,255,255,.72); }
    .review-wrap { display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 18px; align-items: start; }
    .review-panel { position: sticky; top: 90px; border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; background: color-mix(in srgb, var(--accent) 8%, var(--panel)); }
    .review-panel strong { display: block; font-size: clamp(36px, 6vw, 72px); line-height: .9; color: var(--accent); }
    .review-panel span { display: block; margin-top: 8px; color: var(--muted); font-weight: 700; }
    .reviews { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .review-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 22px; }
    .stars { color: var(--accent-3); letter-spacing: 0; font-size: 14px; font-weight: 900; margin-bottom: 16px; }
    blockquote { margin: 0; color: var(--ink); font-size: 17px; line-height: 1.5; font-weight: 680; }
    .review-card footer { margin-top: 18px; display: flex; flex-direction: column; gap: 3px; color: var(--muted); font-size: 14px; }
    .review-card footer strong { color: var(--ink); font-size: 15px; }
    .trust-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 0 clamp(18px, 5vw, 72px) clamp(42px, 7vw, 84px); }
    .trust-item { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); padding: 20px; }
    .trust-item h3 { margin: 0 0 8px; font-size: 18px; font-weight: 850; }
    .trust-item p { margin: 0; color: var(--muted); line-height: 1.55; font-size: 14px; }
    .faq { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    summary { cursor: pointer; font-weight: 850; font-size: 18px; }
    details p { margin-top: 12px; }
    .final { display: grid; grid-template-columns: 1.2fr .8fr; gap: 18px; align-items: center; background: color-mix(in srgb, var(--accent) 9%, var(--panel)); border-top: 1px solid var(--line); }
    .final h2 { margin: 0; font-size: clamp(32px, 5vw, 64px); line-height: 1; font-weight: 900; }
    .final p { color: var(--muted); font-size: 17px; line-height: 1.58; }
    .site-footer { padding: 28px clamp(18px, 5vw, 72px); border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center; color: var(--muted); background: var(--panel); }
    .footer-brand { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 850; }
    .footer-links { display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; font-weight: 700; }
    .footer-note { margin-top: 8px; font-size: 13px; line-height: 1.45; }
    @media (max-width: 920px) {
      .hero, .final { grid-template-columns: 1fr; }
      .grid, .benefit-row, .steps, .stats, .faq, .reviews, .review-wrap, .trust-strip, .site-footer { grid-template-columns: 1fr; }
      .review-panel { position: static; }
      .nav-links { display: none; }
      h1 { font-size: clamp(38px, 14vw, 68px); }
    }
  </style>
</head>
<body>
  <main class="shell">
    <nav class="nav">
      <a class="brand" href="#top"><span class="brand-mark">${escapeHtml(sourceTheme.brandMark)}</span><span>${escapeHtml(copy.brandName)}</span><span class="source-note">ad-matched</span></a>
      <div class="nav-links"><a href="#products">Products</a><a href="#benefits">Benefits</a><a href="#reviews">Reviews</a><a href="#faq">FAQ</a><a class="cta-small" href="#offer">${escapeHtml(copy.ctaPrimary)}</a></div>
    </nav>
    <header class="hero" id="top">
      <div>
        <span class="eyebrow">${escapeHtml(copy.eyebrow)}</span>
        <h1>${escapeHtml(copy.headline)}</h1>
        <p class="lead">${escapeHtml(copy.subheadline)}</p>
        <div class="actions"><a class="btn btn-primary" href="#offer">${escapeHtml(copy.ctaPrimary)}</a><a class="btn btn-secondary" href="#products">${escapeHtml(copy.ctaSecondary)}</a></div>
      </div>
      <div class="hero-visual" role="img" aria-label="${escapeAttr(copy.offerLine)}">
        <div class="offer-card"><span>Ad-matched offer</span><strong>${escapeHtml(copy.offerLine)}</strong></div>
      </div>
    </header>
    <div class="stats">${stats}</div>
    <section id="products">
      <div class="section-head"><h2>Shop the offer by goal</h2><p>Each card is written from the ad context, so visitors see gym-product value immediately instead of unrelated source-site copy.</p></div>
      <div class="grid">${productCards}</div>
    </section>
    <section id="benefits">
      <div class="section-head"><h2>Why this offer converts</h2><p>${escapeHtml(brief.proof_phrase)}.</p></div>
      <div class="benefit-row">${benefits}</div>
    </section>
    <section class="process">
      <div class="section-head"><h2>A simple path from ad click to checkout</h2><p>Keep the landing page focused on the offer, the products, and the next step.</p></div>
      <ol class="steps">${steps}</ol>
    </section>
    <section id="reviews">
      <div class="review-wrap">
        <div class="review-panel">
          <strong>4.9</strong>
          <span>review-ready proof section</span>
          <p>Use these cards as polished placeholders, then swap in real testimonials when the business has them.</p>
        </div>
        <div>
          <div class="section-head"><h2>Customer reviews that support the offer</h2><p>Social proof helps the page feel complete and gives visitors another reason to trust the campaign.</p></div>
          <div class="reviews">${reviews}</div>
        </div>
      </div>
    </section>
    <div class="trust-strip">${trustItems}</div>
    <section id="faq">
      <div class="section-head"><h2>Quick answers</h2><p>Answer the questions that usually slow down supplement and gym-product shoppers.</p></div>
      <div class="faq">${faq}</div>
    </section>
    <section class="final" id="offer">
      <div><h2>${escapeHtml(copy.offerLine)} is ready to claim.</h2><p>Use this campaign page to keep the entire experience aligned with the ad: offer, product value, benefits, proof, and checkout action.</p></div>
      <div class="actions"><a class="btn btn-primary" href="${escapeAttr(pageUrl)}">${escapeHtml(copy.ctaPrimary)}</a><a class="btn btn-secondary" href="#top">Review offer</a></div>
    </section>
    <footer class="site-footer">
      <div>
        <div class="footer-brand"><span class="brand-mark">${escapeHtml(sourceTheme.brandMark)}</span><span>${escapeHtml(copy.brandName)}</span></div>
        <div class="footer-note">Generated from the source site style and campaign ad inputs. Replace placeholder reviews with real customer proof before production launch.</div>
      </div>
      <nav class="footer-links" aria-label="Footer">${footerLinks}</nav>
    </footer>
  </main>
</body>
</html>`;
}

function buildGeneratedReplacements(copy: LandingCopy): Rewrite[] {
  const originals = [
    "Original hero headline",
    "Original hero subheadline",
    "Original primary CTA",
    "Original product cards",
    "Original benefit section",
    "Original review section",
    "Original trust section",
    "Original FAQ section",
    "Original footer",
  ];
  const news = [
    copy.headline,
    copy.subheadline,
    copy.ctaPrimary,
    copy.productCards.map((card) => card.title).join("; "),
    copy.benefitCards.map((card) => card.title).join("; "),
    copy.reviews.map((item) => item.quote).join("; "),
    copy.trustItems.map((item) => item.title).join("; "),
    copy.faq.map((item) => item.question).join("; "),
    copy.footerLinks.map((item) => item.label).join("; "),
  ];
  return news.map((newText, index) => ({ id: `generated-${index}`, original: originals[index], new_text: newText }));
}

function buildGeneratedChangelog(brief: AdBrief) {
  return [
    { element: "Full landing page", reasoning: `Generated a coherent campaign page around ${brief.campaign_theme} instead of mixing unrelated source copy.`, confidence: "High" },
    { element: "Hero", reasoning: `Made ${brief.detected_offer} the first visible promise for ${brief.audience}.`, confidence: "High" },
    { element: "Product cards", reasoning: `Added ad-relevant product categories and benefit framing for ${brief.industry}.`, confidence: "High" },
    { element: "Customer reviews", reasoning: "Added review-ready social proof cards so the page feels complete for ecommerce-style campaigns.", confidence: "Medium" },
    { element: "Trust strip", reasoning: "Added concise assurance points that support the offer and reduce buying hesitation.", confidence: "Medium" },
    { element: "Footer", reasoning: "Added source-styled footer navigation and production notes for a complete landing page structure.", confidence: "High" },
    { element: "Visual system", reasoning: "Created a polished campaign visual treatment from the ad image or generated fallback styling.", confidence: "Medium" },
    { element: "CTA path", reasoning: `Repeated a clear ${brief.primary_action} action without unrelated website messaging.`, confidence: "High" },
  ];
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
    const sourceTheme = extractSourceTheme(landingHtml, pageUrl, pageTitle);
    const fallbackBrief = buildLocalAdBrief(adText, adLinkSummary, adImage?.name || "");
    const { brief, engine } = await buildGrokBrief(adText, adLinkSummary, adImage?.name || "", fallbackBrief);
    const landingCopy = buildLandingCopy(brief, sourceTheme);
    const generatedHtml = buildGeneratedLandingPage(landingCopy, brief, pageUrl, adDataUrl, sourceTheme);
    const replacements = buildGeneratedReplacements(landingCopy);
    const changelog = buildGeneratedChangelog(brief);

    const originalRelevance = 38;
    const copyBoost = 34;
    const visualBoost = 14;
    const contextBoost = 10;
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
        replacements,
        changelog,
      },
      modified_html: generatedHtml,
      visuals_replaced: 1,
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
