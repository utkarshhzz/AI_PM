# AI-Powered Landing Page Personalizer

Turn an ad creative plus an existing website URL into a campaign-matched landing page preview.

The app keeps the original page structure, then rewrites eligible marketing copy and refreshes content imagery so the page feels aligned with the ad promise instead of looking like a completely different site.

## What It Does

- Accepts ad copy, an optional ad creative image, an optional ad destination URL, and the website URL to personalize.
- Scrapes the target page and tags eligible headings, paragraphs, CTAs, list items, and support text.
- Builds a campaign profile from the ad inputs: offer, tone, audience, industry, action, theme, and proof angle.
- Rewrites copy by element role so headlines, body copy, benefits, trust text, and CTAs do not repeat the same phrase everywhere.
- Replaces non-logo content images with distinct campaign-themed visual blocks that use different crops, filters, overlays, and captions.
- Shows relevance lift, rewritten elements, visual updates, campaign profile, change reasoning, and a desktop/mobile iframe preview.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, BeautifulSoup, Requests
- Deployment: Vercel frontend with a Render-hosted backend fallback

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

For deployed environments, set `BACKEND_API_URL` in Vercel if you want to override the default Render backend.

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
