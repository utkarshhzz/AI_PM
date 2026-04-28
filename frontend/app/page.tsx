"use client";

import { useState } from "react";

type PersonalizeResponse = {
  status?: string;
  error?: string;
  detail?: string;
  modified_html?: string;
  ai_analysis?: {
    ad_brief?: {
      detected_offer?: string;
      tone?: string;
      audience?: string;
    };
    scores?: {
      original_relevance?: number;
      new_relevance?: number;
    };
    replacements?: Array<{ id: string; original: string; new_text: string }>;
    changelog?: Array<{ element?: string; reasoning?: string; confidence?: string }>;
  };
  ad_context_used?: {
    used_image?: boolean;
    used_ad_text?: boolean;
    used_ad_link?: boolean;
  };
};

export default function Home() {
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adText, setAdText] = useState("");
  const [adLink, setAdLink] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<PersonalizeResponse | null>(null);
  const [formError, setFormError] = useState("");

  const handleLoadExample = async () => {
    setPageUrl("https://github.com");
    setAdText("Build faster with one secure platform for your team.");
    setAdLink("https://github.com/features");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAdImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const hasImage = Boolean(adImage);
    const hasText = adText.trim().length > 0;
    const hasLink = adLink.trim().length > 0;
    if (!hasImage && !hasText && !hasLink) {
      setFormError("Provide at least one ad input: image, ad text, or ad link.");
      return;
    }
    if (!pageUrl.trim()) {
      setFormError("Please enter a landing page URL.");
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const formData = new FormData();
      if (adImage) {
        formData.append("ad_image", adImage);
      }
      if (adText.trim()) {
        formData.append("ad_text", adText.trim());
      }
      if (adLink.trim()) {
        formData.append("ad_link", adLink.trim());
      }
      formData.append("page_url", pageUrl);

      const res = await fetch("/api/personalize", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as PersonalizeResponse;
      if (!res.ok) {
        setResponse({
          status: "error",
          error: data.error || data.detail || "Request failed.",
        });
        return;
      }
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
              CRO Landing Page Personalizer
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Match page messaging to ad intent while preserving the original layout.
            </p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Guardrail Mode: Structure-first, grounded rewriting.
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleLoadExample}
            className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-gray-200 dark:border-zinc-700 shadow-sm"
          >
            Load Example Inputs
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="adImage" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Ad Creative Image (Optional)
                </label>
                <input
                  type="file"
                  id="adImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="adLink" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Ad Destination URL (Optional)
                </label>
                <input
                  type="url"
                  id="adLink"
                  value={adLink}
                  onChange={(e) => setAdLink(e.target.value)}
                  placeholder="https://ad-campaign.example"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-zinc-950 dark:text-white"
                />
              </div>
          </div>

          <div>
            <label htmlFor="adText" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Ad Copy / Notes (Optional)
            </label>
            <textarea
              id="adText"
              value={adText}
              onChange={(e) => setAdText(e.target.value)}
              rows={3}
              placeholder="Paste headline, offer text, or audience hints from the ad."
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

          {formError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md mt-6 flex justify-center items-center gap-2 ${
              isLoading 
                ? "bg-blue-400 dark:bg-blue-500/50 cursor-not-allowed opacity-80" 
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Personalizing landing page...
                </>
            ) : "Generate Personalized Landing Page"}
          </button>
        </form>

        {/* Display Backend Response Stats */}
        {response && response.status === "success" && (
          <div className="mt-8 space-y-6 animate-fade-in transition-all">
            
            <div className="grid grid-cols-1 gap-6">
                {/* Ad Brief Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                  <h2 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">🤖 AI Ad Brief & Alignment</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Detected Offer / CTA</p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis?.ad_brief?.detected_offer || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Brand Tone</p>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis?.ad_brief?.tone || "N/A"}</p>
                        </div>
                        <div>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Target Audience</p>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">{response.ai_analysis?.ad_brief?.audience || "N/A"}</p>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Relevance Score & Changelog summary */}
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800 flex flex-col justify-center">
                    <h2 className="text-xl font-bold text-green-900 dark:text-green-400 mb-2">Relevance Score Improved</h2>
                    <div className="flex items-center gap-4 my-4">
                        <span className="text-gray-400 line-through text-4xl font-bold">{response.ai_analysis?.scores?.original_relevance ?? 0}</span>
                        <span className="text-green-500 text-2xl">→</span>
                        <span className="text-5xl font-black text-green-600 dark:text-green-400">{response.ai_analysis?.scores?.new_relevance ?? 0}</span>
                    </div>
                    <p className="text-green-800 dark:text-green-300 font-medium">Successfully replaced {response.ai_analysis?.replacements?.length || 0} DOM elements across the page.</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Inputs used: {response.ad_context_used?.used_image ? "image " : ""}
                      {response.ad_context_used?.used_ad_link ? "ad-link " : ""}
                      {response.ad_context_used?.used_ad_text ? "ad-text" : ""}
                    </p>
                </div>
            </div>

            {/* CRO Reasoning Changelog Panel */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800 mt-6 max-h-[300px] overflow-y-auto">
              <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-500 mb-4 sticky top-0 bg-yellow-50 dark:bg-zinc-900 py-2">🧠 Applied CRO Principles</h2>
              <div className="space-y-4">
                {response.ai_analysis?.changelog?.map((change, idx: number) => (
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
        {response && (response.status === "error" || response.error || response.detail) && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-bold text-red-800 dark:text-red-400">⚠️ Error</p>
            <p className="text-red-700 dark:text-red-300 mt-1">{response.error || response.detail}</p>
          </div>
        )}
      </div>

      {/* Full Page Live Preview iframe */}
      {response && response.status === "success" && response.modified_html && (
          <div className="w-[95%] max-w-[1400px] mx-auto h-[800px] bg-white dark:bg-zinc-900 rounded-xl shadow-[0_20px_50px_-12px_rgba(59,130,246,0.3)] border border-blue-500/20 overflow-hidden flex flex-col mt-12 mb-16 border-b-8 border-x-8 border-zinc-200 dark:border-zinc-800 transition-all duration-700 ease-out transform scale-100 opacity-100">
              <div className="bg-zinc-100 dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
                  <div className="flex gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 cursor-pointer shadow-sm"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 cursor-pointer shadow-sm"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-500 cursor-pointer shadow-sm"></div>
                  </div>
                  <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 px-4 py-1.5 rounded-md w-full max-w-2xl truncate shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2">
                      <span>🔒</span>
                      <span className="text-green-600 dark:text-green-400">Cro-Optimized:</span> {pageUrl}
                  </div>
              </div>
              <iframe 
                className="w-full h-full flex-grow border-none bg-white"
                srcDoc={response.modified_html}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                title="Personalized Landing Page"
              />
          </div>
      )}
    </main>
  );
}
