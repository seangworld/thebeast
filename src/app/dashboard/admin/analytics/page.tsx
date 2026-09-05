import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminAIAnalyticsWorkspace } from "./BeastAdminAIAnalyticsWorkspace";
import { BeastAdminProductIntelligenceBoundary } from "./BeastAdminProductIntelligenceBoundary";
import { buildBeastAdminProductIntelligenceState } from "@/lib/beastAdminProductIntelligence";
import { SeangworldIntelligenceWorkspace } from "../intelligence/SeangworldIntelligenceWorkspace";
import { BeastAdminNewsOperationsWorkspace } from "../news/BeastAdminNewsOperationsWorkspace";
import { fetchNewsOperationsStatus } from "@/lib/newsOperations";

export const dynamic = "force-dynamic";

export default async function BeastAdminAnalyticsPage() {
  const productIntelligence = buildBeastAdminProductIntelligenceState({
    NEXT_PUBLIC_GA_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    BEAST_ECOSYSTEM_GA4_PROPERTY_ID:
      process.env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID,
    SEANGWORLD_GA4_PROPERTY_ID:
      process.env.SEANGWORLD_GA4_PROPERTY_ID,
    GOOGLE_WIF_PROVIDER_RESOURCE:
      process.env.GOOGLE_WIF_PROVIDER_RESOURCE,
    GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL:
      process.env.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL,
  });
  const newsStatus = await fetchNewsOperationsStatus();

  return (
    <BeastAdminShell
      title="AI Analytics"
      purpose="Owner-only public/product GA4 performance, SEANGWORLD News operations, and private aggregate professional-usage evidence, kept behind separate privacy boundaries."
    >
      <div className="space-y-6">
        <BeastAdminProductIntelligenceBoundary state={productIntelligence} />
        <section aria-labelledby="news-operations-heading">
          <h2 id="news-operations-heading" className="mb-4 text-xl font-black text-white">SEANGWORLD News operations</h2>
          <BeastAdminNewsOperationsWorkspace status={newsStatus} />
        </section>
        <section aria-labelledby="public-product-analytics-heading">
          <h2 id="public-product-analytics-heading" className="mb-4 text-xl font-black text-white">Public and product analytics</h2>
          <SeangworldIntelligenceWorkspace />
        </section>
        <BeastAdminAIAnalyticsWorkspace />
      </div>
    </BeastAdminShell>
  );
}
