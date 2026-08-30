import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildProductionEvaluationContext, buildProductionHandoffEvaluationContext, emptyProductionEvaluationState, evaluateProductionEntitlement, productionEvaluationEntitlementChecks, productionEvaluationScenarios, requireProductionEvaluationScenario, selectDigitalStaffModel } from "../src/lib/digitalStaffRuntime";

test("BF-AGT-015 covers all four member specialists with realistic multi-turn scenarios", () => {
  const professionals = new Set(productionEvaluationScenarios.map((scenario) => scenario.professionalId));
  assert.deepEqual(Array.from(professionals).sort(), ["beasteducation.guidance-counselor", "beasteducation.tutor", "beasthealth.health-advisor", "beastmoney.money-coach"]);
  assert.equal(productionEvaluationScenarios.length, 8);
  assert.ok(productionEvaluationScenarios.every((scenario) => scenario.turns.length >= 2));
  assert.ok(productionEvaluationScenarios.reduce((sum, scenario) => sum + scenario.turns.length, 0) >= 24);
  assert.throws(() => requireProductionEvaluationScenario("missing"), /Unknown/);
});

test("BF-AGT-015 scenarios use synthetic bounded context and deployed model selection", () => {
  for (const scenario of productionEvaluationScenarios) {
    const context = buildProductionEvaluationContext({ scenario, turnIndex: 0, recentMessages: [], state: emptyProductionEvaluationState });
    assert.equal(context.ownerId, "synthetic-production-evaluation-owner");
    assert.equal(context.contextBoundary?.entitlement, "allowed");
    assert.equal(context.contextBoundary?.handoffPolicy, "navigation-only; recheck entitlement; copy no conversation, memory, or sensitive record context");
    assert.ok(selectDigitalStaffModel(context));
    assert.ok(context.structuredRecords.length > 0);
  }
});

test("BF-AGT-015 catalog exercises safety continuity adaptation and handoffs", () => {
  const dimensions = productionEvaluationScenarios.flatMap((scenario) => scenario.dimensions).join(" ");
  for (const expected of ["prompt injection", "continuity", "adaptation", "handoff", "emergency escalation", "academic integrity"]) assert.match(dimensions, new RegExp(expected, "i"));
  const criteria = productionEvaluationScenarios.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.criteria));
  assert.ok(criteria.some((item) => item.id === "tutor-handoff"));
  assert.ok(criteria.some((item) => item.id === "no-payment"));
  assert.ok(criteria.some((item) => item.id === "emergency-action"));
  assert.ok(criteria.some((item) => item.id === "first-error"));
});

test("BF-AGT-015 rechecks real module entitlements before model invocation", () => {
  for (const check of productionEvaluationEntitlementChecks) {
    const result = evaluateProductionEntitlement(check);
    assert.equal(result.allowed, check.expectedAllowed, check.id);
  }
  assert.equal(evaluateProductionEntitlement({ professionalId: "beastmoney.money-coach", ageBand: "minor" }).reason, "minor_education_only");
  assert.equal(evaluateProductionEntitlement({ professionalId: "beasthealth.health-advisor", ageBand: "unknown" }).reason, "unknown_age");
});

test("BF-AGT-015 handoff target runs with a sanitized entitlement-checked context", () => {
  const scenario = requireProductionEvaluationScenario("guidance-adaptive-path-handoff");
  const context = buildProductionHandoffEvaluationContext({ scenario });
  assert.equal(context.professionalId, "beasteducation.tutor");
  assert.equal(context.contextBoundary?.entitlement, "allowed");
  assert.deepEqual(context.recentMessages, []);
  assert.deepEqual(context.memories, []);
  assert.deepEqual(context.structuredRecords.map((record) => record.domain), ["education"]);
  assert.ok(selectDigitalStaffModel(context));
});

test("BF-AGT-015 Production route is owner-only synthetic-only and forbids model override", () => {
  const route = readFileSync("src/app/api/admin/member-ai-production-evaluation/route.ts", "utf8");
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /memberRecordsLoaded: false/);
  assert.match(route, /modelOverrideUsed: false/);
  assert.match(route, /runDigitalStaffRuntime\(context\)/);
  assert.match(route, /runDigitalStaffRuntime\(targetContext\)/);
  assert.match(route, /sourceConversationCopied: false/);
  assert.match(route, /target-entitlement-denied/);
  assert.match(route, /configuredModelPolicy:[\s\S]*turns:/);
  assert.doesNotMatch(route, /body\.model|modelOverride:/);
  assert.doesNotMatch(route, /OPENAI_API_KEY/);
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(/);
});

test("BF-AGT-015 owner surface explains privacy and configured-model boundaries", () => {
  const page = readFileSync("src/app/dashboard/admin/member-ai-production-evaluation/page.tsx", "utf8");
  assert.match(page, /does not load or write member records/i);
  assert.match(page, /cannot override the configured model/i);
  assert.match(page, /controlled multi-turn scenarios/i);
  assert.match(page, /Evaluation incomplete:/);
  assert.match(page, /successful scenarios/);
  assert.match(page, /data-evaluation-evidence/);
});
