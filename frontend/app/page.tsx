"use client";

import { useState } from "react";

export default function Home() {
  const [adUrl, setAdUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  const handleLoadExample = () => {
    setAdUrl("https://images.unsplash.com/photo-1542291026-7eec264c27ff");
    setPageUrl("https://github.com");
  };

  const handleExportHtml = () => {
    if (!response || !response.ai_analysis?.new_hero) return;
    
    // Generate an HTML snippet combining the hero changes
    const codeSnippet = `<!-- AI Personalized Hero Section -->
<section class="hero-section">
  <h1 class="headline">${response.ai_analysis.new_hero.headline}</h1>
  <p class="sub-headline">${response.ai_analysis.new_hero.sub_headline}</p>
  <button class="cta-button">${response.ai_analysis.new_hero.cta_text}</button>
</section>
<!-- Only the hero section was modified. Safe to drop into your CMS. -->`;

    navigator.clipboard.writeText(codeSnippet);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/personalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ad_url: adUrl,
          page_url: pageUrl,
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setResponse({ error: "Failed to connect to the backend server." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dark:bg-zinc-950">
      <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-zinc-800">
        
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
              AI Landing Page Personalizer
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Boost conversions by perfectly aligning your landing page hero section with your ad creatives.
            </p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Protected Zones Enforced: Modifies ONLY Hero element.
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleLoadExample}
            className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-gray-200 dark:border-zinc-700 shadow-sm"
          >
            📋 Load Example
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="adUrl" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Ad Image URL
            </label>
            <input
              type="url"
              id="adUrl"
              value={adUrl}
              onChange={(e) => setAdUrl(e.target.value)}
              placeholder="https://example.com/my-ad.jpg"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="pageUrl" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Landing Page URL
            </label>
            <input
              type="url"
              id="pageUrl"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm ${
              isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Connecting to Backend..." : "Personalize Landing Page"}
          </button>
        </form>

        {/* Display Backend Response */}
        {response && response.status === "success" && !response.ai_analysis?.error && (
          <div className="mt-8 space-y-6 animate-fade-in transition-all">
            
            {/* Relevance Score Banner */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center flex items-center justify-center gap-3">
              <span className="text-indigo-800 dark:text-indigo-400 font-medium">Relevance Score:</span>
              <span className="text-gray-500 line-through text-lg">{response.ai_analysis.scores.original_relevance}</span>
              <span className="text-indigo-600 dark:text-indigo-300">→</span>
              <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{response.ai_analysis.scores.new_relevance} / 100</span>
            </div>

            {/* Ad Brief Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">🤖 AI Ad Brief</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Detected Offer</p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis.ad_brief.detected_offer}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Brand Tone</p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis.ad_brief.tone}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Target Audience</p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis.ad_brief.audience}</p>
                </div>
              </div>
            </div>

            {/* Before / After Card */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:justify-between items-center justify-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">✨ Personalization Results</h2>
                <button 
                  onClick={() => setIsMobilePreview(!isMobilePreview)}
                  className="px-4 py-1.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-sm shadow font-semibold rounded-full transition-colors flex items-center gap-2"
                >
                  {isMobilePreview ? "📱 Switch to Desktop" : "💻 Switch to Mobile Frame"}
                </button>
              </div>
              
              <div className={`space-y-4 transition-all duration-500 mx-auto ${isMobilePreview ? "max-w-[375px] border-x-[12px] border-y-[24px] border-gray-900 rounded-[2.5rem] p-3 shadow-2xl relative" : "w-full"}`}>
                {isMobilePreview && <div className="absolute top-[-16px] left-[50%] translate-x-[-50%] w-20 h-4 bg-gray-900 rounded-b-xl" />}
                {/* BEFORE */}
                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded mb-3">BEFORE (Original)</span>
                  <div className="space-y-2 opacity-60">
                    <p className="text-xl font-bold line-through">{response.original_hero.headline}</p>
                    <p className="text-md line-through">{response.original_hero.sub_headline}</p>
                    <button className="px-4 py-2 bg-gray-300 text-gray-600 rounded text-sm font-bold line-through" disabled>{response.original_hero.cta_text}</button>
                  </div>
                </div>

                {/* AFTER */}
                <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-inner">
                  <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs font-bold rounded mb-3">AFTER (Personalized)</span>
                  <div className="space-y-3">
                    <p className="text-3xl font-black text-green-900 dark:text-green-400">{response.ai_analysis.new_hero.headline}</p>
                    <p className="text-lg text-green-800 dark:text-green-300">{response.ai_analysis.new_hero.sub_headline}</p>
                    <button className="px-6 py-3 bg-green-600 text-white rounded shadow-md font-bold hover:bg-green-700 transition" disabled>{response.ai_analysis.new_hero.cta_text}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* CRO Reasoning Changelog Panel */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800">
              <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-500 mb-4">🧠 CRO Reasoning & Confidence</h2>
              <div className="space-y-4">
                {response.ai_analysis.changelog.map((change: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-700/50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900 dark:text-white">{change.element}</span>
                      <span className={`px-2 py-1 text-xs font-bold rounded text-white ${change.confidence === 'High' ? 'bg-green-500' : change.confidence === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                        {change.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Principle: {change.cro_principle}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{change.reasoning}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-zinc-700 pt-2">{change.confidence_reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-zinc-800">
              <button 
                onClick={handleExportHtml}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-lg shadow-md font-bold transition-all relative overflow-hidden"
              >
                {exportSuccess ? "✅ Copied to Clipboard!" : "📄 Copy HTML Snippet for CMS"}
              </button>
            </div>
            
          </div>
        )}

        {/* Display Error UI */}
        {response && (response.status === "error" || response.ai_analysis?.error) && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-bold text-red-800 dark:text-red-400">⚠️ Error</p>
            <p className="text-red-700 dark:text-red-300 mt-1">{response.error || response.ai_analysis?.error}</p>
          </div>
        )}

      </div>
    </main>
  );
}
