# AI-Powered Landing Page Personalizer 🚀

An intelligent, full-stack application built for the **Troopod Product Engineering Internship Assignment**. This tool automatically analyzes an advertising creative and a landing page, then generates a highly targeted, personalized Hero Section (Headline, Sub-headline, and CTA) optimized for Conversion Rate Optimization (CRO).

## ✨ Features

- **🧠 Multi-Model AI Fallback Pipeline**: Integrates with OpenRouter. If a primary AI model hits a rate limit (429), the backend gracefully falls back to a curated list of 11 other models to ensure high availability.
- **🕸️ Dynamic Web Scraping**: Built with Python and BeautifulSoup to securely extract existing hero elements from any provided URL.
- **🏗️ Structured JSON Generation**: Enforces strict JSON schemas on the LLM to separate the Ad Brief, Relevance Scores, generated text, and CRO reasoning.
- **📊 CRO Reasoning & Confidence Engine**: Doesn't just change text—it explains *why* the change works based on psychological CRO principles (e.g., Message Match, Urgency) and provides a confidence score.
- **📱 Mobile Preview Toggle**: One-click toggle to view the personalized hero section in a 375px mobile frame.
- **🛡️ Protected Zones Guardrails**: Strictly modifies *only* the hero section, ensuring the rest of the landing page structure remains completely untouched.
- **📋 One-Click Export**: Easily copy the generated HTML snippet to paste directly into your CMS (WordPress, Webflow, Shopify).

## 🛠️ Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS, TypeScript
- **Backend**: Python, FastAPI, Uvicorn
- **Scraping**: Requests, BeautifulSoup4
- **AI Integration**: OpenRouter API (Gemma, Llama Vision, Claude, etc.)

---

## 🚀 Getting Started

Follow these step-by-step instructions to run the project locally on your machine.

### Prerequisites
1. **Node.js** (v18+ recommended)
2. **Python** (v3.9+ recommended)
3. **OpenRouter API Key** (Get one at [openrouter.ai](https://openrouter.ai/))

### 1. Clone the Repository
```bash
git clone https://github.com/utkarshhzz/AI_PM.git
cd AI_PM
```

### 2. Set Up the Python Backend
Open a terminal in the root directory (`AI_PM`):

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

### 3. Add Your API Key
Create a `.env` file in the root `AI_PM` directory and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-your_api_key_here
```

### 4. Start the Backend Server
With your virtual environment activated, run:
```bash
uvicorn main:app --reload --port 8000
```
*The backend will now be running on `http://127.0.0.1:8000`*

### 5. Set Up and Start the Next.js Frontend
Open a **new** terminal, navigate to the frontend folder, and start the development server:

```bash
cd frontend
npm install
npm run dev
```
*The frontend will now be running on `http://localhost:3000`*

---

## 💡 How to Use the App

1. Open your browser and go to `http://localhost:3000`.
2. **Load Example**: Click the `📋 Load Example` button in the top right to pre-fill the form with a sample Nike ad and GitHub's landing page.
3. **Personalize**: Click **Personalize Landing Page**.
4. Wait a few seconds for the AI pipeline to finish processing.
5. Explore the interactive results:
   - Check out the **Relevance Score** improvement.
   - Review the **AI Ad Brief** (Offer, Tone, Target Audience).
   - Toggle the **Mobile Frame** to see responsiveness.
   - Read the **CRO Reasoning** to understand the psychology behind the changes.
6. **Export**: Click the `Copy HTML Snippet for CMS` button at the bottom to get your production-ready code.

---

*Built with ❤️ for Troopod by Utkarsh Kumar.*