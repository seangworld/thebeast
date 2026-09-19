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
    <div data-tour-step="home-studio">
    <DashboardCard accent="home"><SectionHeader eyebrow="Available now" title="Redesign a room in Home Studio" description="Turn one room photo, measurements, style choices, and must-keep items into a reviewable plan, shopping targets, and an optional visual concept." />
      <div className="mt-5"><GuidedEmptyState title="Start with the room you want to improve" description="Home Studio separates visible observations from assumptions and keeps image generation behind an explicit confirmation." guidance="Your source photo and plan are not saved by the workspace. Download what you want to keep, and verify measurements, fit, safety, price, and availability before acting." nextAction={{ label: "Open Home Studio", href: "/dashboard/home/studio" }} secondaryAction={{ label: "Review Home Inventory", href: "/dashboard/home/inventory" }} /></div>
      <Link href="/dashboard/home/studio" className="beast-button-primary mt-5 inline-flex">Design a room</Link>
    </DashboardCard>
    </div>
    <ProductRoadmapModulePreview product="BeastHome" />
    </div>
  </BeastHomeShell>;
}
