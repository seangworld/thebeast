"use client";
import { useState } from "react";

type Opportunity = { url: string; product: string; platform: string; context: string; nextAction: string; recordedAt: string };
const storageKey = "beastmarketing-owner-opportunities-v1";
function validUrl(raw: string): URL | null {
  try { const url = new URL(raw); return ["https:", "http:"].includes(url.protocol) ? url : null; } catch { return null; }
}
function safeRead(): Opportunity[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Opportunity => !!item && typeof item === "object" && typeof item.url === "string" && !!validUrl(item.url) && typeof item.product === "string" && typeof item.platform === "string" && typeof item.context === "string" && typeof item.nextAction === "string" && typeof item.recordedAt === "string").slice(0, 50);
  } catch { return []; }
}
export function MarketingOpportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [url, setUrl] = useState("");
  const [product, setProduct] = useState("Philippines book");
  const [context, setContext] = useState("");
  const [nextAction, setNextAction] = useState("Reply helpfully if the discussion allows promotion");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  if (!loaded && typeof window !== "undefined") { /* Load only on user action to avoid hydration mismatches. */ }
  const load = () => { setItems(safeRead()); setLoaded(true); };
  const exportCsv = () => {
    const rows = safeRead();
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [["Platform","Product","Discussion URL","Relevance","Next action","Recorded at"].map(quote).join(","), ...rows.map(item => [item.platform,item.product,item.url,item.context,item.nextAction,item.recordedAt].map(quote).join(","))].join("\\r\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = downloadUrl; link.download = "beastmarketing-opportunities.csv"; link.click(); URL.revokeObjectURL(downloadUrl);
    setFeedback(`Exported ${rows.length} locally saved opportunities. This does not publish or sync them.`);
  };
  const save = () => {
    const parsed = validUrl(url);
    if (!parsed || !context.trim()) { setError("Enter a valid public discussion URL and explain why it is relevant."); return; }
    const host = parsed.hostname.toLowerCase();
    const platform = host.endsWith("reddit.com") ? "Reddit" : host.endsWith("facebook.com") || host.endsWith("fb.com") ? "Facebook" : host.endsWith("instagram.com") ? "Instagram" : host.endsWith("x.com") || host.endsWith("twitter.com") ? "X" : "Other";
    const next = [{ url: parsed.toString(), product, platform, context: context.trim().slice(0, 600), nextAction: nextAction.trim().slice(0, 300), recordedAt: new Date().toISOString() }, ...safeRead()].slice(0, 50);
    window.localStorage.setItem(storageKey, JSON.stringify(next)); setItems(next); setLoaded(true); setUrl(""); setContext(""); setError("");
  };
  return <section aria-label="Marketing opportunities" className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h2 className="text-xl font-black text-white">Opportunity notebook</h2>
    <p className="text-sm text-slate-300">Save real public discussions you discover on Facebook, Instagram, X or Reddit. This is a manual first step—not an automated scanner. Entries stay in this browser only and are not synced to your account.</p>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={load} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold text-white">Load saved opportunities</button><button type="button" onClick={exportCsv} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold text-white">Export CSV</button></div>
    {feedback && <p role="status" className="text-sm text-amber-100">{feedback}</p>}
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm text-slate-200">Public discussion URL<input value={url} onChange={e=>setUrl(e.target.value)} type="url" placeholder="https://..." className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white" /></label>
      <label className="text-sm text-slate-200">Product<select value={product} onChange={e=>setProduct(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">{["Philippines book","Other books","BeastGuide","BeastMoney","Backgammon & Acey-Deucey","SEANGWORLD"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-sm text-slate-200">Why is it relevant?<textarea value={context} onChange={e=>setContext(e.target.value)} maxLength={600} className="mt-1 min-h-24 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white" /></label>
      <label className="text-sm text-slate-200">Suggested next action<textarea value={nextAction} onChange={e=>setNextAction(e.target.value)} maxLength={300} className="mt-1 min-h-24 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white" /></label>
    </div>
    <button type="button" onClick={save} className="rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950">Save opportunity</button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {loaded && <div className="space-y-3">{items.length===0 && <p className="text-sm text-slate-400">No saved opportunities on this device.</p>}{items.map((item,i)=><article key={item.url+i} className="rounded-lg border border-white/10 p-3 text-sm"><p className="font-bold text-white">{item.platform} · {item.product}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-amber-200 underline">{item.url}</a><p className="mt-2 text-slate-300">{item.context}</p><p className="mt-1 text-slate-400">Next: {item.nextAction}</p><button type="button" className="mt-2 text-red-300 underline" onClick={()=>{const next=items.filter((_,index)=>index!==i);window.localStorage.setItem(storageKey,JSON.stringify(next));setItems(next);}}>Remove</button></article>)}</div>}
  </section>;
}
