import assert from "node:assert/strict";
import test from "node:test";
import {
  SpecialistConceptRegistry,
  classifyDomainResponseIntent,
  type DomainConceptDefinition,
} from "../src/lib/platform/agents";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience, classifyMoneyCoachRequest } from "../src/lib/moneyCoachExperience";

const futureConcepts = [
  { topic: "learning-path", label: "Learning Path", aliases: ["learning path", "course path"] },
  { topic: "care-plan", label: "Care Plan", aliases: ["care plan", "treatment plan"] },
] as const satisfies readonly DomainConceptDefinition<"learning-path" | "care-plan">[];

test("shared routing keeps response intent separate from domain topic", () => {
  const definition = classifyDomainResponseIntent("What is a learning path?", futureConcepts);
  const status = classifyDomainResponseIntent("How is my learning path doing?", futureConcepts);
  const evaluation = classifyDomainResponseIntent("Should I use this learning path?", futureConcepts);
  assert.deepEqual(definition.topics, ["learning-path"]);
  assert.equal(definition.intentType, "define");
  assert.equal(status.intentType, "explain-current-status");
  assert.equal(evaluation.intentType, "evaluate");
});

test("shared routing preserves equivalent distinctions for a second future-specialist concept", () => {
  assert.equal(classifyDomainResponseIntent("What is a care plan?", futureConcepts).intentType, "define");
  assert.equal(classifyDomainResponseIntent("How is my care plan doing?", futureConcepts).intentType, "explain-current-status");
  assert.equal(classifyDomainResponseIntent("Open my care plan", futureConcepts).intentType, "navigate");
  assert.equal(classifyDomainResponseIntent("Which care plan do you mean?", futureConcepts).intentType, "clarify");
});

test("shared routing identifies compare calculate navigation and ambiguity", () => {
  assert.equal(classifyDomainResponseIntent("Learning path or care plan?", futureConcepts).intentType, "compare");
  assert.equal(classifyDomainResponseIntent("How many courses would the learning path require?", futureConcepts).intentType, "calculate");
  assert.equal(classifyDomainResponseIntent("Open learning path", futureConcepts).intentType, "navigate");
  const ambiguous = classifyDomainResponseIntent("Learning path", futureConcepts);
  assert.equal(ambiguous.intentType, "clarify");
  assert.equal(ambiguous.ambiguous, true);
  assert.ok(ambiguous.confidence < 0.7);
});

test("specialists register concepts and intent handlers without changing the classifier", () => {
  const registry = new SpecialistConceptRegistry<"learning-path", { memberId: string }, string>();
  registry.registerConcept({ topic: "learning-path", label: "Learning Path", aliases: ["learning path"] });
  registry.registerHandler("learning-path", "define", ({ context }) => `Definition for ${context.memberId}`);
  const route = registry.route("What is a learning path?");
  assert.equal(registry.respond(route, { memberId: "member-1" }), "Definition for member-1");
});

const model = buildMoneyCoachExperience({
  ownerId: "owner-routing", userName: "Sean", asOfDate: new Date("2026-07-22T12:00:00Z"), activeBillCount: 1, billsDueSoonCount: 1,
  monthlyBills: 1200, activeDebtCount: 2, totalDebt: 18000, projectedDebtReduction: 800, debtProgressPercent: 4,
  monthlyIncome: 6000, monthlyOutflow: 4200, projectedSurplus: 1800, currentCash: 5000, cashBuffer: 2500,
  utilization: 25, fundingSourceCount: 1, safeFundingSourceCapacity: 5000, assignedIncomePotCount: 2, totalObligationCount: 3,
  recommendationTitle: "Protect cash", recommendationAction: "Protect the next bill cycle.", recommendationWhy: "Upcoming obligations clear before another payment.",
  recommendationHref: "/dashboard/money", interestSaved: 1000, timeSavedMonths: 4, helocReserve: 10000,
  upcomingIncome: [{ name: "Paycheck", amount: 3000, date: "Jul 31" }],
  debts: [{ name: "Card", balance: 18000, minimumPayment: 400, interestRate: 24 }],
  strategyScenarios: [
    { id: "velocity", label: "Velocity", monthsToPayoff: 24, totalInterest: 1800, monthlyCashStrain: 900, riskLevel: "moderate", debtFreeDate: "Jul 2028" },
    { id: "avalanche", label: "Avalanche", monthsToPayoff: 28, totalInterest: 2400, monthlyCashStrain: 800, riskLevel: "low", debtFreeDate: "Nov 2028" },
  ],
});

test("Money Coach distinguishes Velocity definition status and evaluation", () => {
  const definition = answerMoneyCoachQuestion("What is Velocity?", model);
  const status = answerMoneyCoachQuestion("How is my Velocity strategy doing?", model);
  const evaluation = answerMoneyCoachQuestion("Should I use Velocity?", model);
  assert.equal(definition.intentType, "define");
  assert.match(definition.opening, /debt-paydown method/i);
  assert.match(definition.text, /Main requirements/i);
  assert.doesNotMatch(definition.opening, /\$10,000/);
  assert.equal(status.intentType, "explain-current-status");
  assert.match(status.text, /\$10,000\.00/);
  assert.equal(evaluation.intentType, "evaluate");
  assert.match(evaluation.text, /HELOC APR|HELOC cost/i);
});

test("Money Coach routes Velocity comparison calculation and navigation precisely", () => {
  const comparison = answerMoneyCoachQuestion("Velocity or Avalanche?", model);
  const calculation = answerMoneyCoachQuestion("How much interest could Velocity save?", model);
  const navigation = answerMoneyCoachQuestion("Open Velocity.", model);
  assert.equal(comparison.intentType, "compare");
  assert.match(comparison.text, /\$1,800\.00/);
  assert.match(comparison.followUp || "", /matters more/i);
  assert.equal(calculation.intentType, "calculate");
  assert.match(calculation.opening, /\$600\.00/);
  assert.equal(navigation.intentType, "navigate");
  assert.equal(navigation.href, "/dashboard/money/velocity");
  assert.deepEqual(navigation.sections, []);
});

test("Money Coach exposes ambiguity instead of guessing a concept response", () => {
  const route = classifyMoneyCoachRequest("Velocity");
  const response = answerMoneyCoachQuestion("Velocity", model);
  assert.equal(route.ambiguous, true);
  assert.equal(response.intentType, "clarify");
  assert.match(response.text, /definition.*current status.*evaluation/i);
});
