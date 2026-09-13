import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingSectionNav } from "../MarketingSectionNav";
import { KdpPublishingFactoryPanel } from "./KdpPublishingFactoryPanel";

export default function PublishingPage() {
  return <BeastAdminShell title="BeastMarketing · Publishing" purpose="Find evidence-backed book opportunities, create complete KDP preparation packages, and keep Amazon submission under owner control.">
    <MarketingSectionNav />
    <KdpPublishingFactoryPanel />
  </BeastAdminShell>;
}
