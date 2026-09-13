"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseCompanyCost, summarizeCompanyCosts } from "@/lib/companyCosts";
import type { RevenueSnapshot } from "@/lib/revenueCenter";

type Summary = { monthly: number | null; earnings: number | null; currency: string; costNote: string; revenueNote: string };
const initial: Summary = { monthly: null, earnings: null, currency: "USD", costNote: "Loading expense records…", revenueNote: "Loading revenue source…" };
function money(value: number | null, currency = "USD") {
  return value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function OperationsFinancialSummary() {
  const [summary, setSummary] = useState<Summary>(initial);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setSummary(initial);
    async function load() {
      const result: Summary = { ...initial, costNote: "Expense records could not be loaded.", revenueNote: "Revenue source could not be loaded." };
      await Promise.allSettled([
        (async () => {
          const response = await fetch("/api/admin/company-costs", { cache: "no-store", signal: controller.signal });
          if (!response.ok) return;
          const payload = await response.json();
          if (!Array.isArray(payload.entries)) return;
          const costs = summarizeCompanyCosts(payload.entries.map(parseCompanyCost));
          result.monthly = costs.monthlyCents === null ? null : costs.monthlyCents / 100;
          result.costNote = payload.entries.length === 0 ? "No costs recorded yet." : `Owner-entered recurring estimates; partial records.${costs.unknownRecurring ? ` ${costs.unknownRecurring} recurring amounts unknown.` : ""}`;
        })(),
        (async () => {
          const response = await fetch("/api/admin/revenue", { cache: "no-store", signal: controller.signal });
          if (!response.ok) return;
          const payload = await response.json() as RevenueSnapshot;
          if (payload.provider !== "adsense") return;
          const earnings = payload.periods?.month?.estimatedEarnings;
          const currency = payload.periods?.month?.currency;
          if (payload.state === "available" && typeof earnings === "number" && Number.isFinite(earnings) && typeof currency === "string" && /^[A-Z]{3}$/.test(currency)) {
            result.earnings = earnings;
            result.currency = currency;
            result.revenueNote = "AdSense estimate this month; excludes other business revenue.";
          } else result.revenueNote = payload.diagnostic || "No verified revenue amount returned.";
        })(),
      ]);
      if (active) { setSummary(result); setLoading(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  return <section aria-label="Business finances" aria-busy={loading} className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Money at a glance</h2><button type="button" disabled={loading} onClick={() => setAttempt(attempt + 1)} className="min-h-11 px-3 text-sm font-semibold text-cyan-200 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/dashboard/operations/revenue" className="rounded-2xl border border-white/10 bg-[#111c2b] p-5"><p className="text-sm text-slate-300">Reported advertising revenue</p><p className="mt-2 break-words text-2xl font-bold">{loading ? "Loading…" : money(summary.earnings, summary.currency)}</p><p className="mt-2 text-sm leading-6 text-slate-400">{summary.revenueNote}</p></Link>
      <Link href="/dashboard/operations/finances" className="rounded-2xl border border-white/10 bg-[#111c2b] p-5"><p className="text-sm text-slate-300">Known monthly costs</p><p className="mt-2 break-words text-2xl font-bold">{loading ? "Loading…" : money(summary.monthly)}</p><p className="mt-2 text-sm leading-6 text-slate-400">{summary.costNote}</p></Link>
      <div className="rounded-2xl border border-dashed border-white/15 p-5"><p className="text-sm text-slate-300">Company profit</p><p className="mt-2 text-2xl font-bold">Not established</p><p className="mt-2 text-sm leading-6 text-slate-400">Complete revenue and expense coverage is needed. Published output is not revenue.</p></div>
    </div>
  </section>;
}
