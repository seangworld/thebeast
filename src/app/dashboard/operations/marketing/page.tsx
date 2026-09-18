import Link from "next/link";
import { BeastMarketingOverviewSummary } from "@/app/dashboard/admin/marketing/BeastMarketingOverviewSummary";
import { MarketingSectionNav } from "@/app/dashboard/admin/marketing/MarketingSectionNav";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

const sections = [
  { title: "Advertising", href: "/dashboard/operations/marketing/advertising", status: "Live", description: "Campaign planning, creative review, approvals, destinations, attribution, and provider-neutral distribution handoffs." },
  { title: "Video Growth", href: "/dashboard/operations/marketing/video-growth", status: "Live · building", description: "Video production, opportunities, series, presenters, publishing preparation, funnels, and analytics." },
  { title: "Social", href: "/dashboard/operations/marketing/social", status: "Foundation", description: "Future owned-social planning and distribution, kept separate from advertising and video production." },
  { title: "Email", href: "/dashboard/operations/marketing/email", status: "Foundation", description: "Future email audience, campaign, and lifecycle work without implying outbound authority." },
  { title: "Analytics", href: "/dashboard/operations/marketing/analytics", status: "Discovery and assessment", description: "Campaign preparation, tracked links, search evidence, outcomes, and visible execution blockers." },
] as const;

export default function MarketingOperationsPage() {
  return <OperationsWorkspaceShell title="BeastMarketing" purpose="Run company-wide marketing through focused workspaces instead of mixing it into Beast administration."><MarketingSectionNav /><BeastMarketingOverviewSummary /><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map((section) => <Link key={section.href} href={section.href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{section.status}</p><h2 className="mt-2 text-xl font-black text-white">{section.title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{section.description}</p><p className="mt-4 text-sm font-black text-cyan-100">Open {section.title} →</p></Link>)}</section></OperationsWorkspaceShell>;
}
