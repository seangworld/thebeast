import { BeastMarketingWorkspace } from "@/app/dashboard/admin/marketing/BeastMarketingWorkspace";
import { MarketingSectionNav } from "@/app/dashboard/admin/marketing/MarketingSectionNav";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";

export default async function AdvertisingPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const params = await searchParams;
  const campaignId = typeof params.campaign === "string" ? params.campaign : "";
  return <OperationsWorkspaceShell title="BeastMarketing · Advertising" purpose="Plan, review, approve, and measure campaigns without granting external publishing or spending authority."><MarketingSectionNav /><BeastMarketingWorkspace key={campaignId} initialCampaignId={campaignId} /></OperationsWorkspaceShell>;
}
