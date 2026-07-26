import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatBeastAdminMetricRate,
  getBeastAdminGrowthDelta,
  normalizeBeastAdminExecutiveMetrics,
} from "../src/lib/beastAdminExecutiveMetrics";

const validSnapshot = {
  windowDays: 30,
  generatedAt: "2026-07-26T15:00:00.000Z",
  members: {
    total: 12,
    newInWindow: 4,
    newInPreviousWindow: 2,
  },
  activity: {
    dailyActiveUsers: 3,
    weeklyActiveUsers: 7,
    trackedMemberCount: 9,
    trackedEventCount: 81,
    retentionEligibleMembers: 5,
    retainedMembers: 4,
    retentionRate: 0.8,
  },
  conversations: {
    count: 10,
    previousCount: 8,
    messageCount: 64,
  },
  moduleAdoption: [
    {
      moduleId: "beastos",
      moduleLabel: "BeastOS",
      memberCount: 12,
      adoptionRate: 1,
    },
    {
      moduleId: "money",
      moduleLabel: "BeastMoney",
      memberCount: 6,
      adoptionRate: 0.5,
    },
  ],
  professionalUsage: [
    {
      agentId: "beastmoney.money-coach",
      conversationCount: 6,
      memberCount: 4,
    },
  ],
  featureUsage: [
    {
      featureId: "professional_conversation",
      featureLabel: "Conversations started",
      usageCount: 10,
      memberCount: 6,
    },
  ],
  dailyActivity: [
    { date: "2026-07-25", activeMemberCount: 3, eventCount: 12 },
    { date: "2026-07-26", activeMemberCount: 5, eventCount: 19 },
  ],
  revenue: {
    status: "not_connected",
    monthlyRecurringRevenue: null,
    annualRecurringRevenue: null,
    evidence:
      "No owner-approved recognized-revenue or Stripe reporting feed is connected.",
  },
};

test("BA-110 normalizes source-backed ecosystem growth metrics", () => {
  const snapshot = normalizeBeastAdminExecutiveMetrics(validSnapshot);

  assert.ok(snapshot);
  assert.equal(snapshot.members.total, 12);
  assert.equal(snapshot.activity.dailyActiveUsers, 3);
  assert.equal(snapshot.activity.weeklyActiveUsers, 7);
  assert.equal(snapshot.activity.retentionRate, 0.8);
  assert.equal(snapshot.conversations.count, 10);
  assert.deepEqual(snapshot.moduleAdoption, validSnapshot.moduleAdoption);
  assert.deepEqual(snapshot.professionalUsage, validSnapshot.professionalUsage);
  assert.deepEqual(snapshot.featureUsage, validSnapshot.featureUsage);
  assert.deepEqual(snapshot.dailyActivity, validSnapshot.dailyActivity);
});

test("BA-110 preserves confirmed zeroes and honest unavailable retention", () => {
  const empty = normalizeBeastAdminExecutiveMetrics({
    ...validSnapshot,
    members: { total: 0, newInWindow: 0, newInPreviousWindow: 0 },
    activity: {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      trackedMemberCount: 0,
      trackedEventCount: 0,
      retentionEligibleMembers: 0,
      retainedMembers: 0,
      retentionRate: null,
    },
    conversations: { count: 0, previousCount: 0, messageCount: 0 },
    moduleAdoption: [],
    professionalUsage: [],
    featureUsage: [],
    dailyActivity: [],
  });
  const invalidRate = normalizeBeastAdminExecutiveMetrics({
    ...validSnapshot,
    activity: { ...validSnapshot.activity, retentionRate: 1.2 },
  });
  const inventedRevenue = normalizeBeastAdminExecutiveMetrics({
    ...validSnapshot,
    revenue: {
      ...validSnapshot.revenue,
      monthlyRecurringRevenue: 500,
    },
  });

  assert.equal(empty?.members.total, 0);
  assert.equal(empty?.activity.retentionRate, null);
  assert.equal(invalidRate, null);
  assert.equal(inventedRevenue, null);
  assert.equal(formatBeastAdminMetricRate(null), "Not enough history");
  assert.equal(formatBeastAdminMetricRate(0), "0%");
  assert.equal(formatBeastAdminMetricRate(0.756), "76%");
});

test("BA-110 calculates period growth without inventing a zero baseline rate", () => {
  assert.deepEqual(getBeastAdminGrowthDelta(12, 10), {
    direction: "up",
    percentage: 20,
  });
  assert.deepEqual(getBeastAdminGrowthDelta(8, 10), {
    direction: "down",
    percentage: -20,
  });
  assert.deepEqual(getBeastAdminGrowthDelta(0, 0), {
    direction: "flat",
    percentage: 0,
  });
  assert.deepEqual(getBeastAdminGrowthDelta(5, 0), {
    direction: "up",
    percentage: null,
  });
});

test("BA-110 database aggregation is owner-only and privacy bounded", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000700_add_beast_admin_executive_metrics.sql",
    "utf8"
  );

  assert.match(migration, /security definer/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /errcode = '42501'/);
  assert.match(migration, /dailyActiveUsers/);
  assert.match(migration, /weeklyActiveUsers/);
  assert.match(migration, /retentionEligibleMembers/);
  assert.match(migration, /agent_conversations/);
  assert.match(migration, /module_adoption/);
  assert.match(migration, /professional_usage/);
  assert.match(migration, /feature_usage/);
  assert.match(migration, /'monthlyRecurringRevenue', null/);
  assert.match(migration, /'annualRecurringRevenue', null/);
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_executive_metrics/
  );
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /message\.content/);
  assert.doesNotMatch(migration, /auth\.users/);
  assert.doesNotMatch(migration, /amount_paid|payment\.amount|debt\.balance/);
});

test("BA-110 presents every requested business metric and evidence boundary", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/metrics/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/metrics/BeastAdminExecutiveMetricsWorkspace.tsx",
    "utf8"
  );
  const dashboard = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  for (const metric of [
    "Members",
    "Daily active users",
    "Weekly active users",
    "Weekly retention",
    "Conversation volume",
    "Module adoption",
    "Most popular professionals",
    "Feature usage",
    "Future revenue metrics",
  ]) {
    assert.match(workspace, new RegExp(metric, "i"));
  }

  assert.match(page, /Executive Metrics/);
  assert.match(page, /BeastAdminExecutiveMetricsWorkspace/);
  assert.match(
    workspace,
    /\.rpc\(\s*"get_beast_admin_executive_metrics"/
  );
  assert.match(workspace, /7, 30, 90/);
  assert.match(workspace, /not login or page-view telemetry/i);
  assert.match(workspace, /does not expose[\s\S]*member identities/i);
  assert.match(workspace, /Apply the BA-110 Supabase migration/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(dashboard, /\/dashboard\/admin\/metrics/);
  assert.match(shell, /Executive Metrics/);
  assert.match(navigation, /Executive Metrics/);
});
