import { GrowthCyclePanel } from "@/app/dashboard/admin/marketing/GrowthCyclePanel";
import { MarketingSectionNav } from "@/app/dashboard/admin/marketing/MarketingSectionNav";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";

export default function MarketingAnalyticsPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Analytics" purpose="Unify cross-channel outcomes, qualified traffic, registration attribution, and closed-loop growth learning."><MarketingSectionNav /><GrowthCyclePanel /></OperationsWorkspaceShell>;
}
