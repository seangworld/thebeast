import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingSectionNav } from "../MarketingSectionNav";
import { KdpPublishingFactoryPanel } from "./KdpPublishingFactoryPanel";

export default function PublishingPage() {
  return <BeastAdminShell title="BeastMarketing · Publishing" purpose="Prepare high-quality KDP publications without turning preparation into Amazon submission authority.">
    <MarketingSectionNav />
    <KdpPublishingFactoryPanel />
  </BeastAdminShell>;
}
