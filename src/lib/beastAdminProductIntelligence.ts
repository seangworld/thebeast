export type BeastAdminProductIntelligenceState = {
  status:
    | "unconfigured"
    | "collection_only"
    | "property_review_required"
    | "data_api_ready";
  title: string;
  description: string;
  collectionConfigured: boolean;
  dataApiConfigured: boolean;
  supportedAggregates: readonly string[];
  limitations: readonly string[];
};

export function buildBeastAdminProductIntelligenceState(environment: {
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
  BEAST_ECOSYSTEM_GA4_PROPERTY_ID?: string;
  SEANGWORLD_GA4_PROPERTY_ID?: string;
  SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  SEANGWORLD_GOOGLE_PRIVATE_KEY?: string;
}): BeastAdminProductIntelligenceState {
  const collectionConfigured = /^G-[A-Z0-9]{6,20}$/.test(
    environment.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""
  );
  const approvedPropertyConfigured = Boolean(
    environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID
  );
  const dataApiConfigured = Boolean(
    approvedPropertyConfigured &&
      environment.SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      environment.SEANGWORLD_GOOGLE_PRIVATE_KEY
  );
  const status = dataApiConfigured
    ? "data_api_ready"
    : environment.SEANGWORLD_GA4_PROPERTY_ID && !approvedPropertyConfigured
      ? "property_review_required"
    : collectionConfigured
      ? "collection_only"
      : "unconfigured";

  return {
    status,
    title:
      status === "data_api_ready"
        ? "GA4 product-intelligence boundary configured"
        : status === "property_review_required"
          ? "Existing GA4 property requires ecosystem-scope review"
        : status === "collection_only"
          ? "GA4 collection configured; aggregate access unavailable"
          : "GA4 product intelligence is not configured",
    description:
      status === "data_api_ready"
        ? "The server-only GA4 Data API boundary is available. Product aggregates remain limited to dimensions actually configured in the approved property."
        : status === "property_review_required"
          ? "A legacy SEANGWORLD GA4 property is configured, but Beast does not assume that it contains every ecosystem stream. Confirm its scope before configuring the dedicated ecosystem property boundary."
        : status === "collection_only"
          ? "The browser collection stream is configured, but BeastAdmin cannot query aggregate GA4 product intelligence without an approved server-side property connection."
          : "Configure an approved measurement stream and server-side GA4 property access before aggregate product intelligence can appear.",
    collectionConfigured,
    dataApiConfigured,
    supportedAggregates: [
      "usage_by_product",
      "usage_by_module",
      "professional_engagement",
      "conversation_starts",
      "recommendation_actions",
      "workflow_completion",
      "navigation_adoption",
      "coarse_errors",
      "performance_buckets",
    ],
    limitations: [
      "No aggregate values are estimated or mocked.",
      "No individual Member browsing history is exposed.",
      "The configured GA4 property and custom product dimensions must be verified in Google Analytics Admin.",
    ],
  };
}
