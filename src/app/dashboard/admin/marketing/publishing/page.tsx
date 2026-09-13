import { BeastAdminShell } from "../../BeastAdminShell";
import { KdpPublishingFactoryPanel } from "./KdpPublishingFactoryPanel";

export default function PublishingPage() {
  return <BeastAdminShell title="KDP / Publishing" purpose="Find evidence-backed book opportunities, create complete KDP preparation packages, and keep Amazon submission under owner control.">
    <KdpPublishingFactoryPanel />
  </BeastAdminShell>;
}
