import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ANALYTICS_CONTRACT_VERSION,
  analyticsPerformanceBucket,
  analyticsEventNames,
  beastAnalyticsProductRegistry,
  buildAnalyticsDispatch,
  classifyBeastRoute,
  createPageViewDeduplicator,
  registerAnalyticsProduct,
  sanitizeAnalyticsProperties,
} from "../src/lib/analytics/productAnalytics";
import { buildBeastAdminProductIntelligenceState } from "../src/lib/beastAdminProductIntelligence";

const measurementId = "G-ABCDEF1234";

test("BO-404 uses one typed contract and stable Beast product identifiers", () => {
  assert.equal(ANALYTICS_CONTRACT_VERSION, "bo404-v1");
  assert.deepEqual(
    beastAnalyticsProductRegistry.map((product) => product.productId),
    [
      "beastos",
      "beastmoney",
      "beasteducation",
      "beasthealth",
      "beasthome",
      "beastsecurity",
      "beastadmin",
    ]
  );
  assert.ok(analyticsEventNames.includes("professional_opened"));
  assert.ok(analyticsEventNames.includes("recommendation_accepted"));
});

test("BO-404 allowlists properties and rejects PII and private content", () => {
  const sanitized = sanitizeAnalyticsProperties({
    product_id: "beastmoney",
    module_id: "money",
    source: "client_navigation",
    email: "member@example.com",
    conversation_text: "My balance is $12,345",
    search_query: "my private diagnosis",
    raw_error: "member@example.com failed",
    destination: "https://example.com/member?id=123",
  });

  assert.deepEqual(sanitized.accepted, {
    product_id: "beastmoney",
    module_id: "money",
    source: "client_navigation",
  });
  assert.deepEqual(sanitized.rejected, [
    "conversation_text",
    "destination",
    "email",
    "raw_error",
    "search_query",
  ]);
  assert.doesNotMatch(JSON.stringify(sanitized.accepted), /member|12,345|diagnosis/);
});

test("BO-404 suppresses pending disabled and non-production collection", () => {
  const context = { registration: beastAnalyticsProductRegistry[0] };
  for (const consent of ["pending", "disabled"] as const) {
    assert.equal(
      buildAnalyticsDispatch({
        event: "page_viewed",
        context,
        consent,
        environment: "production",
        measurementId,
      }),
      null
    );
  }
  for (const environment of ["development", "test", "preview"] as const) {
    assert.equal(
      buildAnalyticsDispatch({
        event: "page_viewed",
        context,
        consent: "enabled",
        environment,
        measurementId,
      }),
      null
    );
  }
});

test("BO-404 emits only coarse product module workspace and professional context", () => {
  const context = classifyBeastRoute(
    "/dashboard/education/guidance-counselor?next=private"
  );
  const dispatch = buildAnalyticsDispatch({
    event: "professional_opened",
    context,
    consent: "enabled",
    environment: "production",
    measurementId,
  });

  assert.deepEqual(dispatch?.properties, {
    contract_version: "bo404-v1",
    product_id: "beasteducation",
    module_id: "education",
    workspace_id: "guidance_counselor",
    professional_id: "guidance_counselor",
    environment: "production",
  });
  assert.doesNotMatch(JSON.stringify(dispatch), /next|private/);
});

test("BO-404 framework attribution cannot be overridden by event callers", () => {
  const context = classifyBeastRoute("/dashboard/security");
  const dispatch = buildAnalyticsDispatch({
    event: "workspace_viewed",
    context,
    properties: {
      contract_version: "false-contract",
      product_id: "wrong_product",
      module_id: "wrong_module",
      environment: "development",
      source: "client_navigation",
    },
    consent: "enabled",
    environment: "production",
    measurementId,
  });

  assert.deepEqual(dispatch?.properties, {
    contract_version: "bo404-v1",
    product_id: "beastsecurity",
    module_id: "security",
    workspace_id: "security",
    environment: "production",
    source: "client_navigation",
  });
});

test("BO-404 prevents duplicate and authentication-transition page views", () => {
  const pageViews = createPageViewDeduplicator();
  assert.equal(pageViews.shouldTrack("/dashboard/today"), true);
  assert.equal(pageViews.shouldTrack("/dashboard/today?private=value"), false);
  assert.equal(pageViews.shouldTrack("/auth/callback"), false);
  assert.equal(pageViews.shouldTrack("/login?next=/dashboard"), false);
  assert.equal(pageViews.shouldTrack("/dashboard/money/coach"), true);
});

test("BO-404 future products register without redefining the framework", () => {
  const future = registerAnalyticsProduct({
    productId: "changetheworld",
    defaultModuleId: "simulation",
    supportedEvents: ["page_viewed", "workflow_completed"],
  });
  const dispatch = buildAnalyticsDispatch({
    event: "workflow_completed",
    context: { registration: future, workspaceId: "scenario_review" },
    consent: "enabled",
    environment: "production",
    measurementId,
  });
  assert.equal(dispatch?.properties.product_id, "changetheworld");
  assert.equal(dispatch?.properties.workspace_id, "scenario_review");
});

test("BO-404 uses coarse performance buckets instead of raw timings", () => {
  assert.equal(analyticsPerformanceBucket(800), "under_1s");
  assert.equal(analyticsPerformanceBucket(2500), "1s_to_3s");
  assert.equal(analyticsPerformanceBucket(5000), "3s_to_10s");
  assert.equal(analyticsPerformanceBucket(12000), "over_10s");
});

test("BO-404 removes the hard-coded Beast stream and protects GA4 configuration", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const provider = readFileSync(
    "src/app/components/analytics/BeastAnalytics.tsx",
    "utf8"
  );
  assert.match(layout, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.doesNotMatch(layout, /G-YFRV4QJK04/);
  assert.match(provider, /send_page_view: false/);
  assert.match(provider, /allow_google_signals: false/);
  assert.match(provider, /ad_personalization: "denied"/);
  assert.match(provider, /data-analytics-event/);
});

test("BO-404 BeastAdmin reports configuration without fake aggregates", () => {
  const unconfigured = buildBeastAdminProductIntelligenceState({});
  assert.equal(unconfigured.status, "unconfigured");
  assert.match(unconfigured.description, /Configure/);

  const collectionOnly = buildBeastAdminProductIntelligenceState({
    NEXT_PUBLIC_GA_MEASUREMENT_ID: measurementId,
  });
  assert.equal(collectionOnly.status, "collection_only");

  const ready = buildBeastAdminProductIntelligenceState({
    NEXT_PUBLIC_GA_MEASUREMENT_ID: measurementId,
    BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "123456789",
    SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL: "service-account",
    SEANGWORLD_GOOGLE_PRIVATE_KEY: "configured",
  });
  assert.equal(ready.status, "data_api_ready");
  assert.ok(ready.limitations.every((item) => !/\b0\b/.test(item)));

  const legacyProperty = buildBeastAdminProductIntelligenceState({
    NEXT_PUBLIC_GA_MEASUREMENT_ID: measurementId,
    SEANGWORLD_GA4_PROPERTY_ID: "987654321",
    SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL: "service-account",
    SEANGWORLD_GOOGLE_PRIVATE_KEY: "configured",
  });
  assert.equal(legacyProperty.status, "property_review_required");
});
