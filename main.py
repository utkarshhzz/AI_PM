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
        
        h1=soup.find('h1')
        headline=h1.get_text(strip=True) if h1 else 'No headline found'
        return {
            "status": "success",
            "headline": headline,
            "raw_html": str(h1) if h1 else 'No H1 tag found'
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
    
    original_headline = scraped_data["headline"]
    
    # Step B: Draft the complex instructions for the AI
    system_prompt = """
    You are an expert Conversion Rate Optimizer. You analyze ad creatives and align landing pages to them.
    You MUST respond with strictly formatted JSON. Do not include markdown code blocks like ```json.
    Your JSON must have EXACTLY this structure:
    {
      "ad_brief": {
        "detected_offer": "Summarize the discount or value prop in the image (e.g. 50% Off)",
        "tone": "What is the vibe? (e.g. Urgent, Fun, Professional)"
      },
      "new_headline": "Your generated headline here"
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
                            "content": f"The original landing page headline is: '{original_headline}'. The user's ad image URL is: {request.ad_url}. Since you are a text model, infer the ad's vibe and offer from the URL name if possible. Provide the JSON analysis."
                        }
                    ]
                }
            )
            
            response.raise_for_status() # If it throws 429/404, we catch it instantly!
            data = response.json()
            raw_ai_text = data["choices"][0]["message"]["content"]
            
            # If we successfully get text here, break out of the loop and stop trying others
            break
            
        except Exception as e:
            # If this model failed, just print to our local terminal and let the loop continue
            print(f"Model {model_name} failed. Trying the next one...")
            continue
            
    # Did we get an answer from ANY model?
    if raw_ai_text:
        import json
        try:
            # Clean up the output in case it wrapped it in markdown
            if raw_ai_text.startswith("```json"):
                raw_ai_text = raw_ai_text.replace("```json", "").replace("```", "").strip()
            ai_result = json.loads(raw_ai_text)
        except json.JSONDecodeError:
            ai_result = {"error": "AI refused structured JSON", "raw_output": raw_ai_text}
        
    return {
        "status": "success",
        "original_headline": original_headline,
        "ai_analysis": ai_result
    }