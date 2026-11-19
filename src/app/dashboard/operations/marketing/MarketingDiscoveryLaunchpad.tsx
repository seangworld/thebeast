"use client";
import { useState } from "react";

const sources = [
  { label: "Reddit", make: (q: string) => "https://www.reddit.com/search/?q=" + encodeURIComponent(q) + "&sort=new" },
  { label: "X", make: (q: string) => "https://x.com/search?q=" + encodeURIComponent(q) + "&f=live" },
  { label: "Facebook", make: (q: string) => "https://www.facebook.com/search/posts/?q=" + encodeURIComponent(q) },
  { label: "Instagram", make: (q: string) => "https://www.instagram.com/explore/search/keyword/?q=" + encodeURIComponent(q) },
] as const;

const topics = [
  { label: "Philippines travel", query: "travel to Philippines advice" },
  { label: "Philippines relocation", query: "moving to Philippines retirement" },
  { label: "Budgeting", query: "budgeting monthly bills" },
  { label: "TV tracking", query: "track TV shows episodes app" },
  { label: "Backgammon", query: "backgammon iPhone game" },
];

export function MarketingDiscoveryLaunchpad() {
  const [query, setQuery] = useState(topics[0].query);
  return <section aria-label="Public discussion search launchpad" className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h2 className="text-xl font-black text-white">Find relevant conversations</h2>
    <p className="text-sm text-slate-300">Open a platform's own search with a prepared query. Results are not fetched, verified, or ranked by BeastMarketing. Review community rules and context before promoting anything.</p>
    <label htmlFor="discovery-query" className="block text-sm font-semibold text-slate-200">Search topic
      <input id="discovery-query" value={query} onChange={e=>setQuery(e.target.value)} maxLength={160} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white" />
    </label>
    <div className="flex flex-wrap gap-2">{topics.map(t=><button type="button" key={t.label} onClick={()=>setQuery(t.query)} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10">{t.label}</button>)}</div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{sources.map(s=><a key={s.label} href={s.make(query.trim())} target="_blank" rel="noopener noreferrer" aria-disabled={!query.trim()} className="rounded-lg border border-amber-300/40 p-3 text-center text-sm font-bold text-amber-100 hover:bg-amber-300/10">{s.label} search ↗</a>)}</div>
    <p className="text-xs text-slate-400">Some platforms may require login, change search URL behavior, or restrict results. No private account data is accessed.</p>
  </section>;
}
