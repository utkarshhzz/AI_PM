from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import json
import base64
from urllib.parse import urlparse, urljoin

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PersonalizeRequest(BaseModel):
    ad_url: str
    page_url: str

def get_base_url(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

def scrape_full_page(url: str):
    try:
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Inject base tag so relative images/css work in the iframe
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
                
        # Find critical text elements to personalize (Headers, paragraphs, buttons)
        tags_to_check = ['h1', 'h2', 'h3', 'p', 'button', 'a', 'span', 'strong']
        extracted_texts = []
        
        counter = 0
        for tag in soup.find_all(tags_to_check):
            if tag.parent and tag.parent.name in ['script', 'style', 'nav', 'footer', 'head']:
                continue
            
            text = tag.get_text(strip=True)
            # Only consider substantial text to alter (e.g. Hero strings, Product descriptions)
            if len(text) > 10 and len(text) < 150:
                tag_id = f"ai-pm-{counter}"
                tag['data-ai-id'] = tag_id
                extracted_texts.append({
                    "id": tag_id,
                    "tag": tag.name,
                    "text": text
                })
                counter += 1
                if counter >= 20: 
                    break

        return {
            "status": "success",
            "soup": soup,
            "extracted_texts": extracted_texts
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/api/personalize")
async def personalize_landing_page(
    page_url: str = Form(...),
    ad_image: UploadFile = File(...)
):
    print(f"Scraping full page: {page_url}...")
    
    ad_image_bytes = await ad_image.read()
    ad_image_base64 = base64.b64encode(ad_image_bytes).decode('utf-8')
    mime_type = ad_image.content_type or "image/jpeg"

    scraped_data = scrape_full_page(page_url)
    
    if scraped_data["status"] == "error":
        return {"error": f"Could not scrape the landing page. Detail: {scraped_data['message']}"}
    
    soup = scraped_data["soup"]
    extracted_texts = scraped_data["extracted_texts"]
    
    system_prompt = """
    You are an expert Conversion Rate Optimizer. You analyze ad creatives (images) and perfectly align full landing pages to them.
    You are given a list of text snippets from a live landing page (Shopify, SaaS, etc.).
    Rewrite these snippets to match the inferred intent, tone, and offer of the provided Ad Image.
    Keep the length of the new text similar to the original to prevent breaking the UI structure.
    
    You MUST respond with strictly formatted JSON. Do not include markdown code blocks like ```json.
    Your JSON must have EXACTLY this structure:
    {
      "ad_brief": {
        "detected_offer": "Summarize the discount or value prop from the image",
        "tone": "What is the vibe?",
        "audience": "Inferred target audience based on the ad"
      },
      "scores": {
        "original_relevance": 25,
        "new_relevance": 95
      },
      "replacements": [
        {
          "id": "ai-pm-0",
          "original": "Original text here",
          "new_text": "Newly personalized text here"
        }
      ],
      "changelog": [
        {
          "element": "e.g. Main Headline",
          "reasoning": "Why this was changed (e.g. Message Match)",
          "confidence": "High / Medium / Low"
        }
      ]
    }
    """
    
    models_to_try = [
        {"provider": "gemini", "model": "gemini-1.5-flash"},
        {"provider": "gemini", "model": "gemini-1.5-pro"},
        {"provider": "openrouter", "model": "openai/gpt-4o-mini"}
    ]
    
    user_prompt = f"The original landing page extracted elements are: {json.dumps(extracted_texts)}. The user's ad image is attached. Rewrite the elements to match the ad. Return the JSON."
    
    ai_result = {"error": "All AI models failed."}
    
    for model_info in models_to_try:
        try:
            print(f"Trying {model_info['model']}...")
            raw_ai_text = ""
            if model_info["provider"] == "openrouter":
                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {os.environ.get('OPENROUTER_API_KEY')}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model_info["model"],
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {
                                "role": "user", 
                                "content": [
                                    {"type": "text", "text": user_prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{ad_image_base64}"}}
                                ]
                            }
                        ]
                    }
                )
                response.raise_for_status() 
                data = response.json()
                raw_ai_text = data["choices"][0]["message"]["content"]
            
            elif model_info["provider"] == "gemini":
                gemini_key = os.environ.get("GEMINI_API_KEY")
                response = requests.post(
                    url=f"https://generativelanguage.googleapis.com/v1beta/models/{model_info['model']}:generateContent?key={gemini_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "parts": [
                                {"text": system_prompt + "\\n\\n" + user_prompt},
                                {"inlineData": {"mimeType": mime_type, "data": ad_image_base64}}
                            ]
                        }],
                        "generationConfig": {"responseMimeType": "application/json"}
                    }
                )
                response.raise_for_status()
                data = response.json()
                raw_ai_text = data["candidates"][0]["content"]["parts"][0]["text"]
            
            print(f"Model returned data: {raw_ai_text[:50]}...")
            
            if raw_ai_text.startswith("```json"): raw_ai_text = raw_ai_text.replace("```json", "", 1)
            if raw_ai_text.endswith("```"): raw_ai_text = raw_ai_text[:raw_ai_text.rfind("```")].strip()
                 
            ai_result = json.loads(raw_ai_text.strip())
            break
            
        except Exception as e:
            print(f"Model failed: {e}. Trying next...")
            continue
    
    if "error" in ai_result:
        return {"error": ai_result["error"]}
        
    print("Injecting into HTML...")
    replacements = ai_result.get("replacements", [])
    if isinstance(replacements, list):
        for rep in replacements:
            if isinstance(rep, dict):
                node_id = rep.get("id")
                new_text = rep.get("new_text")
                if node_id and new_text:
                    tag = soup.find(name=True, attrs={"data-ai-id": node_id})
                    if tag:
                        del tag['data-ai-id']
                        tag.string = new_text

    return {
        "status": "success",
        "extracted_texts": extracted_texts,
        "ai_analysis": ai_result,
        "modified_html": str(soup) 
    }