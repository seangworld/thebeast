import Link from "next/link";
import { BeastHomeShell } from "./BeastHomeShell";
import { DashboardCard, GuidedEmptyState, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { ProductRoadmapModulePreview } from "@/app/components/ProductRoadmapVisibility";

export default function BeastHomeOverviewPage() {
  return <BeastHomeShell title="BeastHome" description="Private home records for the signed-in member.">
    <div className="space-y-6" data-tour-step="home-overview">
    <div data-tour-step="home-inventory">
    <DashboardCard accent="home"><SectionHeader eyebrow="Available now" title="Build a dated home inventory" description="Take one room photo, review AI-proposed possessions, correct them, and save only what you confirm." />
      <div className="mt-5"><GuidedEmptyState title="Start with one room" description="Photos are used for one-time suggestions and are not saved by the inventory workflow." guidance="Avoid people, mail, screens, or sensitive documents. You stay responsible for confirming every item and value." nextAction={{ label: "Open Home Inventory", href: "/dashboard/home/inventory" }} secondaryAction={{ label: "Open Beast Documents", href: "/dashboard/uploads" }} /></div>
      <Link href="/dashboard/home/inventory" className="beast-button-primary mt-5 inline-flex">Start inventory</Link>
    </DashboardCard>
    </div>
    <ProductRoadmapModulePreview product="BeastHome" />
    </div>
  </BeastHomeShell>;
}
