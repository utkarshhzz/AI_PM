from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup, NavigableString
from urllib.parse import urlparse
from typing import Any, Dict, List, Optional
import re
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def normalize_url(url: str) -> str:
    cleaned = url.strip()
    if not cleaned:
        return cleaned
    parsed = urlparse(cleaned)
    if not parsed.scheme:
        cleaned = f"https://{cleaned}"
    reparsed = urlparse(cleaned)
    if reparsed.scheme not in ["http", "https"]:
        return ""
    return cleaned

STOPWORDS = {
    "about", "above", "after", "again", "against", "already", "also", "and", "are",
    "because", "been", "before", "being", "between", "bold", "book", "busy", "but", "calm", "can", "could", "did",
    "does", "doing", "done", "each", "every", "for", "from", "get", "had", "has",
    "free", "have", "here", "into", "just", "launch", "like", "made", "make", "more",
    "most", "new", "not", "now", "off", "offer", "our", "out", "over", "own",
    "page", "percent", "plus", "premium", "see", "she", "should", "simple", "start", "than", "that", "the",
    "their", "them", "then", "there", "these", "they", "this", "through", "today",
    "too", "try", "use", "using", "very", "was", "way", "week", "were", "when",
    "where", "which", "while", "with", "you", "your",
}

INDUSTRY_KEYWORDS = {
    "SaaS and software": ["software", "saas", "platform", "workflow", "dashboard", "api", "automation", "developer", "team"],
    "fitness and wellness": ["fitness", "gym", "training", "workout", "coach", "wellness", "health", "nutrition"],
    "fashion and lifestyle": ["fashion", "style", "wear", "apparel", "sneaker", "shoe", "beauty", "skin", "lifestyle"],
    "commerce and retail": ["shop", "store", "shipping", "cart", "ecommerce", "retail", "sale", "discount"],
    "finance and services": ["finance", "bank", "payment", "insurance", "loan", "tax", "invest", "secure"],
    "travel and hospitality": ["travel", "hotel", "trip", "stay", "flight", "booking", "restaurant", "food"],
    "education and learning": ["course", "learn", "class", "student", "training", "academy", "lesson"],
}

ACTION_KEYWORDS = {
    "shop": ["shop", "buy", "store", "cart", "shipping", "sale", "discount"],
    "book": ["book", "demo", "call", "consultation", "appointment", "reservation"],
    "start": ["start", "trial", "free", "signup", "sign up", "join"],
    "download": ["download", "install", "app"],
    "learn": ["learn", "guide", "course", "webinar"],
}

def humanize_phrase(text: str, fallback: str = "campaign") -> str:
    cleaned = re.sub(r"[_\-]+", " ", text or "")
    cleaned = re.sub(r"[^A-Za-z0-9%$.\s]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or fallback

def extract_keywords(text: str, limit: int = 7) -> List[str]:
    seen = set()
    keywords: List[str] = []
    for raw in re.findall(r"[A-Za-z][A-Za-z0-9%$'.-]{2,}", text):
        word = raw.strip(".,:;!?()[]{}\"'").lower()
        if len(word) < 3 or word in STOPWORDS:
            continue
        if word in seen:
            continue
        seen.add(word)
        keywords.append(humanize_phrase(word))
        if len(keywords) >= limit:
            break
    return keywords

def compact_sentence(text: str, fallback: str, max_words: int = 8) -> str:
    cleaned = humanize_phrase(text, fallback)
    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])
    return cleaned.strip(" ,.")

def extract_offer_hint(text: str) -> str:
    lowered = text.lower()
    offer_patterns = [
        r"\b\d{1,3}%\s*off\b",
        r"\b\d{1,3}\s*percent\s*(?:off|of)\b",
        r"\b\$?\d+(?:\.\d{2})?\s*(?:off|discount|credit|bonus)\b",
        r"\bfree\s+(?:trial|shipping|consultation|demo|download|delivery)\b",
        r"\blimited\s+time\b",
        r"\bearly\s+access\b",
        r"\bnew\s+(?:launch|arrival|collection|release)\b",
        r"\bsave\s+\$?\d+\b",
        r"\b(?:discount|deal|bundle|offer)\b",
    ]
    for pattern in offer_patterns:
        match = re.search(pattern, lowered)
        if match:
            return humanize_phrase(match.group(0).strip(), "primary offer")
    return "primary value proposition"

def classify_tone(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ["luxury", "premium", "exclusive", "elegant", "signature"]):
        return "premium and polished"
    if any(word in lowered for word in ["fast", "boost", "scale", "growth", "win", "accelerate"]):
        return "performance-focused"
    if any(word in lowered for word in ["bold", "fresh", "launch", "limited", "new"]):
        return "bold and launch-ready"
    if any(word in lowered for word in ["simple", "easy", "clear", "stress-free", "calm"]):
        return "clear and supportive"
    return "balanced and trustworthy"

def derive_audience(ad_text: str) -> str:
    lowered = ad_text.lower()
    if any(word in lowered for word in ["developer", "engineer", "saas", "api", "technical"]):
        return "technical buyers"
    if any(word in lowered for word in ["founder", "startup", "b2b", "team", "business"]):
        return "business decision makers"
    if any(word in lowered for word in ["shop", "store", "beauty", "fitness", "lifestyle", "fashion"]):
        return "consumer shoppers"
    if any(word in lowered for word in ["student", "course", "learn", "training"]):
        return "active learners"
    return "qualified prospects"

def infer_industry(text: str) -> str:
    lowered = text.lower()
    best_label = "modern buyers"
    best_score = 0
    for label, keywords in INDUSTRY_KEYWORDS.items():
        score = sum(1 for word in keywords if word in lowered)
        if score > best_score:
            best_label = label
            best_score = score
    return best_label

def choose_primary_action(text: str, industry: str) -> str:
    lowered = text.lower()
    for action, keywords in ACTION_KEYWORDS.items():
        if any(word in lowered for word in keywords):
            return action
    if "commerce" in industry or "fashion" in industry:
        return "shop"
    if "software" in industry or "services" in industry:
        return "start"
    if "travel" in industry:
        return "book"
    return "learn"

def looks_like_boilerplate(text: str) -> bool:
    lowered = text.lower().strip()
    if not lowered:
        return True
    if lowered in ["home", "about", "pricing", "contact", "menu", "login", "sign in"]:
        return True
    if re.match(r"^[\d\W_]+$", lowered):
        return True
    return False

def tag_priority(tag: str) -> int:
    if tag == "h1":
        return 1
    if tag in ["h2", "h3"]:
        return 2
    if tag in ["button", "a"]:
        return 3
    if tag in ["p", "li"]:
        return 4
    return 5

def scrape_full_page(url: str) -> Dict[str, Any]:
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        base_tag = soup.new_tag("base", href=url)
        if soup.head:
            soup.head.insert(0, base_tag)
        else:
            new_head = soup.new_tag("head")
            new_head.insert(0, base_tag)
            if soup.body:
                soup.body.insert_before(new_head)
            else:
                soup.insert(0, new_head)

        tags_to_check = [
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "button", "a", "li", "span", "label", "small",
            "strong", "em", "blockquote", "figcaption", "td", "th"
        ]
        extracted_texts: List[Dict[str, str]] = []

        counter = 0
        for tag in soup.find_all(tags_to_check):
            if tag.find_parent(["script", "style", "noscript", "head", "form"]):
                continue

            text = tag.get_text(strip=True)
            if 3 <= len(text) <= 260 and not looks_like_boilerplate(text):
                if not tag.find_all(["p", "div", "section", "article", "h1", "h2", "h3"]):
                    if any(attr in tag.attrs for attr in ["aria-label", "alt", "title"]):
                        continue
                    direct_text_children = [c for c in tag.children if isinstance(c, NavigableString) and str(c).strip()]
                    if not direct_text_children and tag.name not in ["button", "a", "li"]:
                        continue
                    tag_id = f"ai-pm-{counter}"
                    tag["data-ai-id"] = tag_id
                    extracted_texts.append({"id": tag_id, "tag": tag.name, "text": text})
                    counter += 1
                    if counter >= 260:
                        break

        extracted_texts.sort(key=lambda node: (tag_priority(node["tag"]), len(node["text"])))

        return {
            "status": "success",
            "soup": soup,
            "title": (soup.title.get_text(strip=True) if soup.title else ""),
            "meta_description": (
                soup.find("meta", attrs={"name": "description"}).get("content", "").strip()
                if soup.find("meta", attrs={"name": "description"})
                else ""
            ),
            "extracted_texts": extracted_texts,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def fetch_ad_link_summary(ad_link: str) -> str:
    if not ad_link:
        return ""
    try:
        response = requests.get(ad_link, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.get_text(strip=True) if soup.title else ""
        description_tag = soup.find("meta", attrs={"name": "description"})
        description = description_tag.get("content", "").strip() if description_tag else ""
        return " ".join(part for part in [title, description] if part)
    except Exception:
        return ""

def role_from_tag(tag: str, original: str) -> str:
    lowered = original.lower()
    if tag in ["h1", "h2", "h3"]:
        return "headline"
    if tag in ["h4", "h5", "h6"]:
        return "subheadline"
    if tag in ["button", "a"] and any(
        word in lowered for word in ["buy", "start", "book", "try", "download", "sign", "join", "get"]
    ):
        return "cta"
    if tag in ["label", "small"] or any(word in lowered for word in ["step", "note", "hint", "optional"]):
        return "support"
    if any(word in lowered for word in ["review", "trusted", "customers", "secure", "rating", "certified"]):
        return "trust"
    if tag == "li":
        return "benefit"
    return "body"

def keep_length_close(new_text: str, original: str, ratio: float = 1.45, min_words: int = 7) -> str:
    original_words = max(3, len(original.split()))
    max_words = max(min_words, int(original_words * ratio))
    words = new_text.split()
    if len(words) <= max_words:
        return new_text
    trimmed = words[:max_words]
    dangling = {"and", "or", "for", "to", "with", "the", "a", "an", "of", "in", "between"}
    while len(trimmed) > 4 and trimmed[-1].strip(".,:;!?").lower() in dangling:
        trimmed.pop()
    ending = "." if new_text.rstrip().endswith(".") else ""
    return " ".join(trimmed).rstrip(",. ") + ending

def title_case_soft(text: str) -> str:
    small_words = {"and", "or", "for", "to", "with", "in", "on", "of", "the", "a", "an"}
    words = humanize_phrase(text).split()
    titled = []
    for idx, word in enumerate(words):
        lowered = word.lower()
        if idx > 0 and lowered in small_words:
            titled.append(lowered)
        else:
            titled.append(lowered[:1].upper() + lowered[1:])
    return " ".join(titled)

def keyword_pair(keywords: List[str], fallback: str) -> str:
    cleaned = [word for word in keywords if word]
    if not cleaned:
        return fallback
    if len(cleaned) == 1:
        return cleaned[0]
    return f"{cleaned[0]} and {cleaned[1]}"

def action_label(action: str, offer: str, idx: int) -> str:
    offer_lower = offer.lower()
    if "free trial" in offer_lower:
        variants = ["Start free trial", "Try it free", "Begin free"]
    elif action == "book":
        variants = ["Book now", "Claim a spot", "Schedule today"]
    elif action == "shop":
        variants = ["Shop now", "Explore styles", "Find your fit"]
    elif "off" in offer_lower or "discount" in offer_lower or "deal" in offer_lower:
        variants = ["Claim offer", "Shop the deal", "Unlock savings"]
    elif action == "start":
        variants = ["Get started", "Start today", "Launch now"]
    elif action == "download":
        variants = ["Download now", "Get the app", "Install today"]
    else:
        variants = ["Learn more", "Explore now", "See details"]
    return variants[idx % len(variants)]

def clean_candidate(candidate: str, original: str, role: str) -> str:
    candidate = re.sub(r"\s+", " ", candidate).strip()
    if not candidate:
        return original
    role_min_words = {
        "headline": 10,
        "subheadline": 14,
        "body": 18,
        "benefit": 10,
        "trust": 10,
        "support": 8,
        "cta": 4,
    }
    if role == "cta":
        return keep_length_close(candidate, original, ratio=1.2, min_words=role_min_words["cta"])
    if role == "headline":
        return keep_length_close(candidate, original, ratio=2.4, min_words=role_min_words["headline"])
    if role == "subheadline":
        return keep_length_close(candidate, original, ratio=1.9, min_words=role_min_words["subheadline"])
    if role == "body":
        return keep_length_close(candidate, original, ratio=1.65, min_words=role_min_words["body"])
    if len(original.split()) <= 4 and role not in ["headline", "subheadline"]:
        return keep_length_close(candidate, original, ratio=1.35, min_words=role_min_words.get(role, 9))
    return keep_length_close(candidate, original, ratio=1.65, min_words=role_min_words.get(role, 9))

def safe_rewrite(original: str, role: str, brief: Dict[str, Any], page_context: Dict[str, str], idx: int = 0) -> str:
    offer = brief["detected_offer"]
    audience = brief["audience"]
    message = brief["message_snippet"]
    industry = brief.get("industry", "modern buyers")
    action = brief.get("primary_action", "learn")
    keywords = brief.get("keywords", [])
    if not isinstance(keywords, list):
        keywords = []
    theme = brief.get("campaign_theme") or keyword_pair(keywords, message)
    tone = brief.get("tone", "balanced and trustworthy")
    proof = brief.get("proof_phrase", "clear proof and simple next steps")
    cleaned_original = original.strip()
    keyword_focus = keyword_pair(keywords, theme)
    offer_title = title_case_soft(offer)
    theme_title = title_case_soft(theme)

    if role == "headline":
        page_hint = compact_sentence(page_context.get("title", ""), "", max_words=4)
        headline_variants = [
            f"{theme_title} for {audience}",
            f"{offer_title} made clear from the first click",
            f"{title_case_soft(keyword_focus)} that helps {audience} act faster",
            f"Turn interest into action with {theme}",
            f"A {tone} path to {offer}",
        ]
        base = headline_variants[idx % len(headline_variants)].strip()
        if idx == 0 and page_hint:
            base = f"{base} | {page_hint}"
        return clean_candidate(base[:1].upper() + base[1:] if base else cleaned_original, cleaned_original, role)

    if role == "subheadline":
        variants = [
            f"Explore {theme} with {proof} for {audience}.",
            f"Built around {offer}, this page keeps the next step obvious and relevant.",
            f"Match the campaign promise with {keyword_focus}, practical detail, and a confident path forward.",
            f"A {tone} experience focused on {industry} and the outcomes people came to find.",
        ]
        return clean_candidate(variants[idx % len(variants)], cleaned_original, role)

    if role == "cta":
        return action_label(action, offer, idx)

    if role == "trust":
        variants = [
            f"Trusted by {audience} for {keyword_focus}.",
            f"Clear proof, secure steps, and {offer}.",
            f"Confidence starts with {proof}.",
        ]
        return clean_candidate(variants[idx % len(variants)], cleaned_original, role)

    if role == "benefit":
        benefit_variants = [
            f"Clear {keyword_focus} benefits from the first click.",
            f"Focused on {audience} needs and faster decisions.",
            f"{offer_title} supported by practical proof.",
            f"Less friction between the ad promise and the page.",
            f"Simple next steps for people ready to {action}.",
        ]
        return clean_candidate(benefit_variants[idx % len(benefit_variants)], cleaned_original, role)

    if role == "support":
        support_variants = [
            f"Helpful details for {audience}.",
            f"Guidance shaped around {offer}.",
            f"Keep moving with clear next steps.",
        ]
        return clean_candidate(support_variants[idx % len(support_variants)], cleaned_original, role)

    if role == "body":
        if len(cleaned_original.split()) < 6:
            return cleaned_original
        body_variants = [
            f"{message}. The experience highlights {offer}, {keyword_focus}, and a next step that feels natural.",
            f"Built for {audience}, this section connects {theme} with benefits people can evaluate quickly.",
            f"Use {proof} to make the campaign promise feel specific, useful, and easy to act on.",
            f"From first impression to final click, the page now reinforces {keyword_focus} without changing the layout.",
            f"A {tone} message gives visitors the context they need before they decide to {action}.",
        ]
        return clean_candidate(body_variants[idx % len(body_variants)], cleaned_original, role)

    return cleaned_original

def reasoning_for_role(role: str, brief: Dict[str, Any]) -> str:
    theme = brief.get("campaign_theme", "the campaign theme")
    offer = brief.get("detected_offer", "the offer")
    audience = brief.get("audience", "the audience")
    reasons = {
        "headline": f"Anchored the first impression around {theme} for stronger ad-to-page message match.",
        "subheadline": f"Expanded the promise with proof points that support {offer}.",
        "cta": f"Matched the action language to the visitor's likely next step.",
        "benefit": f"Turned a generic point into a benefit tied to {audience}.",
        "trust": f"Reframed credibility copy around proof and confidence signals.",
        "support": f"Kept helper text short while making it relevant to {offer}.",
        "body": f"Connected the section copy to {theme} without changing the layout.",
    }
    return reasons.get(role, f"Aligned this content with {theme} while preserving structure.")

def build_ad_brief(ad_text: str, ad_link_summary: str, has_image: bool, image_filename: str = "") -> Dict[str, Any]:
    filename_hint = humanize_phrase(image_filename.rsplit(".", 1)[0], "") if image_filename else ""
    merged = " ".join(part for part in [ad_text.strip(), ad_link_summary.strip(), filename_hint] if part).strip()
    if not merged and has_image:
        merged = "Visual campaign creative with product imagery and a focused offer"
    if not merged:
        merged = "General campaign messaging"

    keywords = extract_keywords(merged)
    industry = infer_industry(merged)
    action = choose_primary_action(merged, industry)
    offer = extract_offer_hint(merged)
    message_snippet = compact_sentence(merged, "Clear value for your audience", max_words=9)
    campaign_theme = keyword_pair(keywords, message_snippet)
    proof_phrase = {
        "SaaS and software": "secure workflows, faster setup, and team-ready control",
        "fitness and wellness": "visible progress, expert guidance, and everyday motivation",
        "fashion and lifestyle": "fresh style cues, clear product value, and easy shopping",
        "commerce and retail": "clear savings, product confidence, and simple checkout",
        "finance and services": "transparent details, secure handling, and measurable value",
        "travel and hospitality": "clear options, memorable moments, and simple booking",
        "education and learning": "guided lessons, practical outcomes, and steady progress",
    }.get(industry, "clear proof and simple next steps")

    return {
        "detected_offer": offer,
        "tone": classify_tone(merged),
        "audience": derive_audience(merged),
        "message_snippet": message_snippet,
        "campaign_theme": campaign_theme,
        "industry": industry,
        "primary_action": action,
        "keywords": keywords,
        "proof_phrase": proof_phrase,
        "visual_caption": title_case_soft(campaign_theme),
    }

def parse_dimension(value: Any) -> Optional[int]:
    if value is None:
        return None
    match = re.match(r"^\s*(\d{2,4})", str(value))
    if not match:
        return None
    return int(match.group(1))

def is_replaceable_image(img: Any) -> bool:
    src = (img.get("src") or img.get("data-src") or "").lower()
    alt = (img.get("alt") or "").lower()
    class_value = img.get("class", [])
    class_str = " ".join(class_value if isinstance(class_value, list) else [str(class_value)]).lower()
    combined = " ".join([src, alt, class_str])

    if any(term in combined for term in ["logo", "icon", "avatar", "sprite", "favicon", "badge", "stars"]):
        return False
    if ".svg" in src or src.startswith("data:image/svg"):
        return False

    width = parse_dimension(img.get("width"))
    height = parse_dimension(img.get("height"))
    if width and width < 90:
        return False
    if height and height < 90:
        return False
    if width and height and width * height < 12000:
        return False
    return True

def visual_caption(brief: Dict[str, Any], idx: int) -> str:
    keywords = brief.get("keywords", [])
    if not isinstance(keywords, list):
        keywords = []
    captions = [
        brief.get("visual_caption", "Campaign creative"),
        title_case_soft(brief.get("detected_offer", "Featured offer")),
        f"For {brief.get('audience', 'qualified prospects')}",
        title_case_soft(keyword_pair(keywords[1:], brief.get("campaign_theme", "Brand story"))),
        action_label(brief.get("primary_action", "learn"), brief.get("detected_offer", ""), idx),
        title_case_soft(brief.get("tone", "Trustworthy value")),
    ]
    return compact_sentence(captions[idx % len(captions)], "Campaign creative", max_words=6)

def build_visual_css(ad_image_base64: str, ad_image_mime: str) -> str:
    safe_mime = ad_image_mime if re.match(r"^image/[A-Za-z0-9.+-]+$", ad_image_mime or "") else "image/jpeg"
    if ad_image_base64:
        base_background = f'url("data:{safe_mime};base64,{ad_image_base64}")'
    else:
        base_background = "linear-gradient(135deg, #0f172a 0%, #0f766e 52%, #f59e0b 100%)"

    return f"""
.ai-pm-visual {{
  --ai-pm-bg: {base_background};
  --ai-pm-pos: center;
  --ai-pm-filter: saturate(1.05) contrast(1.02);
  --ai-pm-scale: 1.04;
  --ai-pm-overlay: linear-gradient(135deg, rgba(15, 23, 42, .64), rgba(20, 184, 166, .26));
  position: relative;
  display: block;
  overflow: hidden;
  isolation: isolate;
  min-height: clamp(180px, 24vw, 430px);
  border-radius: inherit;
  background: #111827;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.16);
}}
.ai-pm-visual::before {{
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: var(--ai-pm-bg);
  background-size: cover;
  background-position: var(--ai-pm-pos);
  filter: var(--ai-pm-filter);
  transform: scale(var(--ai-pm-scale));
}}
.ai-pm-visual::after {{
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--ai-pm-overlay);
}}
.ai-pm-visual-label {{
  position: absolute;
  left: clamp(14px, 4%, 34px);
  right: clamp(14px, 4%, 34px);
  bottom: clamp(14px, 5%, 36px);
  color: #fff;
  font: 800 clamp(16px, 2.6vw, 36px)/1.05 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0;
  text-shadow: 0 2px 18px rgba(0,0,0,.38);
  max-width: 760px;
}}
.ai-pm-visual-0 {{ --ai-pm-pos: center; --ai-pm-filter: saturate(1.18) contrast(1.05); --ai-pm-overlay: linear-gradient(135deg, rgba(2, 6, 23, .68), rgba(14, 116, 144, .16)); }}
.ai-pm-visual-1 {{ --ai-pm-pos: 35% 45%; --ai-pm-filter: saturate(.96) contrast(1.1) brightness(.94); --ai-pm-scale: 1.1; --ai-pm-overlay: linear-gradient(135deg, rgba(17, 24, 39, .72), rgba(245, 158, 11, .24)); }}
.ai-pm-visual-2 {{ --ai-pm-pos: 70% 50%; --ai-pm-filter: saturate(1.28) contrast(.96); --ai-pm-scale: 1.08; --ai-pm-overlay: linear-gradient(135deg, rgba(6, 78, 59, .66), rgba(15, 23, 42, .18)); }}
.ai-pm-visual-3 {{ --ai-pm-pos: 48% 34%; --ai-pm-filter: grayscale(.12) contrast(1.18); --ai-pm-scale: 1.14; --ai-pm-overlay: linear-gradient(135deg, rgba(88, 28, 135, .62), rgba(15, 23, 42, .22)); }}
.ai-pm-visual-4 {{ --ai-pm-pos: 28% 58%; --ai-pm-filter: sepia(.12) saturate(1.12) contrast(1.04); --ai-pm-scale: 1.12; --ai-pm-overlay: linear-gradient(135deg, rgba(127, 29, 29, .56), rgba(20, 83, 45, .25)); }}
.ai-pm-visual-5 {{ --ai-pm-pos: 62% 38%; --ai-pm-filter: brightness(.92) saturate(1.34); --ai-pm-scale: 1.16; --ai-pm-overlay: linear-gradient(135deg, rgba(15, 23, 42, .72), rgba(37, 99, 235, .18)); }}
"""

def inject_visual_css(soup: BeautifulSoup, ad_image_base64: str, ad_image_mime: str) -> None:
    style_tag = soup.new_tag("style")
    style_tag.string = build_visual_css(ad_image_base64, ad_image_mime)
    if soup.head:
        soup.head.append(style_tag)
    else:
        new_head = soup.new_tag("head")
        new_head.append(style_tag)
        soup.insert(0, new_head)

def replacement_style_for_image(img: Any, idx: int) -> str:
    existing_style = (img.get("style") or "").strip().rstrip(";")
    width = parse_dimension(img.get("width"))
    height = parse_dimension(img.get("height"))
    style_parts = [existing_style] if existing_style else []
    if width:
        style_parts.append(f"width: {width}px")
    else:
        style_parts.append("width: 100%")
    if height:
        style_parts.append(f"height: {height}px")
    else:
        ratios = ["aspect-ratio: 16 / 9", "aspect-ratio: 4 / 3", "aspect-ratio: 1 / 1", "aspect-ratio: 3 / 4"]
        style_parts.append(ratios[idx % len(ratios)])
    style_parts.append("max-width: 100%")
    return "; ".join(style_parts) + ";"

def replace_page_visuals(soup: BeautifulSoup, brief: Dict[str, Any], ad_image_base64: str, ad_image_mime: str) -> int:
    visuals_replaced = 0
    max_visuals = 12
    for img in list(soup.find_all("img")):
        if visuals_replaced >= max_visuals:
            break
        try:
            if not is_replaceable_image(img):
                continue
            replacement = soup.new_tag("div")
            class_value = img.get("class", [])
            classes = class_value if isinstance(class_value, list) else str(class_value).split()
            replacement["class"] = classes + ["ai-pm-visual", f"ai-pm-visual-{visuals_replaced % 6}"]
            replacement["style"] = replacement_style_for_image(img, visuals_replaced)
            caption = visual_caption(brief, visuals_replaced)
            replacement["role"] = "img"
            replacement["aria-label"] = caption
            label = soup.new_tag("span")
            label["class"] = "ai-pm-visual-label"
            label.string = caption
            replacement.append(label)

            target = img.parent if img.parent and getattr(img.parent, "name", None) == "picture" else img
            target.replace_with(replacement)
            visuals_replaced += 1
        except Exception:
            continue

    if visuals_replaced == 0:
        replacement = soup.new_tag("div")
        replacement["class"] = ["ai-pm-generated-campaign", "ai-pm-visual", "ai-pm-visual-0"]
        replacement["style"] = "width: 100%; aspect-ratio: 16 / 7; max-width: 100%;"
        caption = visual_caption(brief, 0)
        replacement["role"] = "img"
        replacement["aria-label"] = caption
        label = soup.new_tag("span")
        label["class"] = "ai-pm-visual-label"
        label.string = caption
        replacement.append(label)
        if soup.body:
            soup.body.insert(0, replacement)
        else:
            soup.insert(0, replacement)
        visuals_replaced = 1

    if visuals_replaced:
        inject_visual_css(soup, ad_image_base64, ad_image_mime)
    return visuals_replaced

@app.get("/api/health")
def healthcheck():
    return {"status": "ok"}

@app.post("/api/personalize")
async def personalize_landing_page(
    page_url: str = Form(...),
    ad_image: Optional[UploadFile] = File(default=None),
    ad_text: Optional[str] = Form(default=""),
    ad_link: Optional[str] = Form(default=""),
):
    normalized_page_url = normalize_url(page_url)
    normalized_ad_link = normalize_url(ad_link or "")

    if not normalized_page_url:
        raise HTTPException(status_code=400, detail="Landing page URL is required.")
    if not ad_image and not (ad_text or "").strip() and not normalized_ad_link:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one ad creative input: image, ad text, or ad link.",
        )

    ad_image_base64 = ""
    ad_image_mime = "image/jpeg"
    if ad_image is not None:
        image_bytes = await ad_image.read()
        if image_bytes:
            ad_image_base64 = base64.b64encode(image_bytes).decode("utf-8")
            ad_image_mime = ad_image.content_type or "image/jpeg"

    scraped_data = scrape_full_page(normalized_page_url)
    if scraped_data["status"] == "error":
        return {"status": "error", "error": f"Could not scrape landing page: {scraped_data['message']}"}

    soup = scraped_data["soup"]
    extracted_texts = scraped_data["extracted_texts"]
    page_context = {
        "title": scraped_data.get("title", ""),
        "meta_description": scraped_data.get("meta_description", ""),
    }
    ad_link_summary = fetch_ad_link_summary(normalized_ad_link)
    ad_brief = build_ad_brief(
        ad_text or "",
        ad_link_summary,
        ad_image is not None,
        ad_image.filename if ad_image is not None else "",
    )

    replacements = []
    changelog = []
    for idx, node in enumerate(extracted_texts):
        role = role_from_tag(node["tag"], node["text"])
        new_text = safe_rewrite(node["text"], role, ad_brief, page_context, idx)
        if new_text and new_text != node["text"]:
            replacements.append({"id": node["id"], "original": node["text"], "new_text": new_text})
            changelog.append(
                {
                    "element": f"{node['tag'].upper()} content",
                    "reasoning": reasoning_for_role(role, ad_brief),
                    "confidence": "High" if role in ["headline", "cta"] else "Medium",
                }
            )

    for rep in replacements:
        tag = soup.find(name=True, attrs={"data-ai-id": rep["id"]})
        if tag:
            if tag.has_attr("data-ai-id"):
                del tag["data-ai-id"]
            if tag.string is not None:
                tag.string = rep["new_text"]
            else:
                replaced = False
                for child in list(tag.children):
                    if isinstance(child, NavigableString) and str(child).strip():
                        child.replace_with(rep["new_text"])
                        replaced = True
                        break
                if not replaced:
                    tag.clear()
                    tag.append(rep["new_text"])

    visuals_replaced = replace_page_visuals(soup, ad_brief, ad_image_base64, ad_image_mime)

    for remaining in soup.find_all(attrs={"data-ai-id": True}):
        del remaining["data-ai-id"]

    original_relevance = 42
    copy_boost = min(34, len(replacements) * 2)
    visual_boost = min(14, visuals_replaced * 3)
    context_boost = 8 if (ad_text or normalized_ad_link or ad_image_base64) else 0
    new_relevance = min(96, original_relevance + copy_boost + visual_boost + context_boost)

    ai_result = {
        "ad_brief": {
            "detected_offer": ad_brief["detected_offer"],
            "tone": ad_brief["tone"],
            "audience": ad_brief["audience"],
            "industry": ad_brief["industry"],
            "campaign_theme": ad_brief["campaign_theme"],
            "primary_action": ad_brief["primary_action"],
        },
        "scores": {"original_relevance": original_relevance, "new_relevance": new_relevance},
        "replacements": replacements,
        "changelog": changelog[:25],
    }

    return {
        "status": "success",
        "extracted_texts": extracted_texts,
        "ai_analysis": ai_result,
        "modified_html": str(soup),
        "visuals_replaced": visuals_replaced,
        "source_page": normalized_page_url,
        "ad_context_used": {
            "used_image": ad_image is not None,
            "used_ad_text": bool((ad_text or "").strip()),
            "used_ad_link": bool(normalized_ad_link),
        },
    }
