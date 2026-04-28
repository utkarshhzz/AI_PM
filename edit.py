import os

with open('frontend/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write('''"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adPreview, setAdPreview] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [response, setResponse] = useState<any>(null);

  const steps = [
    "Scraping & Mapping DOM Tree...",
    "Encoding Media Variables...",
    "Running Multi-Modal Vision Analysis...",
    "Applying Conversion Optimization...",
    "Injecting Text & Visuals..."
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading, steps.length]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAdImage(file);
      setAdPreview(URL.createObjectURL(file));
      setResponse(null);
    }
  };

  const handleLoadExample = () => {
    setPageUrl("https://react.dev");
    alert("Try dropping any stylish Ad image (like Nike, Apple, or Gymshark) into the uploader to see the website completely transform!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adImage) {
      alert("Please upload an ad creative first.");
      return;
    }
    
    setIsLoading(true);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append("ad_image", adImage);
      formData.append("page_url", pageUrl);

      // Local API proxy request mapping (or use direct render link if desired)
      const apiUrl = "https://ai-pm-q8uz.onrender.com/api/personalize";
      const res = await fetch(apiUrl, { method: "POST", body: formData });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error(error);
      setResponse({ error: "Failed to connect to the AI Engine server." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/20 dark:from-zinc-950 dark:to-[#09090b] text-gray-900 dark:text-gray-100 font-sans pb-24">
      
      {/* Dynamic Header */}
      <div className="w-full bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-bold tracking-tight">AI</div>
              <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-zinc-400">
                Troopod Agent
              </h1>
            </div>
            <a href="https://github.com/utkarshhzz/AI_PM" target="_blank" className="text-sm font-semibold text-slate-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md">
                View Source
            </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6 relative">
            <div className="bg-white dark:bg-[#111113] p-6 rounded-3xl shadow-xl border border-slate-200/60 dark:border-zinc-800/80 backdrop-blur-3xl relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
              
              <div className="flex justify-between items-center mb-8 relative z-10 w-full">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex-1 relative top-2">Campagin Input</h2>
                <button onClick={handleLoadExample} type="button" className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition font-bold z-10 border border-indigo-100 dark:border-indigo-800/50 flex-none shrink-0 top-1 relative">
                  Use Presets
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                
                {/* Image Upload Area */}
                <div className="relative group">
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">1. Master Campaign Visual</label>
                  
                  <div className={"relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl transition-all overflow-hidden " + (adPreview ? 'border-transparent shadow-lg' : 'border-slate-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-zinc-800 cursor-pointer')}>
                    {adPreview ? (
                      <div className="w-full h-full relative group">
                        <img src={adPreview} alt="Preview" className="w-full h-full object-cover transition duration-500 xl:group-hover:scale-105" />
                        <label htmlFor="adImage" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer">
                            <span className="bg-black/80 text-white text-sm px-4 py-2 rounded-lg backdrop-blur-md shadow-xl font-bold border border-white/20 transform scale-95 group-hover:scale-100 transition-all">Swap Asset</span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-slate-400 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Upload Ad Creative</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">JPEG, PNG, WEBP</p>
                      </div>
                    )}
                    <input type="file" id="adImage" accept="image/*" onChange={handleImageChange} required className={adPreview ? "hidden" : "absolute inset-0 w-full h-full opacity-0 cursor-pointer"} />
                  </div>
                </div>

                <div>
                  <label htmlFor="pageUrl" className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    2. Injection Target URL
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    </div>
                    <input
                      type="url"
                      id="pageUrl"
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      placeholder="https://react.dev"
                      required
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-sm shadow-inner group-hover:border-slate-300 dark:group-hover:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="pt-4">
                    <button type="submit" disabled={isLoading} className={"relative overflow-hidden w-full text-white font-bold py-4 px-6 rounded-xl transition-all border border-blue-500/20 shadow-xl shadow-blue-500/20 flex justify-center items-center gap-3 " + (isLoading ? "cursor-not-allowed opacity-90 bg-blue-600" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 active:translate-y-0")}>
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="animate-pulse font-bold tracking-wide">Executing Pipeline...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                Sequence Overwrites
                            </>
                        )}
                    </button>
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <span className="flex items-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> DOM Re-Structure</span>
                        <span className="flex items-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Image Sync</span>
                    </div>
                </div>
              </form>
            </div>
        </div>

        {/* Right Column: AI Analysis Engine & Results */}
        <div className="lg:col-span-8">
            {isLoading && (
                <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-white/40 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/50 rounded-3xl animate-pulse backdrop-blur-sm">
                    <div className="w-full max-w-sm p-8 bg-white dark:bg-[#111113] shadow-2xl rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                Multimodal Build Log
                            </h3>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-black rounded-lg">{Math.round(((loadingStep + 1)/steps.length)*100)}%</span>
                        </div>
                        <div className="space-y-5">
                            {steps.map((text, i) => (
                                <div key={i} className={"flex gap-3 items-center transition-all " + (i > loadingStep ? 'opacity-30' : '')}>
                                    <div className={"w-6 h-6 rounded-full flex shrink-0 items-center justify-center font-bold text-xs " + (i < loadingStep ? 'bg-green-500 text-white' : i === loadingStep ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' : 'bg-slate-200 dark:bg-zinc-800 text-transparent')}>
                                        {i < loadingStep ? "✓" : i === loadingStep ? "…" : ""}
                                    </div>
                                    <span className={"text-sm font-semibold tracking-wide " + (i < loadingStep ? 'text-slate-500 dark:text-gray-400' : i === loadingStep ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-600')}>{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {response && response.error && (
                <div className="bg-red-50 dark:bg-[#111113] border border-red-200 dark:border-red-900/50 p-8 rounded-3xl shadow-sm text-center animate-fade-in">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">!</div>
                    <h3 className="text-red-800 dark:text-red-400 font-extrabold text-xl mb-2">Process Execution Halted</h3>
                    <p className="text-red-600 dark:text-red-300 text-sm font-medium mb-4">{response.error || response.ai_analysis?.error}</p>
                    <p className="text-xs text-red-500/80 font-mono bg-red-100 dark:bg-red-900/20 py-3 px-4 rounded-lg inline-block text-left relative">
                        Exception trace: Bot Shield (403) blocked connection to target <br/><br/> 
                        <span className="font-bold text-red-600 dark:text-red-400">Solution:</span> Try an unprotected SaaS or tech site (e.g. `react.dev`, `htmx.org`) which doesn't bounce simple scrapers.
                    </p>
                </div>
            )}

            {response && response.status === "success" && !response.error && !isLoading && (
                <div className="flex flex-col gap-6 animate-fade-in">
                    
                    {/* Insights Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]"> 
                        {/* Target Conversion Insights Card */}
                        <div className="bg-white dark:bg-[#111113] p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col h-full bg-gradient-to-br from-slate-50 to-white dark:from-[#111113] dark:to-black">
                            <h3 className="text-xs tracking-widest font-black uppercase text-indigo-500 dark:text-indigo-400 mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                Synced Ad Trait Hooks
                            </h3>
                            <div className="space-y-6 flex-grow">
                                <div className="border-l-4 border-indigo-500 pl-5">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Action Offer Match</p>
                                    <p className="text-slate-800 dark:text-gray-100 font-bold text-sm leading-snug">{response.ai_analysis.ad_brief.detected_offer}</p>
                                </div>
                                <div className="border-l-4 border-fuchsia-500 pl-5">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Aesthetic Tone Match</p>
                                    <p className="text-slate-800 dark:text-gray-100 font-bold text-sm leading-snug">{response.ai_analysis.ad_brief.tone}</p>
                                </div>
                                <div className="border-l-4 border-blue-500 pl-5">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Core Demographic</p>
                                    <p className="text-slate-800 dark:text-gray-100 font-bold text-sm leading-snug">{response.ai_analysis.ad_brief.audience}</p>
                                </div>
                            </div>
                        </div>

                        {/* Impact Score Card */}
                        <div className="bg-gradient-to-br flex flex-col justify-center items-center from-gray-900 via-slate-800 to-black dark:from-zinc-900 dark:to-black p-8 rounded-3xl shadow-2xl relative overflow-hidden h-full border border-slate-700/50 dark:border-white/5">
                            <div className="absolute inset-0 bg-blue-500/5 blur-[50px] rounded-full scale-150"></div>
                            
                            <h3 className="text-xs text-white/50 tracking-widest font-black uppercase mb-4 absolute top-8 left-8">Match Conversion Lift</h3>
                            <div className="flex flex-col items-center justify-center mt-4">
                                <div className="flex items-center justify-center gap-6 mb-2">
                                    <span className="text-slate-500 line-through text-5xl font-light">{response.ai_analysis.scores.original_relevance}</span>
                                    <div className="p-2.5 bg-green-500/20 rounded-full animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </div>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-green-300 to-emerald-500 text-7xl font-black drop-shadow-lg scale-110">
                                        {response.ai_analysis.scores.new_relevance}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change-Log Table View */}
                    <div className="bg-white dark:bg-[#111113] rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
                        <div className="border-b border-slate-200 dark:border-zinc-800 px-8 py-5 flex justify-between items-center bg-slate-50 dark:bg-[#111113]">
                            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="p-1 px-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-black mr-1">SYS</span>
                                DOM Manipulation Diagnostics
                            </h3>
                            <div className="flex gap-2">
                                <span className="bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border border-slate-300/50 dark:border-zinc-700">{response.ai_analysis.changelog?.length || 0} Copy Overwrites</span>
                                {response.visuals_replaced > 0 && <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border border-emerald-200/50 dark:border-emerald-800/50">{response.visuals_replaced} Visual Syncs</span>}
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
                            {response.ai_analysis.changelog?.map((change: any, i: number) => (
                                <div key={i} className="p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-5 items-start">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 mb-1.5">{change.element}</p>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">{change.reasoning}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Live Preview Safari Window */}
      {response && response.status === "success" && (
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 w-full mt-24 mb-16 animate-fade-in-up delay-150">
            <div className="flex items-center justify-center gap-3 mb-8">
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-200/50">Live Demo Configured</span>
                <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500 ml-2">Displaying personalized instance of <strong className="text-slate-600 dark:text-zinc-300">{pageUrl}</strong></span>
            </div>
            
            {/* The Safari Window Frame */}
            <div className="w-full h-[950px] bg-white dark:bg-[#000] rounded-2xl rounded-t-3xl shadow-2xl dark:shadow-none overflow-hidden flex flex-col border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 mx-auto">
                {/* Safari Browser Top Bar */}
                <div className="bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#2d2d2f] dark:to-[#222224] h-14 border-b border-slate-300 dark:border-[#111] flex items-center px-5 relative shrink-0">
                    <div className="flex gap-2.5 absolute left-5">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-sm border border-red-500/20"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-sm border border-amber-500/20"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-sm border border-green-500/20"></div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center justify-center gap-2 bg-white dark:bg-[#1a1a1c] px-4 py-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-[#333] min-w-[350px] max-w-[700px] w-full mx-auto relative group">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                            <span className="text-xs font-semibold text-slate-800 dark:text-gray-300 font-mono tracking-tight">{pageUrl.replace('https://', '')}</span>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded ml-2 shadow-inner border border-emerald-200/50">Personalized Lock</span>
                        </div>
                    </div>
                </div>
                {/* Embedded Fully Replaced DOM HTML */}
                <iframe 
                    className="w-full h-full flex-grow border-none bg-white"
                    srcDoc={response.modified_html}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                    title="Personalized Ad Alignment"
                />
            </div>
        </div>
      )}
    </main>
  );
}
''')
