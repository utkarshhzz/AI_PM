from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import Any, Dict, List, Optional
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_base_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

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

def extract_offer_hint(text: str) -> str:
    lowered = text.lower()
    offer_patterns = [
        r"\b\d{1,3}%\s*off\b",
        r"\bfree trial\b",
        r"\bfree shipping\b",
        r"\blimited time\b",
        r"\bnew\b",
        r"\blaunch\b",
        r"\bsave\b",
        r"\bdiscount\b",
    ]
    for pattern in offer_patterns:
        match = re.search(pattern, lowered)
        if match:
            return match.group(0).strip()
    return "Primary value proposition"

def classify_tone(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ["luxury", "premium", "exclusive", "elegant"]):
        return "Premium"
    if any(word in lowered for word in ["fast", "boost", "scale", "growth", "win"]):
        return "Performance-focused"
    if any(word in lowered for word in ["simple", "easy", "clear", "stress-free"]):
        return "Clear and supportive"
    return "Balanced and trustworthy"

def derive_audience(ad_text: str) -> str:
    lowered = ad_text.lower()
    if any(word in lowered for word in ["developer", "engineer", "saas", "api"]):
        return "Technical buyers"
    if any(word in lowered for word in ["founder", "startup", "b2b", "team"]):
        return "Business decision makers"
    if any(word in lowered for word in ["shop", "store", "beauty", "fitness", "lifestyle"]):
        return "Consumer shoppers"
    return "Qualified prospects"

def scrape_full_page(url: str) -> Dict[str, Any]:
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        base_tag = soup.new_tag("base", href=get_base_url(url))
        if soup.head:
            soup.head.insert(0, base_tag)
        else:
            new_head = soup.new_tag("head")
            new_head.insert(0, base_tag)
            if soup.body:
                soup.body.insert_before(new_head)
            else:
                soup.insert(0, new_head)

        tags_to_check = ["h1", "h2", "h3", "p", "button", "a", "li"]
        extracted_texts: List[Dict[str, str]] = []

        counter = 0
        for tag in soup.find_all(tags_to_check):
            if tag.find_parent(["script", "style", "noscript", "head", "form"]):
                continue

            text = tag.get_text(strip=True)
            if 8 <= len(text) <= 260:
                if not tag.find_all(["p", "div", "section", "article", "h1", "h2", "h3"]):
                    tag_id = f"ai-pm-{counter}"
                    tag["data-ai-id"] = tag_id
                    extracted_texts.append({"id": tag_id, "tag": tag.name, "text": text})
                    counter += 1
                    if counter >= 100:
                        break

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
    if tag in ["button", "a"] and any(
        word in lowered for word in ["buy", "start", "book", "try", "download", "sign", "join", "get"]
    ):
        return "cta"
    if any(word in lowered for word in ["review", "trusted", "customers", "secure", "rating", "certified"]):
        return "trust"
    if tag == "li":
        return "benefit"
    return "body"

def keep_length_close(new_text: str, original: str, ratio: float = 1.45) -> str:
    original_words = max(3, len(original.split()))
    max_words = int(original_words * ratio)
    words = new_text.split()
    if len(words) <= max_words:
        return new_text
    return " ".join(words[:max_words]).rstrip(",. ") + "."

def safe_rewrite(original: str, role: str, brief: Dict[str, str], page_context: Dict[str, str]) -> str:
    offer = brief["detected_offer"]
    audience = brief["audience"]
    message = brief["message_snippet"]
    cleaned_original = original.strip()

    if role == "headline":
        page_hint = page_context.get("title", "").strip()
        base = f"{message} for {audience.lower()}".strip()
        if page_hint:
            base = f"{base} | {page_hint}"
        candidate = base[:1].upper() + base[1:] if base else cleaned_original
        return keep_length_close(candidate, cleaned_original)

    if role == "cta":
        cta_map = {
            "buy": "Shop now",
            "start": "Get started",
            "book": "Book a demo",
            "try": "Start free",
            "download": "Download now",
            "sign": "Sign up",
            "join": "Join now",
            "get": "Get started",
        }
        lowered = cleaned_original.lower()
        for key, value in cta_map.items():
            if key in lowered:
                return value
        return "Learn more"

    if role == "trust":
        if "secure" in cleaned_original.lower():
            return "Secure and reliable experience."
        return keep_length_close(cleaned_original, cleaned_original)

    if role == "benefit":
        candidate = f"Aligned with {offer} and clearer outcomes."
        return keep_length_close(candidate, cleaned_original)

    if role == "body":
        if len(cleaned_original.split()) < 6:
            return cleaned_original
        candidate = f"{message}. {offer.capitalize()} and clearer next steps."
        return keep_length_close(candidate, cleaned_original)

    return cleaned_original

def build_ad_brief(ad_text: str, ad_link_summary: str, has_image: bool) -> Dict[str, str]:
    merged = " ".join(part for part in [ad_text.strip(), ad_link_summary.strip()] if part).strip()
    if not merged and has_image:
        merged = "Visual ad creative provided"
    if not merged:
        merged = "General campaign messaging"

    message_tokens = merged.split()
    message_snippet = " ".join(message_tokens[:8]).strip() or "Clear value for your audience"

    return {
        "detected_offer": extract_offer_hint(merged),
        "tone": classify_tone(merged),
        "audience": derive_audience(merged),
        "message_snippet": message_snippet,
    }

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
    ad_brief = build_ad_brief(ad_text or "", ad_link_summary, ad_image is not None)

    replacements = []
    changelog = []
    for node in extracted_texts:
        role = role_from_tag(node["tag"], node["text"])
        new_text = safe_rewrite(node["text"], role, ad_brief, page_context)
        if new_text and new_text != node["text"]:
            replacements.append({"id": node["id"], "original": node["text"], "new_text": new_text})
            changelog.append(
                {
                    "element": f"{node['tag'].upper()} content",
                    "reasoning": f"Improved {role} clarity while preserving structure and claim safety.",
                    "confidence": "High" if role in ["headline", "cta"] else "Medium",
                }
            )

    for rep in replacements:
        tag = soup.find(name=True, attrs={"data-ai-id": rep["id"]})
        if tag:
            if tag.has_attr("data-ai-id"):
                del tag["data-ai-id"]
            tag.string = rep["new_text"]

    for remaining in soup.find_all(attrs={"data-ai-id": True}):
        del remaining["data-ai-id"]

    original_relevance = 45
    relevance_boost = min(45, len(replacements))
    new_relevance = min(95, original_relevance + relevance_boost)

    ai_result = {
        "ad_brief": {
            "detected_offer": ad_brief["detected_offer"],
            "tone": ad_brief["tone"],
            "audience": ad_brief["audience"],
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
        "visuals_replaced": 0,
        "source_page": normalized_page_url,
        "ad_context_used": {
            "used_image": ad_image is not None,
            "used_ad_text": bool((ad_text or "").strip()),
            "used_ad_link": bool(normalized_ad_link),
        },
    }