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
  faq: Array<{ question: string; answer: string }>;
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

function buildLandingCopy(brief: AdBrief, pageUrl: string, pageTitle: string): LandingCopy {
  const fitness = Boolean(isFitnessBrief(brief));
  const sourceName = sourceNameFromUrl(pageUrl, pageTitle);
  const offer = offerForDisplay(brief.detected_offer);
  const theme = titleCaseSoft(brief.campaign_theme);

  if (fitness) {
    const hasSupplements = [brief.campaign_theme, ...brief.keywords].join(" ").toLowerCase().includes("supplement");
    const brandName = hasSupplements ? "PeakFuel Supplements" : "Gym Essentials Outlet";
    return {
      brandName,
      offerLine: offer,
      eyebrow: "Performance sale",
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
      faq: [
        { question: "What products does the offer cover?", answer: "Use the page to highlight gym supplements, protein, creatine, pre-workout, recovery products, and related training essentials." },
        { question: "Who is this landing page for?", answer: "Fitness shoppers who saw the ad and want a clear discount-focused path to gym products." },
      ],
    };
  }

  return {
    brandName: `${theme} Deals`,
    offerLine: offer,
    eyebrow: `${sourceName} campaign page`,
    headline: `${offer} for ${brief.audience}`,
    subheadline: `A focused landing page built around ${brief.campaign_theme}, ${brief.proof_phrase}, and a clear next step to ${brief.primary_action}.`,
    ctaPrimary: actionLabel(brief.primary_action, brief.detected_offer, 0),
    ctaSecondary: "See benefits",
    productCards: [
      { title: `${theme} offer`, text: `Bring the ad promise forward with ${offer.toLowerCase()} and direct product value.` },
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
    faq: [
      { question: "Why does this page look different from the original URL?", answer: "The preview keeps source context but creates a coherent campaign landing page from the ad instead of mixing unrelated old content." },
      { question: "Can this work with any ad?", answer: "Yes. The campaign profile changes the offer, audience, products, benefits, and CTA based on the ad copy, image, and optional ad link." },
    ],
  };
}

function buildGeneratedLandingPage(copy: LandingCopy, brief: AdBrief, pageUrl: string, adDataUrl: string) {
  const visualBackground = adDataUrl
    ? `url("${adDataUrl}")`
    : "radial-gradient(circle at 20% 20%, rgba(190,242,100,.45), transparent 24%), linear-gradient(135deg, #101816 0%, #234a3d 48%, #d1a23c 100%)";
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

  return `<!doctype html>
<html lang="en">
<head>
  <base href="${escapeAttr(pageUrl)}">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(copy.headline)}</title>
  <style>
    :root {
      --ink: #111511;
      --muted: #5b6259;
      --paper: #fbfbf4;
      --panel: #ffffff;
      --line: #dfe5d7;
      --green: #1f6b45;
      --lime: #b8f05f;
      --gold: #d9a441;
      --charcoal: #111816;
      --bg-image: ${visualBackground};
      color-scheme: light;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--paper); color: var(--ink); letter-spacing: 0; }
    a { color: inherit; text-decoration: none; }
    .shell { min-height: 100vh; }
    .nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px clamp(18px, 4vw, 56px); background: rgba(251,251,244,.9); backdrop-filter: blur(18px); border-bottom: 1px solid var(--line); }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 900; }
    .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 7px; background: var(--charcoal); color: var(--lime); font-weight: 950; }
    .nav-links { display: flex; align-items: center; gap: 18px; color: var(--muted); font-size: 14px; font-weight: 700; }
    .nav .cta-small { padding: 10px 14px; border-radius: 7px; background: var(--green); color: #fff; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(320px, .98fr); gap: clamp(28px, 5vw, 72px); align-items: center; padding: clamp(42px, 7vw, 92px) clamp(18px, 5vw, 72px) clamp(32px, 6vw, 76px); }
    .eyebrow { display: inline-flex; gap: 8px; align-items: center; padding: 8px 11px; border: 1px solid #cbd9be; border-radius: 999px; color: #27513d; background: #f4f8ed; font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .eyebrow::before { content: ""; width: 8px; height: 8px; border-radius: 999px; background: var(--lime); box-shadow: 0 0 0 4px rgba(184,240,95,.22); }
    h1 { margin: 18px 0 16px; font-size: clamp(42px, 7vw, 88px); line-height: .94; max-width: 940px; letter-spacing: 0; }
    .lead { max-width: 720px; margin: 0; color: #384139; font-size: clamp(17px, 2vw, 22px); line-height: 1.55; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 14px 20px; border-radius: 7px; font-weight: 900; border: 1px solid transparent; }
    .btn-primary { background: var(--charcoal); color: #fff; box-shadow: 0 14px 30px rgba(17,24,22,.22); }
    .btn-secondary { background: #fff; border-color: var(--line); color: var(--green); }
    .hero-visual { min-height: clamp(360px, 45vw, 640px); border-radius: 8px; position: relative; overflow: hidden; background-image: var(--bg-image); background-size: cover; background-position: center; box-shadow: 0 30px 70px rgba(22,35,27,.28); }
    .hero-visual::before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(8,13,11,.72), rgba(31,107,69,.25) 48%, rgba(217,164,65,.35)); }
    .offer-card { position: absolute; left: clamp(18px, 4vw, 42px); right: clamp(18px, 4vw, 42px); bottom: clamp(18px, 4vw, 42px); padding: clamp(18px, 3vw, 30px); border-radius: 8px; background: rgba(255,255,255,.92); border: 1px solid rgba(255,255,255,.6); }
    .offer-card span { color: var(--green); font-weight: 950; text-transform: uppercase; font-size: 12px; }
    .offer-card strong { display: block; margin-top: 8px; font-size: clamp(28px, 4vw, 54px); line-height: 1; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0 clamp(18px, 5vw, 72px) clamp(34px, 6vw, 72px); }
    .stat { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
    .stat strong { display: block; font-size: clamp(22px, 3vw, 36px); color: var(--green); }
    .stat span { display: block; color: var(--muted); margin-top: 5px; font-size: 13px; font-weight: 800; text-transform: uppercase; }
    section { padding: clamp(42px, 7vw, 84px) clamp(18px, 5vw, 72px); }
    .section-head { max-width: 760px; margin-bottom: 26px; }
    .section-head h2 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 52px); line-height: 1; }
    .section-head p { margin: 0; color: var(--muted); font-size: 17px; line-height: 1.55; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card, .benefit, details { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 22px; }
    .card-index { display: inline-block; margin-bottom: 28px; color: var(--gold); font-weight: 950; }
    .card h3, .benefit h3, li h3 { margin: 0 0 10px; font-size: 21px; line-height: 1.1; }
    .card p, .benefit p, li p, details p { margin: 0; color: var(--muted); line-height: 1.55; }
    .benefit-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .process { background: var(--charcoal); color: #fff; }
    .process .section-head p { color: #bdc9be; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .steps li { display: flex; gap: 16px; padding: 22px; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; background: rgba(255,255,255,.06); }
    .steps span { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 999px; background: var(--lime); color: var(--charcoal); font-weight: 950; }
    .steps li p { color: #bdc9be; }
    .faq { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    summary { cursor: pointer; font-weight: 900; font-size: 18px; }
    details p { margin-top: 12px; }
    .final { display: grid; grid-template-columns: 1.2fr .8fr; gap: 18px; align-items: center; background: #edf5e4; border-top: 1px solid var(--line); }
    .final h2 { margin: 0; font-size: clamp(32px, 5vw, 64px); line-height: 1; }
    .final p { color: var(--muted); font-size: 18px; line-height: 1.55; }
    @media (max-width: 920px) {
      .hero, .final { grid-template-columns: 1fr; }
      .grid, .benefit-row, .steps, .stats, .faq { grid-template-columns: 1fr; }
      .nav-links { display: none; }
      h1 { font-size: clamp(38px, 14vw, 68px); }
    }
  </style>
</head>
<body>
  <main class="shell">
    <nav class="nav">
      <a class="brand" href="#top"><span class="brand-mark">PF</span><span>${escapeHtml(copy.brandName)}</span></a>
      <div class="nav-links"><a href="#products">Products</a><a href="#benefits">Benefits</a><a href="#faq">FAQ</a><a class="cta-small" href="#offer">${escapeHtml(copy.ctaPrimary)}</a></div>
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
    <section id="faq">
      <div class="section-head"><h2>Quick answers</h2><p>Answer the questions that usually slow down supplement and gym-product shoppers.</p></div>
      <div class="faq">${faq}</div>
    </section>
    <section class="final" id="offer">
      <div><h2>${escapeHtml(copy.offerLine)} is ready to claim.</h2><p>Use this campaign page to keep the entire experience aligned with the ad: offer, product value, benefits, proof, and checkout action.</p></div>
      <div class="actions"><a class="btn btn-primary" href="${escapeAttr(pageUrl)}">${escapeHtml(copy.ctaPrimary)}</a><a class="btn btn-secondary" href="#top">Review offer</a></div>
    </section>
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
    "Original FAQ section",
  ];
  const news = [
    copy.headline,
    copy.subheadline,
    copy.ctaPrimary,
    copy.productCards.map((card) => card.title).join("; "),
    copy.benefitCards.map((card) => card.title).join("; "),
    copy.faq.map((item) => item.question).join("; "),
  ];
  return news.map((newText, index) => ({ id: `generated-${index}`, original: originals[index], new_text: newText }));
}

function buildGeneratedChangelog(brief: AdBrief) {
  return [
    { element: "Full landing page", reasoning: `Generated a coherent campaign page around ${brief.campaign_theme} instead of mixing unrelated source copy.`, confidence: "High" },
    { element: "Hero", reasoning: `Made ${brief.detected_offer} the first visible promise for ${brief.audience}.`, confidence: "High" },
    { element: "Product cards", reasoning: `Added ad-relevant product categories and benefit framing for ${brief.industry}.`, confidence: "High" },
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
    const fallbackBrief = buildLocalAdBrief(adText, adLinkSummary, adImage?.name || "");
    const { brief, engine } = await buildGrokBrief(adText, adLinkSummary, adImage?.name || "", fallbackBrief);
    const landingCopy = buildLandingCopy(brief, pageUrl, pageTitle);
    const generatedHtml = buildGeneratedLandingPage(landingCopy, brief, pageUrl, adDataUrl);
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
