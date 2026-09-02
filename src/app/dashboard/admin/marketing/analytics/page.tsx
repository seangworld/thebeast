import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingFoundationPage } from "../MarketingFoundationPage";

export default function MarketingAnalyticsPage() {
  return (
    <BeastAdminShell title="BeastMarketing · Analytics" purpose="Unify cross-channel marketing outcomes, qualified traffic, registration attribution, and future closed-loop growth learning.">
      <MarketingFoundationPage
        title="Analytics"
        description="A dedicated marketing-outcome workspace for cross-channel attribution and learning without mixing operational production controls into reporting."
        bullets={[
          "Qualified traffic and landing-page outcomes",
          "Campaign and channel attribution",
          "Beast registrations and activation where privacy-safe",
          "Scale, continue, modify, or stop recommendations",
        ]}
      />
    </BeastAdminShell>
  );
}
