import { BeastAdminShell } from "../../BeastAdminShell";
import { BeastMarketingWorkspace } from "../BeastMarketingWorkspace";
import { MarketingSectionNav } from "../MarketingSectionNav";

export default async function AdvertisingPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const params = await searchParams;
  const campaignId = typeof params.campaign === "string" ? params.campaign : "";
  return (
    <BeastAdminShell
      title="BeastMarketing · Advertising"
      purpose="Plan, review, approve, and measure owner-controlled campaigns and advertising assets without granting external publishing or spend authority."
    >
      <MarketingSectionNav />
      <BeastMarketingWorkspace key={campaignId} initialCampaignId={campaignId} />
    </BeastAdminShell>
  );
}
