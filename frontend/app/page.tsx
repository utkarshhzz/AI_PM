"use client";

import { useState } from "react";

export default function Home() {
  const [adUrl, setAdUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

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
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Landing Page Personalizer
          </h1>
          <p className="text-gray-500 dark:text-zinc-400">
            Make your landing page perfectly match your ad creative to boost conversions.
          </p>
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
            
            {/* Ad Brief Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">🤖 AI Ad Brief</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Detected Offer</p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis.ad_brief.detected_offer}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Brand Tone</p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis.ad_brief.tone}</p>
                </div>
              </div>
            </div>

            {/* Before / After Card */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">✨ Personalization Results</h2>
              
              <div className="space-y-4">
                {/* BEFORE */}
                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded mb-3">BEFORE (Original)</span>
                  <p className="text-lg text-gray-500 dark:text-gray-400 line-through">{response.original_headline}</p>
                </div>

                {/* AFTER */}
                <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-inner">
                  <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs font-bold rounded mb-3">AFTER (Personalized)</span>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-400">{response.ai_analysis.new_headline}</p>
                </div>
              </div>
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
