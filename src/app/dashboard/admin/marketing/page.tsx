import Link from "next/link";
import { BeastAdminShell } from "../BeastAdminShell";
import { MarketingSectionNav } from "./MarketingSectionNav";

const sections = [
  {
    title: "Advertising",
    href: "/dashboard/admin/marketing/advertising",
    status: "Live",
    description: "Campaign planning, ad creative, visual review, approvals, destinations, attribution, and provider-neutral distribution handoffs.",
  },
  {
    title: "Video Growth",
    href: "/dashboard/admin/marketing/video-growth",
    status: "Live · building",
    description: "AI video production, content opportunities, series, presenters, Shotstack rendering, YouTube optimization, funnels, and the future AI Sean foundation.",
  },
  {
    title: "Social",
    href: "/dashboard/admin/marketing/social",
    status: "Foundation",
    description: "A dedicated home for future owned-social planning and distribution without mixing it into advertising or video production.",
  },
  {
    title: "Email",
    href: "/dashboard/admin/marketing/email",
    status: "Foundation",
    description: "A dedicated home for future email audience, campaign, and lifecycle work. No outbound-email authority is implied.",
  },
  {
    title: "Analytics",
    href: "/dashboard/admin/marketing/analytics",
    status: "Foundation",
    description: "Cross-channel marketing outcomes, attribution, qualified traffic, registrations, and future closed-loop growth learning.",
  },
] as const;

export default function BeastMarketingPage() {
  return (
    <BeastAdminShell
      title="BeastMarketing"
      purpose="Run the owner-only marketing operation through focused workspaces instead of one oversized page."
    >
      <MarketingSectionNav />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-300/30 hover:bg-amber-300/[0.04]"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">{section.status}</p>
            <h2 className="mt-2 text-xl font-black text-white">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{section.description}</p>
            <p className="mt-4 text-sm font-black text-amber-100">Open {section.title} →</p>
          </Link>
        ))}
      </section>
    </BeastAdminShell>
  );
}
