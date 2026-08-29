import Link from "next/link";
import {
  getProductRoadmapItemsForProduct,
  isUnavailableRoadmapStatus,
  productRoadmapItems,
  productRoadmapStatusLabels,
  type ProductRoadmapItem,
} from "@/lib/productRoadmapVisibility";

const statusStyles: Record<ProductRoadmapItem["status"], string> = {
  available: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  preview_beta: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  in_development: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  coming_soon: "border-amber-300/35 bg-amber-300/10 text-amber-100",
};

export function ProductRoadmapStatusBadge({ status }: { status: ProductRoadmapItem["status"] }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[status]}`}>{productRoadmapStatusLabels[status]}</span>;
}

export function ProductRoadmapGrid({ member = false, items = productRoadmapItems }: { member?: boolean; items?: readonly ProductRoadmapItem[] }) {
  const detailRoot = member ? "/dashboard/roadmap" : "/coming-soon";
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.slug} className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl shadow-black/10">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{item.product}</span><ProductRoadmapStatusBadge status={item.status} /></div>
    <h2 className="mt-4 text-xl font-black text-white">{item.capability}</h2>
    <p className="mt-2 flex-1 text-sm leading-6 text-slate-300">{item.summary}</p>
    <p className={`mt-4 rounded-xl border p-3 text-sm font-bold leading-6 ${isUnavailableRoadmapStatus(item.status) ? "border-amber-300/20 bg-amber-300/[0.05] text-amber-50" : "border-white/10 bg-white/[0.03] text-slate-200"}`}>{item.availability}</p>
    <Link href={`${detailRoot}/${item.slug}`} className="beast-button-secondary mt-4 min-h-11">{isUnavailableRoadmapStatus(item.status) ? "Preview capability" : "View details"}</Link>
  </article>)}</div>;
}

export function ProductRoadmapModulePreview({ product }: { product: ProductRoadmapItem["product"] }) {
  const upcoming = getProductRoadmapItemsForProduct(product).filter((item) => isUnavailableRoadmapStatus(item.status));
  if (!upcoming.length) return null;
  return <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5" aria-label={`${product} coming soon`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">Coming Soon</p><h2 className="mt-2 text-xl font-black text-white">What is planned for {product}</h2><p className="mt-2 text-sm leading-6 text-slate-300">Approved future capabilities are shown for visibility only. They cannot be used yet.</p></div><Link href="/dashboard/roadmap" className="beast-button-secondary shrink-0">View Product Roadmap</Link></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{upcoming.map((item) => <Link key={item.slug} href={`/dashboard/roadmap/${item.slug}`} className="rounded-xl border border-white/10 bg-[#111827] p-4 transition hover:border-amber-300/35"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-white">{item.capability}</h3><ProductRoadmapStatusBadge status={item.status} /></div><p className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p><p className="mt-2 text-xs font-bold text-amber-100">Not available yet</p></Link>)}</div>
  </section>;
}

export function ProductRoadmapDetail({ item, member = false }: { item: ProductRoadmapItem; member?: boolean }) {
  const unavailable = isUnavailableRoadmapStatus(item.status);
  return <article className="rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl shadow-black/20 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">{item.product}</span><ProductRoadmapStatusBadge status={item.status} /></div>
    <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">{item.capability}</h1>
    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{item.summary}</p>
    <div className="mt-7 grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="font-black text-white">What it is intended to solve</h2><p className="mt-2 text-sm leading-6 text-slate-300">{item.problem}</p></section><section className={`rounded-2xl border p-5 ${unavailable ? "border-amber-300/25 bg-amber-300/[0.06]" : "border-emerald-300/25 bg-emerald-300/[0.06]"}`}><h2 className="font-black text-white">Current availability</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-200">{item.availability}</p></section></div>
    {item.slug === "connected-balances" ? <p className="mt-5 rounded-2xl border border-green-300/20 bg-green-300/[0.04] p-5 text-sm leading-6 text-green-50">The planned concept is read-only balance visibility. It does not include transactions, payment initiation, money movement, institution credentials in this interface, or write access to an account.</p> : null}
    {item.slug === "ai-fitness-trainer" ? <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.04] p-5 text-sm leading-6 text-red-50">Any future trainer must preserve BeastHealth safety boundaries. It will not diagnose, prescribe, replace qualified care, or become available through this preview.</p> : null}
    <div className="mt-7 flex flex-wrap gap-3">{!unavailable && item.currentHref ? <Link href={member ? item.currentHref : `/login?next=${encodeURIComponent(item.currentHref)}`} className="beast-button">{member ? `Open ${item.capability}` : "Sign in to use it"}</Link> : null}<Link href={member ? "/dashboard/roadmap" : "/coming-soon"} className="beast-button-secondary">Back to Product Roadmap</Link></div>
  </article>;
}
