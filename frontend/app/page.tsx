"use client";

import { useState } from "react";

type PersonalizeResponse = {
  status?: string;
  error?: string;
  detail?: string;
  backend_used?: string;
  backend_attempts?: string[];
  failure_reasons?: string[];
  visuals_replaced?: number;
  modified_html?: string;
  ai_analysis?: {
    ad_brief?: {
      detected_offer?: string;
      tone?: string;
      audience?: string;
      industry?: string;
      campaign_theme?: string;
      primary_action?: string;
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
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const handleLoadExample = () => {
    setPageUrl("https://www.notion.com/product");
    setAdText("Launch week offer: build a calm team workspace, plan projects faster, and keep notes, docs, and tasks in one place.");
    setAdLink("https://www.notion.com/product");
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

  const replacementsCount = response?.ai_analysis?.replacements?.length || 0;
  const scoreBefore = response?.ai_analysis?.scores?.original_relevance ?? 0;
  const scoreAfter = response?.ai_analysis?.scores?.new_relevance ?? 0;
  const scoreDelta = Math.max(0, scoreAfter - scoreBefore);
  const adBrief = response?.ai_analysis?.ad_brief;
  const inputsUsed = [
    response?.ad_context_used?.used_image ? "image" : "",
    response?.ad_context_used?.used_ad_link ? "ad link" : "",
    response?.ad_context_used?.used_ad_text ? "ad copy" : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f6f7f3] dark:bg-zinc-950 flex flex-col p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full bg-white/95 backdrop-blur dark:bg-zinc-900/95 rounded-lg shadow-sm p-6 md:p-8 border border-gray-200 dark:border-zinc-800 mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-8">
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
              CRO Landing Page Personalizer
            </h1>
            <p className="text-gray-600 dark:text-zinc-300 max-w-2xl">
              Match page messaging to ad intent while preserving the original layout.
            </p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Guardrail Mode: Structure-first, grounded rewriting.
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                Message Match
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800">
                CTA Clarity
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
                Trust Framing
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadExample}
            className="text-sm px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-gray-200 dark:border-zinc-700 shadow-sm"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-zinc-950 dark:text-white file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-blue-700"
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
                : "bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
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

        {response && response.status === "success" && (
          <div className="mt-8 space-y-6 animate-fade-in transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/80 dark:bg-blue-900/20 dark:border-blue-800 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 font-semibold">Relevance Lift</p>
                <p className="text-3xl font-black text-blue-700 dark:text-blue-300 mt-1">+{scoreDelta}</p>
                <p className="text-xs text-blue-900/70 dark:text-blue-200/80 mt-1">
                  {scoreBefore} to {scoreAfter}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 dark:bg-emerald-900/20 dark:border-emerald-800 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">Personalized Elements</p>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{replacementsCount}</p>
                <p className="text-xs text-emerald-900/70 dark:text-emerald-200/80 mt-1">Structure preserved, copy improved</p>
              </div>
              <div className="rounded-xl border border-violet-200/80 bg-violet-50/80 dark:bg-violet-900/20 dark:border-violet-800 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300 font-semibold">Backend Status</p>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mt-2 truncate">
                  {response.backend_used || "Connected"}
                </p>
                <p className="text-xs text-violet-900/70 dark:text-violet-200/80 mt-1">Live personalization pipeline active</p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-800 p-4 lg:col-span-3">
                <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">Visual Personalization</p>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mt-2">
                  Images updated: {response.visuals_replaced ?? 0}
                </p>
                <p className="text-xs text-amber-900/70 dark:text-amber-200/80 mt-1">
                  Visuals are rebuilt as distinct campaign-matched blocks while preserving the page frame.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">Campaign Profile</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Theme</p>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">{adBrief?.campaign_theme || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Offer</p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">{adBrief?.detected_offer || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Brand Tone</p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">{adBrief?.tone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Target Audience</p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">{adBrief?.audience || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Industry / Action</p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {[adBrief?.industry, adBrief?.primary_action].filter(Boolean).join(" / ") || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
                <h2 className="text-xl font-bold text-green-900 dark:text-green-400 mb-2">Execution Details</h2>
                <p className="text-green-900/80 dark:text-green-200/80 text-sm">
                  Inputs used: {inputsUsed.length ? inputsUsed.join(", ") : "none"}
                </p>
                <div className="mt-4 rounded-lg border border-green-200 dark:border-green-800 bg-white/70 dark:bg-zinc-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-green-700 dark:text-green-300 font-semibold">Top rewrites</p>
                  <div className="mt-2 space-y-2 max-h-[140px] overflow-y-auto">
                    {response.ai_analysis?.replacements?.slice(0, 4).map((item) => (
                      <div key={item.id} className="text-xs text-gray-700 dark:text-zinc-300">
                        <span className="font-semibold text-green-700 dark:text-green-300">{item.id}</span>: {item.new_text}
                      </div>
                    ))}
                    {!response.ai_analysis?.replacements?.length && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400">No eligible text changes detected for this page.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800 mt-6 max-h-[300px] overflow-y-auto">
              <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-500 mb-4 sticky top-0 bg-yellow-50 dark:bg-zinc-900 py-2">Applied CRO Principles</h2>
              <div className="space-y-4">
                {response.ai_analysis?.changelog?.map((change, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-700/50 flex justify-between items-center gap-4">
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">{change.element || "Text Element"}</span>
                      <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{change.reasoning}</p>
                    </div>
                    <span className={`px-3 py-1 flex-shrink-0 text-xs font-bold rounded text-white ${change.confidence === "High" ? "bg-green-500" : change.confidence === "Medium" ? "bg-yellow-500" : "bg-red-500"}`}>
                      {change.confidence || "High"} Confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {response && (response.status === "error" || response.error || response.detail) && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-bold text-red-800 dark:text-red-400">Error</p>
            <p className="text-red-700 dark:text-red-300 mt-1">{response.error || response.detail}</p>
            {response.detail && <p className="text-red-700 dark:text-red-300 mt-2 text-sm">{response.detail}</p>}
            {response.backend_attempts && response.backend_attempts.length > 0 && (
              <p className="text-red-700 dark:text-red-300 mt-2 text-xs">
                Tried: {response.backend_attempts.join(" | ")}
              </p>
            )}
          </div>
        )}
      </div>

      {response && response.status === "success" && response.modified_html && (
        <div className={`mx-auto ${previewMode === "desktop" ? "w-[95%] max-w-[1400px]" : "w-[390px] max-w-[95%]"} h-[820px] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_20px_50px_-12px_rgba(59,130,246,0.3)] border border-blue-500/20 overflow-hidden flex flex-col mt-12 mb-16 border-b-8 border-x-8 border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-out`}>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 cursor-pointer shadow-sm"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 cursor-pointer shadow-sm"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-500 cursor-pointer shadow-sm"></div>
            </div>
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 px-4 py-1.5 rounded-md w-full truncate shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2">
              <span className="text-zinc-400">Secure preview</span>
              <span className="text-green-600 dark:text-green-400">CRO-Optimized:</span> {pageUrl}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`px-3 py-1 rounded-md text-xs font-semibold border ${previewMode === "desktop" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`px-3 py-1 rounded-md text-xs font-semibold border ${previewMode === "mobile" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"}`}
              >
                Mobile
              </button>
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
