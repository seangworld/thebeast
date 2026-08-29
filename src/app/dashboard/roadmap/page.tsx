import { ProductRoadmapGrid } from "@/app/components/ProductRoadmapVisibility";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";

export default function MemberProductRoadmapPage() {
  return <main className="beast-page"><div className="beast-container space-y-6"><DashboardCard accent="beastos"><SectionHeader eyebrow="Product Roadmap" title="What you can use now—and what is coming" description="Coming Soon items are approved for visibility but are unavailable. This page cannot activate or execute them." /></DashboardCard><ProductRoadmapGrid member /><DashboardCard accent="beastos"><p className="text-sm leading-6 text-slate-300">Statuses mirror governed Product Truth through the BO-UX-002 presentation contract. No speculative date, internal implementation detail, financial connection, or private roadmap record appears here.</p></DashboardCard></div></main>;
}
