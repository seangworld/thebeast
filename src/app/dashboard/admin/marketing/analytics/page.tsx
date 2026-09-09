import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingSectionNav } from "../MarketingSectionNav";
import { GrowthCyclePanel } from "../GrowthCyclePanel";

export default function MarketingAnalyticsPage() {
  return (
    <BeastAdminShell title="BeastMarketing · Analytics" purpose="Unify cross-channel marketing outcomes, qualified traffic, registration attribution, and future closed-loop growth learning.">
      <MarketingSectionNav />
      <GrowthCyclePanel />
    </BeastAdminShell>
  );
}
