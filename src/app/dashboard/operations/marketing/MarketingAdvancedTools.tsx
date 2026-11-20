"use client";
import { useState, type ReactNode } from "react";

export function MarketingAdvancedTools({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <section aria-label={title} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-300">Open the full existing workspace only when you need detailed controls.</p></div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="min-h-11 rounded-xl border border-amber-300/40 px-4 py-2 text-sm font-bold text-amber-100">{open ? "Hide advanced tools" : "Open advanced tools"}</button>
    </div>
    {open && <div className="mt-5">{children}</div>}
  </section>;
}
