"use client";
import { useState } from "react";

type RecordEntry = { date: string; product: string; source: string; views: number | null; engagements: number | null; clicks: number | null; sales: number | null; revenue: number | null; spend: number | null; note: string };
const key = "beastmarketing-owner-results-v1";
const products = ["Philippines book","Other books","BeastGuide","BeastMoney","Backgammon & Acey-Deucey","SEANGWORLD"];
const empty: RecordEntry = { date: new Date().toISOString().slice(0,10), product: products[0], source: "Facebook Professional Dashboard (manual)", views: null, engagements: null, clicks: null, sales: null, revenue: null, spend: null, note: "" };
const fields = ["views","engagements","clicks","sales","revenue","spend"] as const;
function read(): RecordEntry[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter((v):v is RecordEntry=>!!v && typeof v==="object" && typeof v.date==="string" && typeof v.product==="string" && typeof v.source==="string").slice(0,100) : []; }
  catch { return []; }
}
function format(value: number | null, money=false) { return value===null ? "Not provided" : money ? value.toLocaleString("en-US",{style:"currency",currency:"USD"}) : value.toLocaleString("en-US"); }
export function MarketingResultsNotebook() {
  const [draft,setDraft] = useState<RecordEntry>(empty);
  const [entries,setEntries] = useState<RecordEntry[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [error,setError] = useState("");
  const load=()=>{setEntries(read());setLoaded(true);};
  const save=()=>{
    if(!draft.date || !draft.product || fields.every(f=>draft[f]===null)){setError("Provide a date, product and at least one measured result.");return;}
    const next=[{...draft,note:draft.note.slice(0,500)},...read()].slice(0,100);
    localStorage.setItem(key,JSON.stringify(next));setEntries(next);setLoaded(true);setError("");
  };
  const totals = entries.reduce((a,v)=>({views:a.views+(v.views??0),engagements:a.engagements+(v.engagements??0),clicks:a.clicks+(v.clicks??0),sales:a.sales+(v.sales??0),revenue:a.revenue+(v.revenue??0),spend:a.spend+(v.spend??0)}),{views:0,engagements:0,clicks:0,sales:0,revenue:0,spend:0});
  const present = (field:typeof fields[number])=>entries.some(e=>e[field]!==null);
  return <section aria-label="Campaign results notebook" className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h2 className="text-xl font-black text-white">Measure Facebook results</h2>
    <p className="text-sm text-slate-300">Enter numbers from your Facebook Professional Dashboard or verified sales records. Missing metrics stay unknown, not zero. This browser-only notebook is not a Meta API integration or proof that sales came from Facebook.</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm text-slate-200">Date<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/></label>
      <label className="text-sm text-slate-200">Product<select value={draft.product} onChange={e=>setDraft({...draft,product:e.target.value})} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">{products.map(p=><option key={p}>{p}</option>)}</select></label>
      <label className="text-sm text-slate-200">Evidence source<select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"><option>Facebook Professional Dashboard (manual)</option><option>Website analytics (manual)</option><option>Verified sales record (manual)</option><option>Other manually entered source</option></select></label>
      {fields.map(field=><label key={field} className="text-sm capitalize text-slate-200">{field} {["revenue","spend"].includes(field)?"(USD)":""}<input type="number" min="0" step={["revenue","spend"].includes(field)?"0.01":"1"} placeholder="Unknown" value={draft[field]??""} onChange={e=>{const value=e.target.value;setDraft({...draft,[field]:value===""?null:Number(value)});}} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/></label>)}
    </div>
    <label className="block text-sm text-slate-200">Evidence notes (date range, post link, source)<textarea value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})} maxLength={500} className="mt-1 min-h-20 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/></label>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={save} className="rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950">Record results</button><button type="button" onClick={load} className="rounded-lg border border-white/20 px-4 py-3 text-sm text-white">Load saved results</button></div>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    {loaded&&<><div className="grid gap-2 sm:grid-cols-3">{fields.map(field=><div key={field} className="rounded-lg border border-white/10 p-3"><p className="text-xs capitalize text-slate-400">{field} · entered records</p><p className="mt-1 text-lg font-bold text-white">{present(field)?format(totals[field],field==="revenue"||field==="spend"):"Unknown"}</p></div>)}</div><p className="text-xs text-slate-400">Totals sum only provided values and may double-count overlapping date ranges. Revenue minus spend is not shown as profit without verified attribution and costs.</p><div className="space-y-2">{entries.map((entry,i)=><article key={i} className="rounded-lg border border-white/10 p-3 text-sm text-slate-300"><p className="font-bold text-white">{entry.date} · {entry.product}</p><p>{entry.source}</p><p>Views: {format(entry.views)} · Clicks: {format(entry.clicks)} · Sales: {format(entry.sales)} · Revenue: {format(entry.revenue,true)}</p>{entry.note&&<p className="mt-1">{entry.note}</p>}<button type="button" className="mt-2 text-red-300 underline" onClick={()=>{const next=entries.filter((_,j)=>j!==i);localStorage.setItem(key,JSON.stringify(next));setEntries(next);}}>Remove</button></article>)}</div></>}
  </section>;
}
