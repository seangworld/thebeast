import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentActionToolRegistry,
  BeastAgentsPlatform,
  createDefaultAgentActionToolRegistry,
  defaultAgentActionTools,
} from "../src/lib/platform/agents";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const moneyCoachId = "beastmoney.money-coach";

test("the shared registry exposes the required action catalog as metadata", () => {
  const ids = new Set(defaultAgentActionTools.map((tool) => tool.id));
  [
    "open-workspace", "create-goal", "create-reminder", "upload-document",
    "search-documents", "open-bills", "open-debt", "open-forecast", "open-retirement",
  ].forEach((id) => assert.equal(ids.has(id), true, `missing ${id}`));
  defaultAgentActionTools.forEach((tool) => {
    assert.ok(tool.title);
    assert.ok(tool.description);
    assert.ok(tool.permission.resource);
    assert.ok(tool.permission.action);
    assert.ok(Array.isArray(tool.requiredData));
    assert.ok(tool.confirmation === "none" || tool.confirmation === "required");
    assert.ok(tool.specialistAvailability === "all" || tool.specialistAvailability.length > 0);
  });
});

test("prepared actions enforce availability, permissions, required data, and confirmation", () => {
  const registry = createDefaultAgentActionToolRegistry();
  assert.throws(() => registry.prepare({ toolId: "open-bills", specialistId: "beasthealth.health-advisor", grantedPermissions: [{ resource: "beastmoney.bills", action: "read" }] }), /not available/);
  assert.throws(() => registry.prepare({ toolId: "open-bills", specialistId: moneyCoachId, grantedPermissions: [] }), /requires beastmoney\.bills:read/);
  assert.throws(() => registry.prepare({ toolId: "create-goal", specialistId: moneyCoachId, grantedPermissions: [{ resource: "beastos.goals", action: "create" }] }), /Goal title/);

  const action = registry.prepare({
    toolId: "create-goal",
    specialistId: moneyCoachId,
    data: { title: "Build an emergency fund" },
    grantedPermissions: [{ resource: "beastos.goals", action: "create" }],
    actionId: "action-1",
  });
  assert.equal(action.toolId, "create-goal");
  assert.equal(action.confirmation, "required");
  assert.equal(registry.confirm(action).confirmation, "confirmed");
  assert.equal("execute" in action, false);
});

test("future specialists can register tools without changing the shared registry", () => {
  const registry = new AgentActionToolRegistry();
  registry.register({
    id: "open-learning-plan",
    title: "Open learning plan",
    description: "Open a member's learning plan.",
    kind: "navigate",
    permission: { resource: "beasteducation.plan", action: "read" },
    requiredData: [],
    confirmation: "none",
    specialistAvailability: ["beasteducation.guidance-counselor"],
    target: "/dashboard/education/plan",
  });
  assert.deepEqual(registry.listForSpecialist("beasteducation.guidance-counselor").map((tool) => tool.id), ["open-learning-plan"]);
});

test("the platform provides the same default specialist-neutral action registry", () => {
  const platform = new BeastAgentsPlatform();
  assert.equal(platform.actionTools.require("create-reminder").confirmation, "required");
  assert.equal(platform.actionTools.require("open-bills").target, "/dashboard/money/cashflow#bills");
});

test("Money Coach responses select registered structured tools", () => {
  const model = buildMoneyCoachExperience({
    ownerId: "owner-1", userName: "Sean", asOfDate: new Date("2026-07-22T12:00:00"),
    activeBillCount: 1, billsDueSoonCount: 1, monthlyBills: 100, activeDebtCount: 1,
    totalDebt: 1000, projectedDebtReduction: 100, debtProgressPercent: 10, monthlyIncome: 3000,
    monthlyOutflow: 2000, projectedSurplus: 1000, currentCash: 2000, cashBuffer: 500,
    utilization: 10, fundingSourceCount: 1, safeFundingSourceCapacity: 500,
    assignedIncomePotCount: 1, totalObligationCount: 1, recommendationTitle: "Review bills",
    recommendationAction: "Review upcoming bills", recommendationWhy: "One bill is due soon.",
    recommendationHref: "/dashboard/money/cashflow#bills", interestSaved: 0, timeSavedMonths: 0,
    billsDueSoon: [{ name: "Rent", amount: 100, dueDate: "2026-07-23" }],
  });
  const response = answerMoneyCoachQuestion("Which bills need attention?", model);
  assert.equal(response.toolAction?.toolId, "open-bills");
  assert.equal(response.toolAction?.kind, "navigate");
  assert.equal(response.toolAction?.target, response.href);
  assert.equal(response.toolAction?.status, "prepared");
});
