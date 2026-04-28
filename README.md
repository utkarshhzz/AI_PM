# AI-Powered Landing Page Personalizer

Turn an ad creative plus an existing website URL into a campaign-matched landing page preview.

The app uses the original URL as source context, borrows its visual style, then creates a coherent campaign landing page that matches the ad promise, offer, products, benefits, visuals, and CTA.

## What It Does

- Accepts ad copy, an optional ad creative image, an optional ad destination URL, and the website URL to personalize.
- Fetches the target page for source context, brand/source name, and visual styling cues.
- Builds a campaign profile from the ad inputs: offer, tone, audience, industry, action, theme, and proof angle.
- Generates a complete campaign landing page that keeps a source-inspired look while avoiding mismatched leftover copy from unrelated websites.
- Rebuilds the visual system around the uploaded ad image or a polished generated campaign treatment.
- Adds conversion-ready support sections such as customer reviews, trust proof, FAQs, and a footer.
- Shows relevance lift, rewritten elements, visual updates, campaign profile, change reasoning, and a desktop/mobile iframe preview.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, BeautifulSoup, Requests
- Deployment: Vercel frontend with a self-contained personalization API route
- Optional AI assist: set `GROK_API_KEY` or `XAI_API_KEY` to let Grok refine the campaign profile before the local rewrite engine runs

## Local Setup

### Backend

```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend runs at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

For deployed environments, set `GROK_API_KEY` or `XAI_API_KEY` in Vercel if you want Grok-assisted campaign profiling. The app still works without it because the route includes a local fallback engine.

## Verification

```bash
python -m py_compile main.py
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## Notes

Some websites block server-side scraping or render most content client-side. In those cases, try a public marketing page that returns HTML to standard browser requests.
