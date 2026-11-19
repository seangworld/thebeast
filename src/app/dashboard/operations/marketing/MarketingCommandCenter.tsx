"use client";

import Link from "next/link";
import { useState } from "react";
import { marketingProducts } from "./marketingProducts";

export function MarketingCommandCenter() {
  const [selected, setSelected] = useState(marketingProducts[0].id);
  const product = marketingProducts.find((item) => item.id === selected) ?? marketingProducts[0];
  return <div className="mb-6 space-y-5">
    <section aria-labelledby="command-center-title" className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-widest text-amber-200">Owner workspace · Phase 1</p>
      <h2 id="command-center-title" className="mt-2 text-2xl font-black text-white">What are we promoting?</h2>
      <p className="mt-2 text-sm text-slate-300">Select a product, prepare a post, and review the results. No posting or advertising spend happens from this screen.</p>
      <label htmlFor="marketing-product" className="mt-5 block text-sm font-semibold text-white">Product</label>
      <select id="marketing-product" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-2 w-full max-w-xl rounded-xl border border-white/20 bg-slate-950 p-3 text-white">
        {marketingProducts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.kind}</option>)}
      </select>
      <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-white">Objective:</span> {product.goal}</p>
      <p className="mt-1 text-xs text-slate-400">{product.destination ? "Known destination: " + product.destination : "Destination must be verified before publishing."}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/dashboard/operations/marketing/social?product=${encodeURIComponent(product.id)}`} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">Prepare a social post →</Link>
        <Link href="/dashboard/operations/marketing/analytics" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Review results →</Link>
      </div>
      <p className="mt-3 text-xs text-slate-400">Product selection opens a reviewable starter draft; nothing is posted automatically.</p>
    </section>
    <section aria-label="Marketing priorities" className="grid gap-3 md:grid-cols-3">
      <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-bold text-white">1. Prepare</h3><p className="mt-2 text-sm text-slate-300">Create or reuse a reviewed post in the existing Social workspace.</p></article>
      <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-bold text-white">2. Distribute</h3><p className="mt-2 text-sm text-slate-300">Use an authorized channel or manual handoff. External publishing remains paused.</p></article>
      <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-bold text-white">3. Measure</h3><p className="mt-2 text-sm text-slate-300">Check measured outcomes; unavailable evidence is not treated as zero.</p></article>
    </section>
  </div>;
}
