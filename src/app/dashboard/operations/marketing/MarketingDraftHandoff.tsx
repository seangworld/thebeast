"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { marketingProducts } from "./marketingProducts";
import { marketingChannelDrafts, channelLabels, type MarketingChannel } from "./marketingChannelDrafts";

export function MarketingDraftHandoff() {
  const params = useSearchParams();
  const chosen = marketingProducts.find(p => p.id === params.get("product"));
  const [text, setText] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [channel, setChannel] = useState<MarketingChannel>("facebook");
  if (!chosen) return null;
  const drafts = marketingChannelDrafts(chosen.starter, chosen.name);
  const suggested = drafts.find(item => item.channel === channel) ?? drafts[0];
  const draft = text ?? suggested.text;
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice("Copied. Paste into the Social composer and review before saving."); }
    catch { setNotice("Clipboard unavailable. Select and copy the text manually."); }
  };
  return <section aria-label="Product draft handoff" className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/[0.04] p-5 text-slate-100">
    <p className="text-xs font-black uppercase tracking-widest text-amber-200">Product starter · Manual review</p>
    <h2 className="mt-2 text-xl font-black">{chosen.name}</h2>
    <p className="mt-2 text-sm text-slate-300">Edit this suggested copy, then copy it into the existing composer below. This does not create a saved post or publish anything. Reddit requires a manual, rules-compliant handoff.</p>
    <label htmlFor="marketing-channel" className="mt-4 block text-sm font-bold">Platform</label>
    <select id="marketing-channel" className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white" value={channel} onChange={e => { setChannel(e.target.value as MarketingChannel); setText(null); }}>
      {drafts.map(item => <option key={item.channel} value={item.channel}>{channelLabels[item.channel]}</option>)}
    </select>
    <p className="mt-2 text-sm text-slate-300">{suggested.guidance}</p>
    <label htmlFor="marketing-starter" className="mt-4 block text-sm font-bold">Suggested post</label>
    <textarea id="marketing-starter" className="mt-2 min-h-32 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-base text-white" value={draft} onChange={e => setText(e.target.value)} />
    <p className="mt-3 text-sm text-slate-300">{chosen.destination ? `Suggested destination: ${chosen.destination}` : "Destination not verified; add a valid link yourself before publishing."}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => void copy(draft)} className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950">Copy {channelLabels[channel]} text</button>
      {chosen.destination && <button type="button" onClick={() => void copy(chosen.destination!)} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 font-bold">Copy destination</button>}
    </div>
    {notice && <p role="status" className="mt-3 text-sm text-amber-100">{notice}</p>}
  </section>;
}
