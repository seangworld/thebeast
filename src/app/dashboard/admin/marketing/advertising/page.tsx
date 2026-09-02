import { BeastAdminShell } from "../../BeastAdminShell";
import { BeastMarketingWorkspace } from "../BeastMarketingWorkspace";
import { MarketingSectionNav } from "../MarketingSectionNav";

export default function AdvertisingPage() {
  return (
    <BeastAdminShell
      title="BeastMarketing · Advertising"
      purpose="Plan, review, approve, and measure owner-controlled campaigns and advertising assets without granting external publishing or spend authority."
    >
      <MarketingSectionNav />
      <BeastMarketingWorkspace />
    </BeastAdminShell>
  );
}
