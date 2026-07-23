import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const model = buildMoneyCoachExperience({
  ownerId: "owner-professional", userName: "Sean", asOfDate: new Date("2026-07-22T12:00:00Z"), activeBillCount: 2, billsDueSoonCount: 2,
  monthlyBills: 1800, activeDebtCount: 2, totalDebt: 18000, projectedDebtReduction: 800, debtProgressPercent: 4,
  monthlyIncome: 6000, monthlyOutflow: 4200, projectedSurplus: 1800, currentCash: 5000, cashBuffer: 2500,
  utilization: 25, fundingSourceCount: 1, safeFundingSourceCapacity: 5000, assignedIncomePotCount: 2, totalObligationCount: 4,
  recommendationTitle: "Protect cash", recommendationAction: "Protect the next bill cycle.", recommendationWhy: "Upcoming obligations clear before another payment.",
  recommendationHref: "/dashboard/money", interestSaved: 1000, timeSavedMonths: 4, helocReserve: 10000,
  billsDueSoon: [{ name: "Electric", amount: 140, dueDate: "Jul 24", status: "Due soon" }, { name: "Mortgage", amount: 1600, dueDate: "Aug 1", status: "Due soon" }],
  upcomingIncome: [{ name: "Paycheck", amount: 3000, date: "Jul 31" }],
  debts: [{ name: "Card", balance: 18000, minimumPayment: 400, interestRate: 24 }],
  strategyScenarios: [{ id: "velocity", label: "Velocity", monthsToPayoff: 24, totalInterest: 1800, monthlyCashStrain: 900, riskLevel: "moderate", debtFreeDate: "Jul 2028" }, { id: "avalanche", label: "Avalanche", monthsToPayoff: 28, totalInterest: 2400, monthlyCashStrain: 800, riskLevel: "low", debtFreeDate: "Nov 2028" }],
});

test("MC-213 applies configured professional identity to every live response", () => {
  const response = answerMoneyCoachQuestion("Which bills need attention?", model);
  assert.equal(response.professionalExecution.profileId, model.professional.id);
  assert.equal(response.professionalExecution.role, model.professional.identity.role);
  assert.equal(response.professionalExecution.mission, model.professional.identity.mission);
  assert.deepEqual(response.professionalExecution.communicationStyle, model.professional.identity.communicationStyle);
  assert.deepEqual(response.professionalExecution.professionalBoundaries, model.professional.identity.professionalBoundaries);
  assert.deepEqual(response.professionalExecution.investigationOrder, ["current-records", "recent-context", "durable-memory", "user-clarification"]);
});

test("MC-213 identity configuration changes execution without changing financial rules", () => {
  const configured = { ...model, professional: { ...model.professional, identity: { ...model.professional.identity, role: "Configured Financial Guide", mission: "Explain the member's choices clearly.", communicationStyle: ["precise", "patient"] } } };
  const response = answerMoneyCoachQuestion("How is my Velocity strategy doing?", configured);
  assert.equal(response.professionalExecution.role, "Configured Financial Guide");
  assert.equal(response.professionalExecution.mission, "Explain the member's choices clearly.");
  assert.deepEqual(response.professionalExecution.communicationStyle, ["precise", "patient"]);
  assert.match(response.text, /\$10,000\.00/);
});

test("MC-213 playbook controls teaching detail prioritization and uncertainty", () => {
  const configured = { ...model, professional: { ...model.professional,
    behavior: { ...model.professional.behavior, communication: { ...model.professional.behavior.communication, verbosity: "brief" as const } },
    playbook: { ...model.professional.playbook,
      prioritization: { ...model.professional.playbook.prioritization, maximumInitialItems: 2 },
      teaching: { ...model.professional.playbook.teaching, method: "step-by-step" as const },
      uncertainty: { ...model.professional.playbook.uncertainty, stateAssumptions: true },
    },
    identity: { ...model.professional.identity, professionalBoundaries: ["Configured planning boundary."] },
  } };
  const definition = answerMoneyCoachQuestion("What is Velocity?", configured);
  assert.equal(definition.sections.length, 2);
  assert.equal(definition.sections[1].numberedItems?.length, 2);
  assert.equal(definition.professionalExecution.teachingMethod, "step-by-step");
  const evaluation = answerMoneyCoachQuestion("Should I use Velocity?", configured);
  assert.match(evaluation.text, /Configured planning boundary/);
  assert.ok(evaluation.professionalExecution.uncertaintyRulesApplied.includes("avoid-unsupported-claims"));
});

test("MC-213 applies focused follow-up and closing rules", () => {
  const ambiguous = answerMoneyCoachQuestion("Velocity", model);
  const navigation = answerMoneyCoachQuestion("Open Velocity", model);
  assert.equal(ambiguous.intentType, "clarify");
  assert.match(ambiguous.text, /definition.*current status.*evaluation/i);
  assert.equal(navigation.intentType, "navigate");
  assert.equal(navigation.followUp, undefined);
  assert.equal(navigation.sections.length, 0);
  assert.equal(navigation.professionalExecution.closingRule, model.professional.playbook.closing.style);
});

test("MC-213 keeps response intents distinct and structured evidence supporting", () => {
  const questions = ["What is Velocity?", "How is my Velocity strategy doing?", "Should I use Velocity?", "Velocity or Avalanche?", "How much interest could Velocity save?", "Open Velocity"];
  assert.deepEqual(questions.map((question) => answerMoneyCoachQuestion(question, model).intentType), ["define", "explain-current-status", "evaluate", "compare", "calculate", "navigate"]);
  const bills = answerMoneyCoachQuestion("Which bills need attention?", model);
  assert.equal(bills.sections[0].table?.rows.length, 2);
  assert.match(bills.opening, /2 bills/i);
  const definition = answerMoneyCoachQuestion("What is Velocity?", model);
  assert.match(definition.opening, /debt-paydown method/i);
  assert.notEqual(definition.opening, definition.action);
});

test("MC-213 handles casual input through shared intelligence and has no question-answer map", () => {
  assert.match(answerMoneyCoachQuestion("testing", model).opening, /testing/i);
  assert.match(answerMoneyCoachQuestion("thanks", model).opening, /ready/i);
  assert.match(answerMoneyCoachQuestion("Tell me a joke", model).opening, /doesn’t appear to be a financial question/i);
  const source = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  assert.doesNotMatch(source, /new Map\(\[\s*\[\s*["']What is Velocity/i);
  assert.doesNotMatch(source, /questionAnswer|answerLookup/i);
});

test("BM-314 adds consultation transitions without changing reasoning or calculations", () => {
  const definition = answerMoneyCoachQuestion("What is Velocity?", model);
  const status = answerMoneyCoachQuestion("How is my Velocity strategy doing?", model);
  const evaluation = answerMoneyCoachQuestion("Should I use Velocity?", model);
  const comparison = answerMoneyCoachQuestion("Velocity or Avalanche?", model);
  const calculation = answerMoneyCoachQuestion("How much interest could Velocity save?", model);
  const navigation = answerMoneyCoachQuestion("Open Velocity", model);

  assert.match(definition.opening, /Here’s how I think about it/);
  assert.match(status.opening, /Based on your current setup/);
  assert.match(evaluation.opening, /In your situation/);
  assert.match(comparison.opening, /The important distinction is/);
  assert.match(calculation.opening, /Here’s how the numbers come together/);
  assert.doesNotMatch(navigation.opening, /Here’s|current setup|important distinction/);
  assert.match(calculation.text, /\$600\.00/);
  assert.deepEqual(
    [definition, status, evaluation, comparison, calculation, navigation].map(
      (response) => response.intentType
    ),
    ["define", "explain-current-status", "evaluate", "compare", "calculate", "navigate"]
  );
  assert.match(comparison.followUp || "", /matters more/i);
  assert.doesNotMatch(comparison.followUp || "", /anything else/i);
});
