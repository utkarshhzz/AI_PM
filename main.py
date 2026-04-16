from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()


app = FastAPI()

# 1. Configure the "Bouncer" (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allow our Next.js frontend!
    allow_credentials=True,
    allow_methods=["*"], # Allow all types of requests (GET, POST, etc.)
    allow_headers=["*"],
)

# 2. Define the shape of the data we expect
class PersonalizeRequest(BaseModel):
    ad_url: str
    page_url: str


def scrape_hero_section(url: str):
    try:
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response= requests.get(url,headers=headers,timeout=10)
        response.raise_for_status()
        soup=BeautifulSoup(response.text,'html.parser')
        
        # Extract Headline (h1)
        h1 = soup.find('h1')
        headline = h1.get_text(strip=True) if h1 else 'No headline found'
        
        # Extract Sub-headline (usually the first paragraph after h1, or an h2)
        sub_tag = soup.find(['h2', 'p'])
        sub_headline = sub_tag.get_text(strip=True) if sub_tag else 'No sub-headline found'
        
        # Extract CTA Button (usually an 'a' or 'button' tag)
        cta_tag = soup.find(['a', 'button'])
        cta_text = cta_tag.get_text(strip=True) if cta_tag else 'No CTA found'

        return {
            "status": "success",
            "headline": headline,
            "sub_headline": sub_headline,
            "cta_text": cta_text
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
# 3. Create the API Endpoint
@app.post("/api/personalize")
def personalize_landing_page(request: PersonalizeRequest):
    scraped_data = scrape_hero_section(request.page_url)
    
    if scraped_data["status"] == "error":
        return {"error": "Could not scrape the landing page"}
    
    original_hero = {
        "headline": scraped_data["headline"],
        "sub_headline": scraped_data["sub_headline"],
        "cta_text": scraped_data["cta_text"]
    }
    
    # Step B: Draft the complex instructions for the AI
    system_prompt = """
    You are an expert Conversion Rate Optimizer. You analyze ad creatives and align landing pages to them.
    You MUST respond with strictly formatted JSON. Do not include markdown code blocks like ```json.
    Your JSON must have EXACTLY this structure:
    {
      "ad_brief": {
        "detected_offer": "Summarize the discount or value prop",
        "tone": "What is the vibe?",
        "audience": "Inferred target audience based on the ad"
      },
      "scores": {
        "original_relevance": 25,
        "new_relevance": 95
      },
      "new_hero": {
        "headline": "Generated headline",
        "sub_headline": "Generated sub-headline",
        "cta_text": "Generated CTA text"
      },
      "changelog": [
        {
          "element": "Headline",
          "cro_principle": "e.g. Message Match",
          "reasoning": "Plain English explanation of why you made this change",
          "confidence": "High / Medium / Low",
          "confidence_reason": "One-line reason for confidence"
        }
      ]
    }
    """
    
    models_to_try = [
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openrouter/elephant-alpha",
        "anthropic/claude-opus-4.6-fast",
        "z-ai/glm-5.1",
        "cohere/rerank-4-pro",
        "qwen/qwen3.6-plus",
        "x-ai/grok-4.20-multi-agent",
        "xiaomi/mimo-v2-omni",
        "minimax/minimax-m2.7",
        "openai/gpt-5.4-mini",
        "perplexity/pplx-embed-v1-4b"
    ]
    
    raw_ai_text = None
    ai_result = {"error": "All OpenRouter models failed. Try again later."}
    
    for model_name in models_to_try:
        try:
            # Step C: Iterate through models and use the first one that succeeds
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.environ.get('OPENROUTER_API_KEY')}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user", 
                            "content": f"The original landing page elements are: {original_hero}. The user's ad image URL is: {request.ad_url}. Text model, infer the ad's vibe/offer/audience from the URL string. Rewrite ALL THREE hero elements (headline, sub-headline, cta_text) to match this ad. Provide the structured JSON output."
                        }
                    ]
                }
            )
            
            response.raise_for_status() # If it throws 429/404, we catch it instantly!
            data = response.json()
            raw_ai_text = data["choices"][0]["message"]["content"]
            
            import json
            try:
                # Clean up the output in case it wrapped it in markdown
                if raw_ai_text.startswith("```json"):
                    raw_ai_text = raw_ai_text.replace("```json", "", 1)
                
                if raw_ai_text.endswith("```"):
                     # Remove the ending markdown block securely
                     raw_ai_text = raw_ai_text[:raw_ai_text.rfind("```")].strip()
                     
                ai_result = json.loads(raw_ai_text.strip())
                # If we parsed it successfully, we break the model retry loop!
                break
                
            except json.JSONDecodeError:
                print(f"Model {model_name} returned invalid JSON. Skipping...")
                ai_result = {"error": "AI refused structured JSON", "raw_output": raw_ai_text}
                continue # Try the next model
            
        except Exception as e:
            # If this model failed or threw 429, just print and let the loop continue
            print(f"Model {model_name} failed. Trying the next one...")
            continue
            
    return {
        "status": "success",
        "original_hero": original_hero,
        "ai_analysis": ai_result
    }