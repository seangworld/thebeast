import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingFoundationPage } from "../MarketingFoundationPage";

export default function EmailMarketingPage() {
  return (
    <BeastAdminShell title="BeastMarketing · Email" purpose="Reserve a governed owner-only workspace for future email audience and lifecycle marketing without activating outbound email authority.">
      <MarketingFoundationPage
        title="Email"
        description="A dedicated home for future email audience, campaign, lifecycle, and conversion work when a provider and publishing authority are separately approved."
        bullets={[
          "Audience and lifecycle planning",
          "Campaign drafts and approval workflow",
          "Destination and conversion attribution",
          "Delivery, engagement, and outcome measurement",
        ]}
      />
    </BeastAdminShell>
  );
}
