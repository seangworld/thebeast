import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatBeastAdminAnalyticsRate,
  formatBeastAdminSessionLength,
  getBeastAdminAbandonmentRate,
  getBeastAdminProfessionalName,
  normalizeBeastAdminAIAnalytics,
} from "../src/lib/beastAdminAIAnalytics";

const validSnapshot = {
  windowDays: 30,
  generatedAt: "2026-07-26T15:00:00.000Z",
  conversationCount: 10,
  engagedMemberCount: 4,
  messageCount: 48,
  archivedCount: 2,
  abandonedCount: 2,
  averageSessionSeconds: 750,
  completionRate: null,
  helpfulResponseRate: null,
  professionalUsage: [
    {
      agentId: "beastmoney.money-coach",
      conversationCount: 6,
      messageCount: 30,
    },
    {
      agentId: "beasteducation.guidance-counselor",
      conversationCount: 4,
      messageCount: 18,
    },
  ],
  commonTopics: [
    { topic: "debt planning", conversationCount: 3 },
    { topic: "career", conversationCount: 2 },
  ],
  dailyActivity: [
    { date: "2026-07-25", conversationCount: 3 },
    { date: "2026-07-26", conversationCount: 7 },
  ],
};

test("BA-103 normalizes source-backed AI analytics without inventing quality rates", () => {
  const snapshot = normalizeBeastAdminAIAnalytics(validSnapshot);

  assert.ok(snapshot);
  assert.equal(snapshot.conversationCount, 10);
  assert.equal(snapshot.averageSessionSeconds, 750);
  assert.equal(snapshot.completionRate, null);
  assert.equal(snapshot.helpfulResponseRate, null);
  assert.deepEqual(snapshot.professionalUsage, validSnapshot.professionalUsage);
  assert.deepEqual(snapshot.commonTopics, validSnapshot.commonTopics);
  assert.deepEqual(snapshot.dailyActivity, validSnapshot.dailyActivity);
});

test("BA-103 preserves confirmed zeroes and rejects invalid aggregate values", () => {
  const empty = normalizeBeastAdminAIAnalytics({
    ...validSnapshot,
    conversationCount: 0,
    engagedMemberCount: 0,
    messageCount: 0,
    archivedCount: 0,
    abandonedCount: 0,
    averageSessionSeconds: null,
    professionalUsage: [],
    commonTopics: [],
    dailyActivity: [],
  });
  const invalid = normalizeBeastAdminAIAnalytics({
    ...validSnapshot,
    abandonedCount: -1,
  });
  const invalidDuration = normalizeBeastAdminAIAnalytics({
    ...validSnapshot,
    averageSessionSeconds: "unknown",
  });

  assert.equal(empty?.conversationCount, 0);
  assert.equal(empty?.averageSessionSeconds, null);
  assert.equal(invalid, null);
  assert.equal(invalidDuration, null);
});

test("BA-103 formats professional usage, duration, and rates clearly", () => {
  assert.equal(
    getBeastAdminProfessionalName("beastmoney.money-coach"),
    "Money Coach"
  );
  assert.equal(
    getBeastAdminProfessionalName("future.career-strategist"),
    "Career Strategist"
  );
  assert.equal(formatBeastAdminSessionLength(null), "Not measured");
  assert.equal(formatBeastAdminSessionLength(42), "42 sec");
  assert.equal(formatBeastAdminSessionLength(750), "13 min");
  assert.equal(formatBeastAdminSessionLength(3900), "1 hr 5 min");
  assert.equal(formatBeastAdminAnalyticsRate(null), "Not measured");
  assert.equal(formatBeastAdminAnalyticsRate(0), "0%");
  assert.equal(formatBeastAdminAnalyticsRate(0.84), "84%");
  assert.equal(
    getBeastAdminAbandonmentRate({
      abandonedCount: 2,
      conversationCount: 10,
    }),
    0.2
  );
  assert.equal(
    getBeastAdminAbandonmentRate({
      abandonedCount: 0,
      conversationCount: 0,
    }),
    0
  );
});

test("BA-103 database aggregation is admin-only and does not return raw content", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000100_add_beast_admin_ai_analytics.sql",
    "utf8"
  );

  assert.match(migration, /security definer/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /errcode = '42501'/);
  assert.match(migration, /agent_conversations/);
  assert.match(migration, /agent_conversation_messages/);
  assert.match(migration, /message\.sender ->> 'kind'/);
  assert.match(migration, /last_message_at < now\(\) - interval '24 hours'/);
  assert.match(migration, /cross join lateral unnest\(rollup\.tags\)/);
  assert.match(migration, /'completionRate', null/);
  assert.match(migration, /'helpfulResponseRate', null/);
  assert.doesNotMatch(migration, /message\.content/);
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_ai_analytics/
  );
  assert.match(migration, /grant execute .*[\s\S]*to authenticated/);
});

test("BA-103 presents every requested metric with honest loading and empty states", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/analytics/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/analytics/BeastAdminAIAnalyticsWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  for (const metric of [
    "Conversations",
    "Average Session Length",
    "Professional Usage",
    "Completion rate",
    "Most Common Topics",
    "Abandoned Conversations",
    "Helpful response rate",
    "Quality metrics",
  ]) {
    assert.match(workspace, new RegExp(metric, "i"));
  }

  assert.match(page, /AI Analytics/);
  assert.match(page, /BeastAdminAIAnalyticsWorkspace/);
  assert.match(
    workspace,
    /\.rpc\(\s*"get_beast_admin_ai_analytics"/
  );
  assert.match(workspace, /7, 30, 90/);
  assert.match(workspace, /No recorded conversations/);
  assert.match(workspace, /Completion is intentionally not inferred/);
  assert.match(workspace, /Explicit response-linked feedback is required/);
  assert.match(workspace, /aggregate counts only/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(navigation, /AI Analytics/);
});

test("BA-123 explains usage metrics and reserves quality rates for explicit evidence", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/analytics/BeastAdminAIAnalyticsWorkspace.tsx",
    "utf8"
  );

  for (const definition of [
    "Counts persisted conversation threads created during the selected measurement window.",
    "Measures elapsed time between the first and last persisted message for conversations with at least two messages.",
    "Counts persisted member and professional messages attached to conversations created during the selected window.",
    "Counts conversations with a member message and no professional reply, or an unanswered latest member message older than 24 hours.",
  ]) {
    assert.match(workspace, new RegExp(definition.replace(/[.]/g, "\\.")));
  }

  assert.match(workspace, /archiving describes organization rather than success/);
  assert.match(workspace, /never estimates response quality/);
  assert.match(workspace, /Not collected/);
  for (const futureMetric of [
    "Member satisfaction",
    "Correction rate",
    "Escalation rate",
    "Resolution rate",
  ]) {
    assert.match(workspace, new RegExp(futureMetric));
  }
});
