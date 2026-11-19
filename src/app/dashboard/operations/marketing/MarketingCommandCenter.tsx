"use client";

import Link from "next/link";
import { useState } from "react";

type Product = { id: string; name: string; kind: string; goal: string; destination?: string };
const products: Product[] = [
  { id: "philippines", name: "Philippines book", kind: "Book", goal: "Reach readers interested in the Philippines" },
  { id: "ai-normal", name: "AI for Normal People", kind: "Book", goal: "Book sales", destination: "https://www.amazon.com/dp/B0HFZ1WHLX" },
  { id: "beastguide", name: "BeastGuide", kind: "Application", goal: "Registrations", destination: "https://beastguide.vercel.app" },
  { id: "beastmoney", name: "BeastMoney", kind: "Application", goal: "Qualified visitors" },
  { id: "backgammon", name: "Backgammon & Acey-Deucey", kind: "Game", goal: "App Store discovery" },
  { id: "news", name: "SEANGWORLD News", kind: "Publication", goal: "Qualified readers", destination: "https://www.seangworld.com" },
];

export function MarketingCommandCenter() {
  const [selected, setSelected] = useState(products[0].id);
  const product = products.find((item) => item.id === selected) ?? products[0];
  return <div className="mb-6 space-y-5">
    <section aria-labelledby="command-center-title" className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-widest text-amber-200">Owner workspace · Phase 1</p>
      <h2 id="command-center-title" className="mt-2 text-2xl font-black text-white">What are we promoting?</h2>
      <p className="mt-2 text-sm text-slate-300">Select a product, prepare a post, and review the results. No posting or advertising spend happens from this screen.</p>
      <label htmlFor="marketing-product" className="mt-5 block text-sm font-semibold text-white">Product</label>
      <select id="marketing-product" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-2 w-full max-w-xl rounded-xl border border-white/20 bg-slate-950 p-3 text-white">
        {products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.kind}</option>)}
      </select>
      <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-white">Objective:</span> {product.goal}</p>
      <p className="mt-1 text-xs text-slate-400">{product.destination ? "Known destination: " + product.destination : "Destination must be verified before publishing."}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/dashboard/operations/marketing/social?product=${encodeURIComponent(product.id)}`} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">Prepare a social post →</Link>
        <Link href="/dashboard/operations/marketing/analytics" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Review results →</Link>
      </div>
      <p className="mt-3 text-xs text-slate-400">Product selection pre-fills a suggested starting point in Social; review all facts and destinations before saving.</p>
    </section>
    <section aria-label="Marketing priorities" className="grid gap-3 md:grid-cols-3">
      <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-bold text-white">1. Prepare</h3><p className="mt-2 text-sm text-slate-300">Create or reuse a reviewed post in the existing Social workspace.</p></article>
      <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-bold text-white">2. Distribute</h3><p className="mt-2 text-sm text-slate-300">Use an authorized channel or manual handoff. External publishing remains paused.</p></article>
      <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-bold text-white">3. Measure</h3><p className="mt-2 text-sm text-slate-300">Check measured outcomes; unavailable evidence is not treated as zero.</p></article>
    </section>
  </div>;
}
