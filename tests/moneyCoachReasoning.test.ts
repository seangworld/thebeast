import assert from "node:assert/strict";
import test from "node:test";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience, classifyMoneyCoachIntent } from "../src/lib/moneyCoachExperience";

const model = buildMoneyCoachExperience({
  ownerId: "owner-reasoning", userName: "Sean", asOfDate: new Date("2026-07-22T12:00:00Z"),
  activeBillCount: 2, billsDueSoonCount: 2, monthlyBills: 900, activeDebtCount: 2, totalDebt: 15000,
  projectedDebtReduction: 700, debtProgressPercent: 4, monthlyIncome: 6000, monthlyOutflow: 4300,
  projectedSurplus: 1700, currentCash: 5000, cashBuffer: 2500, utilization: 20, fundingSourceCount: 1,
  safeFundingSourceCapacity: 3000, assignedIncomePotCount: 1, totalObligationCount: 4,
  recommendationTitle: "Protect cash", recommendationAction: "Protect the next bill cycle.",
  recommendationWhy: "Upcoming obligations must clear before an additional payment.", recommendationHref: "/dashboard/money",
  interestSaved: 1200, timeSavedMonths: 3,
  billsDueSoon: [
    { name: "Electric", amount: 140, dueDate: "Jul 24", status: "Due in 2 days", incomePot: "July 19 paycheck" },
    { name: "Mortgage", amount: 1600, dueDate: "Aug 1", status: "Due soon" },
  ],
  debts: [
    { name: "Card A", balance: 7000, minimumPayment: 200, interestRate: 24 },
    { name: "Card B", balance: 8000, minimumPayment: 220, interestRate: 13 },
  ],
  strategyScenarios: [
    { id: "avalanche", label: "Avalanche", monthsToPayoff: 28, totalInterest: 2100, monthlyCashStrain: 700, riskLevel: "low", debtFreeDate: "Nov 2028" },
    { id: "snowball", label: "Snowball", monthsToPayoff: 30, totalInterest: 2600, monthlyCashStrain: 700, riskLevel: "low", debtFreeDate: "Jan 2029" },
  ],
  forecast: [{ label: "August", cash: 3400, debt: 14200, cashShortages: 0 }],
  activeDebtStrategy: "avalanche", helocReserve: 3000,
});

test("MC-212 recognizes natural financial intents without exact canned prompts", () => {
  assert.equal(classifyMoneyCoachIntent("Should I stay with avalanche or switch methods?"), "debt-strategy");
  assert.equal(classifyMoneyCoachIntent("Which upcoming expenses need my attention?"), "bills");
  assert.equal(classifyMoneyCoachIntent("Is it safe to pay more this week?"), "payment-affordability");
  assert.equal(classifyMoneyCoachIntent("Who won the game?"), "non-financial");
});

test("MC-212 lists actual bills with evidence and a structured action", () => {
  const response = answerMoneyCoachQuestion("Which upcoming expenses need my attention?", model);
  assert.equal(response.intent, "bills");
  assert.deepEqual(response.sections[0].table?.columns, ["Due", "Bill", "Amount", "Status", "Income Pot"]);
  assert.match(response.text, /Electric/);
  assert.match(response.text, /Mortgage/);
  assert.match(response.text, /\$1,740\.00/);
  assert.equal(response.href, "/dashboard/money/cashflow#bills");
});

test("MC-212 compares current debt scenarios and asks for the member priority", () => {
  const response = answerMoneyCoachQuestion("Should I stay with avalanche or switch?", model);
  assert.equal(response.intent, "debt-strategy");
  assert.match(response.text, /Avalanche/);
  assert.match(response.text, /\$2,100\.00/);
  assert.match(response.text, /\$2,600\.00/);
  assert.match(response.followUp || "", /minimizing total interest.*faster account wins/i);
});

test("MC-212 keeps current records authoritative over stale memory", () => {
  const response = answerMoneyCoachQuestion("Can I afford another payment?", model, {
    memories: [{ key: "old-cash", value: { content: "My cash balance is $99,999" } }],
  });
  assert.match(response.text, /\$5,000\.00/);
  assert.doesNotMatch(response.text, /99,999/);
});

test("MC-212 distinguishes prior conversation context from financial change evidence", () => {
  const response = answerMoneyCoachQuestion("What changed since last time?", model, { priorSummaries: ["We discussed paying Card A"] });
  assert.match(response.text, /versioned financial snapshot/i);
  assert.match(response.text, /context, not authoritative financial data/i);
});

test("MC-212 asks focused questions instead of inventing missing records", () => {
  const empty = { ...model, financialContext: { ...model.financialContext, billsDueSoon: [], debts: [], strategyScenarios: [] } };
  assert.match(answerMoneyCoachQuestion("What bills are due?", empty).text, /don’t see any bill records/i);
  assert.match(answerMoneyCoachQuestion("Should I use avalanche?", empty).text, /can’t make a reliable/i);
});
