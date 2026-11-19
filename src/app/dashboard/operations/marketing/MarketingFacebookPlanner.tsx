"use client";
import { useState } from "react";
import { marketingProducts } from "./marketingProducts";

type Format = "post" | "reel";
export function MarketingFacebookPlanner() {
  const [productId, setProductId] = useState(marketingProducts[0].id);
  const [format, setFormat] = useState<Format>("post");
  const [notice, setNotice] = useState("");
  const product = marketingProducts.find(item=>item.id===productId) ?? marketingProducts[0];
  const script = format==="reel"
    ? `HOOK: Interested in ${product.name}?\n\nVOICEOVER: ${product.starter}\n\nVISUAL: Show original product footage or licensed visuals.\n\nCTA: See the product link in the post or profile.\n\nCAPTION: ${product.starter}`
    : product.starter;
  async function copy() {
    try { await navigator.clipboard.writeText(script); setNotice("Copied. Review before posting on Facebook."); }
    catch { setNotice("Clipboard unavailable. Select the text and copy manually."); }
  }
  return <section aria-label="Facebook-first content planner" className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h2 className="text-xl font-black text-white">Facebook content planner</h2>
    <p className="text-sm text-slate-300">Facebook is the primary publishing channel. Instagram distribution depends on your existing cross-post settings; videos can also be prepared for YouTube Shorts. Nothing posts automatically.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-slate-200">Promote<select value={productId} onChange={e=>setProductId(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">{marketingProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="text-sm text-slate-200">Format<select value={format} onChange={e=>setFormat(e.target.value as Format)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"><option value="post">Facebook post</option><option value="reel">Facebook Reel / YouTube Short outline</option></select></label>
    </div>
    <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-100">{script}</pre>
    <button type="button" onClick={()=>void copy()} className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950">Copy {format==="reel"?"video outline":"post"}</button>
    {notice && <p role="status" className="text-sm text-amber-100">{notice}</p>}
    <p className="text-xs text-slate-400">Video output is an outline, not a rendered video. YouTube upload and Meta cross-post verification remain manual. Verify product claims and rights to all media before publishing.</p>
  </section>;
}
