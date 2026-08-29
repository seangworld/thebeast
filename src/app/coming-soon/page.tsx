import type { Metadata } from "next";
import Link from "next/link";
import { ProductRoadmapGrid } from "@/app/components/ProductRoadmapVisibility";

export const metadata: Metadata = {
  title: "Product Roadmap | BeastOS",
  description: "See what is available now and which approved Beast capabilities are honestly marked Coming Soon.",
  robots: { index: false, follow: true },
};

export default function PublicProductRoadmapPage() {
  return <main className="min-h-screen bg-[#0b1018] px-4 py-8 text-white sm:px-6 sm:py-12"><div className="mx-auto max-w-6xl"><header className="rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-300/10 via-[#111827] to-amber-300/[0.06] p-6 sm:p-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Beast Product Roadmap</p><h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Useful now. More is coming.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Explore released Beast capabilities and approved future experiences. Coming Soon means planned and unavailable—not a promise of a date or working functionality.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/login" className="beast-button">Sign in to BeastOS</Link><Link href="/release-notes" className="beast-button-secondary">See released updates</Link></div></header><section className="mt-8"><ProductRoadmapGrid /></section><p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">This is a public-safe Product Truth view. It does not expose internal plans, implementation notes, security details, or release dates, and it cannot start any capability.</p></div></main>;
}
