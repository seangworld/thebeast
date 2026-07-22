import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
} from "../src/lib/moneyCoachExperience";

const input = {
  ownerId: "owner-1",
  userName: "Sean Example",
  asOfDate: new Date(2026, 6, 22, 19),
  activeBillCount: 4,
  billsDueSoonCount: 1,
  monthlyBills: 1200,
  activeDebtCount: 2,
  totalDebt: 18000,
  projectedDebtReduction: 650,
  debtProgressPercent: 3.6,
  monthlyIncome: 6000,
  monthlyOutflow: 4200,
  projectedSurplus: 1800,
  currentCash: 5000,
  cashBuffer: 2500,
  utilization: 28,
  fundingSourceCount: 1,
  safeFundingSourceCapacity: 3000,
  assignedIncomePotCount: 5,
  totalObligationCount: 6,
  recommendationTitle: "Protect the next bill cycle",
  recommendationAction: "Keep the upcoming bill amount in checking.",
  recommendationWhy: "The 30-day forecast includes a bill before the next income date.",
  recommendationHref: "/dashboard/money/cashflow",
  interestSaved: 900,
  timeSavedMonths: 4,
  billsDueSoon: [{ name: "Electric", amount: 140, dueDate: "Jul 24" }],
};

test("MC-201 derives the Money Coach landing experience from current calculations", () => {
  const model = buildMoneyCoachExperience(input);

  assert.equal(model.greeting, "Good evening, Sean.");
  assert.match(model.conversationOpening, /reviewed|wanted to mention|opportunity|positive/i);
  assert.ok(model.cards.some((card) => card.id === "upcoming-bills"));
  assert.ok(model.cards.some((card) => card.id === "debt-progress"));
  assert.ok(model.cards.some((card) => card.id === "cash-flow"));
  assert.ok(model.cards.some((card) => card.id === "income-pots"));
  assert.ok(model.cards.some((card) => card.id === "funding-sources"));
  assert.ok(model.cards.every((card) => card.explainWhy.length > 0));
  assert.equal(model.behavior.id, "beastmoney.money-coach");
  assert.ok(model.insights.every((insight) => insight.specialist === "beastmoney.money-coach"));
  assert.ok(model.insights.every((insight) => insight.ownerId === "owner-1"));
  assert.ok(model.insights.every((insight) => insight.provenance.calculationOrRule.length > 0));
  assert.ok(model.insights.every((insight) => insight.explainWhy?.limitations.length));
  assert.ok(model.suggestions.some((item) => item.prompt?.includes("bills")));
  assert.ok(model.suggestions.some((item) => item.prompt?.includes("debt")));
});

test("MC-201 handles missing financial data without inventing facts", () => {
  const model = buildMoneyCoachExperience({
    ...input,
    activeBillCount: 0,
    billsDueSoonCount: 0,
    monthlyBills: 0,
    activeDebtCount: 0,
    totalDebt: 0,
    projectedDebtReduction: 0,
    debtProgressPercent: 0,
    monthlyIncome: 0,
    monthlyOutflow: 0,
    projectedSurplus: 0,
    currentCash: 0,
    cashBuffer: 0,
    fundingSourceCount: 0,
    safeFundingSourceCapacity: 0,
    assignedIncomePotCount: 0,
    totalObligationCount: 0,
    interestSaved: 0,
    timeSavedMonths: 0,
  });

  assert.ok(model.cards.some((card) => card.id === "missing-information"));
  assert.match(model.safetyNotice, /not financial, tax, investment, legal, credit, or lending advice/);
  assert.doesNotMatch(JSON.stringify(model), /sample balance|placeholder/i);
});

test("MC-201 answers with deterministic existing calculations and Explain Why", () => {
  const response = answerMoneyCoachQuestion(
    "Can you explain my cash flow?",
    buildMoneyCoachExperience(input)
  );

  assert.equal(response.href, "/dashboard/money/cashflow");
  assert.match(response.text, /Explain Why:/);
  assert.match(response.text, /Cash Intelligence/);
});

test("AGENT-211 responds naturally to testing, actual bills, affordability, and non-financial conversation", () => {
  const model = buildMoneyCoachExperience(input);
  assert.match(answerMoneyCoachQuestion("testing", model).text, /testing the conversation/i);
  const bills = answerMoneyCoachQuestion("What bills need attention?", model);
  assert.match(bills.text, /Electric/);
  assert.match(bills.text, /\$140/);
  assert.match(bills.text, /Jul 24/);
  const affordability = answerMoneyCoachQuestion("Can I afford another payment?", model);
  assert.match(affordability.text, /protected \$2,500\.00 reserve/);
  assert.match(affordability.text, /\$1,800\.00/);
  assert.match(affordability.text, /assumes your saved balances/i);
  assert.match(answerMoneyCoachQuestion("What is your favorite movie?", model).text, /doesn’t appear to be a financial question/i);
});

test("MC-201 consumes the shared AgentExperience without replacing existing pages", () => {
  const component = readFileSync(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "utf8"
  );
  const landing = readFileSync("src/app/dashboard/money/page.tsx", "utf8");

  assert.match(component, /from "@\/app\/components\/agents"/);
  assert.match(component, /<AgentExperience/);
  assert.match(component, /AgentMemoryRecord/);
  assert.match(component, /composerPlacement="before-cards"/);
  assert.match(component, /Today&apos;s priorities/);
  assert.doesNotMatch(component, /AgentSmartCard/);
  assert.doesNotMatch(component, /Today&apos;s Financial Review/);
  assert.match(component, /buildMoneyCoachGreeting/);
  assert.match(component, /suggestion\.prompt/);
  assert.match(component, /ServerAgentConversationRepository/);
  assert.match(component, /SupabaseAgentConversationStore/);
  assert.match(component, /SupabaseAgentMemoryStore/);
  assert.match(component, /importLegacy/);
  assert.match(component, /Chat History/);
  assert.match(component, /Rename/);
  assert.match(component, /Unpin/);
  assert.match(component, /Archive/);
  assert.match(component, /Delete/);
  assert.match(component, /Review durable memories/);
  assert.match(component, /lg:grid-cols-\[minmax\(0,1fr\)_18rem\]/);
  assert.match(component, /h-\[32rem\]/);
  assert.match(component, /data-money-coach-active-scroll="true"/);
  assert.match(component, /data-money-coach-history-list="true"/);
  assert.match(component, /overflow-y-auto/);
  assert.match(component, /lg:hidden/);
  assert.match(component, /role="dialog"/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /New conversation/);
  assert.match(component, /Active conversation/);
  assert.match(component, /threads\.slice\(0, 10\)/);
  assert.match(component, /threads\.slice\(10\)/);
  assert.match(component, /MoneyCoachConversationTimeline/);
  assert.match(component, /max-w-3xl/);
  assert.match(component, /divide-y divide-white\/\[0\.07\]/);
  assert.match(component, /data-message-role/);
  assert.match(component, /scrollTo\(\{ top: region\.scrollHeight/);
  assert.match(component, /\[&_table\]:w-full/);
  assert.match(component, /\[&_ul\]:list-disc/);
  assert.match(component, /\[&_ol\]:list-decimal/);
  assert.doesNotMatch(component, /<AgentConversationTimeline/);
  for (const route of [
    "/dashboard/money/cashflow",
    "/dashboard/money/debts",
    "/dashboard/money/velocity",
    "/dashboard/money/retirement",
  ]) {
    assert.match(landing, new RegExp(route));
  }
  assert.match(landing, /showPageHeader=\{false\}/);
  assert.match(landing, /window\.location\.hash === "#money-dashboard"/);
  assert.match(landing, /!showDashboard \? <MoneyCoachExperience/);
  assert.match(landing, /Financial mission control/);
  assert.match(landing, /BeastMoney Dashboard/);
  assert.match(landing, /Explore current balances, obligations, forecasts, risks, trends, scenarios, and reports/);
});
