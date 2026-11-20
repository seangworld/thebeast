"use client";
import { useMemo, useState } from "react";
import { marketingProducts } from "../marketingProducts";

type Channel = "facebook" | "youtube";
const examples: Record<string, {hook:string;point:string;visual:string}> = {
  philippines:{hook:"What would it take for the Philippines to achieve first-world status?",point:"Corruption and meaningful reform deserve a serious conversation—not just slogans.",visual:"Show the book cover, then on-screen words: CORRUPTION · REFORM · POTENTIAL"},
  "ai-normal":{hook:"Does using AI still feel more complicated than it should?",point:"Practical AI should be approachable for everyday people.",visual:"Show a simple everyday AI task and the book cover"},
  beastguide:{hook:"Keeping track of every show and episode shouldn't be another chore.",point:"BeastGuide helps you organize the shows and episodes you follow.",visual:"Show a real BeastGuide screen recording, not fabricated app screens"},
  beastmoney:{hook:"Do you know which bills are coming due next?",point:"Organizing a budget starts with knowing your income, bills, and debts.",visual:"Use a real, privacy-safe BeastMoney screen recording"},
  backgammon:{hook:"Backgammon or Acey-Deucey—which one would you play?",point:"Both games are available together in an iPhone game.",visual:"Show real gameplay footage of each mode"},
  news:{hook:"What's happening around Hampton Roads?",point:"SEANGWORLD publishes news and articles for readers to explore.",visual:"Show current, verified headlines from the live site"}
};
export function ShortVideoStudio() {
  const [id,setId]=useState("philippines");
  const [channel,setChannel]=useState<Channel>("facebook");
  const [hook,setHook]=useState<string | null>(null);
  const [point,setPoint]=useState<string | null>(null);
  const [visual,setVisual]=useState<string | null>(null);
  const [closing,setClosing]=useState<string | null>(null);
  const [notice,setNotice]=useState("");
  const product=marketingProducts.find(item=>item.id===id) ?? marketingProducts[0];
  const example=examples[id];
  const title=hook??example.hook;
  const body=point??example.point;
  const shot=visual??example.visual;
  const cta=closing??(product.destination ? "Find the direct link in the post description." : "Learn more about the product.");
  const description=useMemo(()=>[title,body,product.destination ? `Learn more: ${product.destination}` : "Add a verified product link before publishing."].join("\n\n"),[title,body,product.destination]);
  const script=`PRODUCT: ${product.name}\nFORMAT: Vertical 9:16 · ${channel==="facebook"?"Facebook Reel":"YouTube Short"}\n\n0–3s · HOOK\n${title}\n\n3–20s · MAIN POINT\n${body}\n\n20–30s · CALL TO ACTION\n${cta}\n\nVISUAL PLAN\n${shot}\n\nCAPTION / DESCRIPTION\n${description}\n\nREVIEW CHECKLIST\n[ ] Claims and visuals verified\n[ ] Video/audio rights confirmed\n[ ] Vertical video and captions reviewed\n[ ] Direct link verified (if supplied)\n[ ] Owner approves before publishing`;
  async function copy(text:string){try{await navigator.clipboard.writeText(text);setNotice("Copied to clipboard.");}catch{setNotice("Clipboard unavailable. Select the text to copy.");}}
  return <section className="mb-6 rounded-2xl border border-amber-300/30 bg-slate-950/60 p-5" aria-label="Reels and Shorts studio">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-200">Video Growth · Short-form studio</p><h2 className="mt-2 text-2xl font-black text-white">Build a Reel or Short</h2><p className="mt-2 text-sm text-slate-300">Choose a product, edit a 30-second video outline, and copy a ready-to-review script. This prepares content; it does not render or publish a video.</p></div><span className="rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200">Draft only · No publishing</span></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-bold text-white">Promote a product<select value={id} onChange={e=>{setId(e.target.value);setHook(null);setPoint(null);setVisual(null);setClosing(null);setNotice("");}} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white">{marketingProducts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset><legend className="text-sm font-bold text-white">Video platform</legend><div className="mt-2 flex gap-2">{([["facebook","Facebook Reels"],["youtube","YouTube Shorts"]] as const).map(([value,label])=><button type="button" key={value} aria-pressed={channel===value} onClick={()=>setChannel(value)} className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${channel===value?"border-amber-300 bg-amber-300 text-slate-950":"border-white/20 text-white"}`}>{label}</button>)}</div></fieldset>
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-bold text-white">Opening hook · 0–3 seconds<textarea value={title} onChange={e=>setHook(e.target.value)} rows={3} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-normal text-white" /></label>
      <label className="text-sm font-bold text-white">Main point · 3–20 seconds<textarea value={body} onChange={e=>setPoint(e.target.value)} rows={3} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-normal text-white" /></label>
      <label className="text-sm font-bold text-white">Visuals / footage<textarea value={shot} onChange={e=>setVisual(e.target.value)} rows={3} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-normal text-white" /></label>
      <label className="text-sm font-bold text-white">Closing call to action · 20–30 seconds<textarea value={cta} onChange={e=>setClosing(e.target.value)} rows={3} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-normal text-white" /></label>
    </div>
    <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/80 p-4"><h3 className="font-bold text-white">Caption / description</h3><pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{description}</pre>{product.destination?<a href={product.destination} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-sm text-amber-200 underline">Verify product destination: {product.destination}</a>:<p className="mt-3 text-sm text-amber-200">No direct product URL is on file. Add one before publishing.</p>}</div>
    <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>void copy(script)} className="min-h-11 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Copy complete video brief</button><button type="button" onClick={()=>void copy(description)} className="min-h-11 rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white">Copy caption</button><button type="button" onClick={()=>{setHook(null);setPoint(null);setVisual(null);setClosing(null);setNotice("Draft reset to the suggested outline.");}} className="min-h-11 rounded-xl border border-white/20 px-4 py-3 text-sm text-slate-200">Reset outline</button></div>
    {notice&&<p role="status" className="mt-3 text-sm text-amber-100">{notice}</p>}
    <p className="mt-4 text-xs text-slate-400">These are editable, product-specific starter outlines—not AI-generated scripts. Facebook/Instagram cross-posting depends on your Meta account settings. YouTube publishing is a separate workflow. Nothing is uploaded or scheduled from this studio.</p>
  </section>;
}
