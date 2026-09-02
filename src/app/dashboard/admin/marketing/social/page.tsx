import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingFoundationPage } from "../MarketingFoundationPage";

export default function SocialMarketingPage() {
  return (
    <BeastAdminShell title="BeastMarketing · Social" purpose="Keep future owned-social planning distinct from paid advertising and the Video Growth production engine.">
      <MarketingFoundationPage
        title="Social"
        description="A dedicated owner-only home for future social-channel planning, repurposing, scheduling, attribution, and performance learning."
        bullets={[
          "Channel-specific content planning and repurposing",
          "Scheduling and approval controls",
          "Campaign attribution and destination tracking",
          "Cross-channel performance and learning",
        ]}
      />
    </BeastAdminShell>
  );
}
