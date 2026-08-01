import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  digitalStaffDirector,
  digitalStaffSpecialists,
  getDigitalProfessional,
} from "../src/lib/digitalStaff";
import {
  buildDirectorRecommendation,
  classifyDirectorQuestion,
  directorProfessionalId,
  type DirectorContext,
} from "../src/lib/director";

const context: DirectorContext = {
  signals: [
    {
      id: "debt-1",
      domain: "money",
      label: "Visa",
      status: "overdue",
      date: "2026-07-29",
      detail: "A saved debt payment is overdue.",
      href: "/dashboard/money/debts",
      source: "BeastMoney debt record",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "education-1",
      domain: "education",
      label: "Finish certification",
      status: "active",
      date: "2026-09-01",
      detail: "The education goal has a current target date.",
      href: "/dashboard/education/education-planning",
      source: "BeastGoals",
      updatedAt: "2026-07-31T10:00:00.000Z",
    },
  ],
  specialistSummaries: [],
  unavailableSources: [],
};

test("BO-503 restores the stable Director profile above the specialist hierarchy", () => {
  assert.equal(digitalStaffDirector.id, "fusion-director");
  assert.equal(digitalStaffDirector.canonicalId, directorProfessionalId);
  assert.equal(digitalStaffDirector.name, "Avery Stone");
  assert.equal(digitalStaffDirector.status, "available");
  assert.equal(digitalStaffDirector.href, "/dashboard/digital-staff/fusion-director");
  assert.equal(digitalStaffDirector.conversationHref, "/dashboard/director");
  assert.deepEqual(
    digitalStaffSpecialists.map((professional) => professional.id),
    ["money-coach", "guidance-counselor", "health-advisor"]
  );
  assert.ok(
    digitalStaffSpecialists.every(
      (professional) => professional.reportsToId === digitalStaffDirector.id
    )
  );
  assert.deepEqual(
    digitalStaffDirector.directReports,
    digitalStaffSpecialists.map(({ id }) => id)
  );
});

test("BO-503 routes detailed questions without impersonating specialists", () => {
  assert.deepEqual(classifyDirectorQuestion("Can I afford college next year?"), [
    "money",
    "education",
    "goals",
  ]);
  assert.deepEqual(classifyDirectorQuestion("Should I change my medication?"), [
    "health",
  ]);
  const recommendation = buildDirectorRecommendation({
    question: "Can I afford college while paying this debt?",
    context,
    now: new Date("2026-08-01T12:00:00.000Z"),
  });
  assert.equal(recommendation.recommendedProfessional, "Money Coach");
  assert.equal(recommendation.recommendedHref, "/dashboard/money/debts");
  assert.equal(recommendation.contributions.length, 2);
  assert.ok(recommendation.conflicts.some((item) => /cost may affect/i.test(item)));
  for (const contribution of recommendation.contributions) {
    assert.ok(contribution.professionalId);
    assert.ok(contribution.supportingRecord);
    assert.ok(contribution.source);
    assert.ok(contribution.date);
    assert.ok(contribution.confidence);
    assert.ok(contribution.importantLimitation);
  }
});

test("BO-503 preserves health, finance, education, approval, and privacy boundaries", () => {
  const recommendation = buildDirectorRecommendation({
    question:
      "Diagnose my symptoms, change my medication, invest my money, and guarantee a higher salary",
    context,
    now: new Date("2026-08-01T12:00:00.000Z"),
  });
  const limitations = recommendation.limitations.join(" ");
  assert.match(limitations, /cannot diagnose/i);
  assert.match(limitations, /investment or tax advice/i);
  assert.match(limitations, /cannot guarantee/i);
  assert.match(limitations, /does not impersonate/i);
  assert.match(limitations, /Household information remains owner-scoped/i);
});

test("BO-503 reuses owner-scoped conversation and RLS architecture", () => {
  const route = readFileSync(
    "src/app/api/director/conversations/route.ts",
    "utf8"
  );
  const migration = readFileSync(
    "supabase/migrations/20260722000100_add_agent_conversations_and_memory.sql",
    "utf8"
  );
  assert.match(route, /createRouteClient/);
  assert.match(route, /supabase\.auth\.getUser/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.match(route, /\.eq\("agent_id", directorProfessionalId\)/);
  assert.match(route, /agent_conversations/);
  assert.match(route, /agent_conversation_messages/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE/);
  assert.match(
    migration,
    /alter table public\.agent_conversations enable row level security/
  );
  assert.match(migration, /auth\.uid\(\) = owner_id/);
});

test("BO-503 member experience uses AP-001 identity, separate threads, and responsive history", () => {
  const workspace = readFileSync(
    "src/app/dashboard/director/DirectorExperience.tsx",
    "utf8"
  );
  assert.ok(getDigitalProfessional("fusion-director"));
  assert.match(workspace, /ProfessionalConversationTimeline/);
  assert.match(workspace, /directorConversationIdentity/);
  assert.match(workspace, /action: "create"/);
  assert.match(workspace, /New Conversation/);
  assert.match(workspace, /ProfessionalConversationWorkspace/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /historyTriggerRef\.current\?\.focus/);
  assert.match(workspace, /min-w-0/);
  assert.doesNotMatch(workspace, /overflow-x-hidden/);
});
