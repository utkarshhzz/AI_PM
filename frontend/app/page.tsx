"use client";

import { useState } from "react";

export default function Home() {
  const [adImage, setAdImage] = useState<File | null>(null);
  const [pageUrl, setPageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleLoadExample = async () => {
    // We can't automatically fill a file input for security reasons, so we'll just set the page URL
    setPageUrl("https://github.com");
    alert("Please upload an example ad image manually.");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAdImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adImage) {
      alert("Please upload an ad image first.");
      return;
    }
    
    setIsLoading(true);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append("ad_image", adImage);
      formData.append("page_url", pageUrl);

      const apiUrl = "https://ai-pm-q8uz.onrender.com/api/personalize";
      const res = await fetch(apiUrl, {
        method: "POST",
        // Do not set Content-Type manually when using FormData, browser will set it with boundary
        body: formData,
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
    <main className="min-h-screen bg-gray-50 flex flex-col p-4 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-zinc-800 mb-8">
        
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
              Full-Page AI Personalizer
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Dynamically rewrite the entire website's copy to perfectly align with your ad creative.
            </p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Enterprise Mode: Full DOM replacement enabled.
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

        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="adImage" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Upload Ad Image
                </label>
                <input
                  type="file"
                  id="adImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="pageUrl" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Target Website URL
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm mt-6 ${
              isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Analyzing Full DOM & Generating Rewrites..." : "Personalize Full Website"}
          </button>
        </form>

        {/* Display Backend Response Stats */}
        {response && response.status === "success" && !response.ai_analysis?.error && (
          <div className="mt-8 space-y-6 animate-fade-in transition-all">
            
            <div className="grid grid-cols-1 gap-6">
                {/* Ad Brief Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                  <h2 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">🤖 AI Ad Brief & Alignment</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Detected Offer / CTA</p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis.ad_brief.detected_offer}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                </div>

                {/* Relevance Score & Changelog summary */}
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800 flex flex-col justify-center">
                    <h2 className="text-xl font-bold text-green-900 dark:text-green-400 mb-2">Relevance Score Improved</h2>
                    <div className="flex items-center gap-4 my-4">
                        <span className="text-gray-400 line-through text-4xl font-bold">{response.ai_analysis.scores.original_relevance}</span>
                        <span className="text-green-500 text-2xl">→</span>
                        <span className="text-5xl font-black text-green-600 dark:text-green-400">{response.ai_analysis.scores.new_relevance}</span>
                    </div>
                    <p className="text-green-800 dark:text-green-300 font-medium">Successfully replaced {response.ai_analysis.replacements?.length || 0} DOM elements across the page.</p>
                </div>
            </div>

            {/* CRO Reasoning Changelog Panel */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800 mt-6 max-h-[300px] overflow-y-auto">
              <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-500 mb-4 sticky top-0 bg-yellow-50 dark:bg-zinc-900 py-2">🧠 Applied CRO Principles</h2>
              <div className="space-y-4">
                {response.ai_analysis.changelog?.map((change: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-700/50 flex justify-between items-center gap-4">
                    <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{change.element || "Text Element"}</span>
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{change.reasoning}</p>
                    </div>
                    <span className={`px-3 py-1 flex-shrink-0 text-xs font-bold rounded text-white ${change.confidence === 'High' ? 'bg-green-500' : change.confidence === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                        {change.confidence || "High"} Confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        )}

        {/* Display Error UI */}
        {response && (response.status === "error" || response.ai_analysis?.error || response.error) && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-bold text-red-800 dark:text-red-400">⚠️ Error</p>
            <p className="text-red-700 dark:text-red-300 mt-1">{response.error || response.ai_analysis?.error}</p>
          </div>
        )}
      </div>

      {/* Full Page Live Preview iframe */}
      {response && response.status === "success" && response.modified_html && !response.ai_analysis?.error && (
          <div className="w-[95%] mx-auto h-[900px] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col mt-4 border-b-8 border-x-8">
              <div className="bg-zinc-100 dark:bg-zinc-800 p-3 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-4">
                  <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1 rounded w-full max-w-2xl truncate shadow-inner border border-zinc-200 dark:border-zinc-700">
                      Personalized Preview: {pageUrl}
                  </div>
              </div>
              <iframe 
                className="w-full h-full flex-grow border-none"
                srcDoc={response.modified_html}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                title="Personalized Landing Page"
              />
          </div>
      )}
    </main>
  );
}
