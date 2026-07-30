import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminAIAnalyticsWorkspace } from "./BeastAdminAIAnalyticsWorkspace";
import { BeastAdminProductIntelligenceBoundary } from "./BeastAdminProductIntelligenceBoundary";
import { buildBeastAdminProductIntelligenceState } from "@/lib/beastAdminProductIntelligence";

export default function BeastAdminAnalyticsPage() {
  const productIntelligence = buildBeastAdminProductIntelligenceState({
    NEXT_PUBLIC_GA_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    BEAST_ECOSYSTEM_GA4_PROPERTY_ID:
      process.env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID,
    SEANGWORLD_GA4_PROPERTY_ID:
      process.env.SEANGWORLD_GA4_PROPERTY_ID,
    SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL:
      process.env.SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL,
    SEANGWORLD_GOOGLE_PRIVATE_KEY:
      process.env.SEANGWORLD_GOOGLE_PRIVATE_KEY,
  });

  return (
    <BeastAdminShell
      title="AI Analytics"
      purpose="Owner-only insight into how members use Beast professionals, based on persisted conversation evidence rather than estimated activity."
    >
      <div className="space-y-6">
        <BeastAdminProductIntelligenceBoundary state={productIntelligence} />
        <BeastAdminAIAnalyticsWorkspace />
      </div>
    </BeastAdminShell>
  );
}
