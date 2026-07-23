import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedBenchmarkIntelligence,
  type BenchmarkDefinition,
  type BenchmarkType,
} from "../src/lib/platform/agents";
import { buildMoneyCoachBenchmarks } from "../src/lib/moneyCoachBenchmarks";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
} from "../src/lib/moneyCoachExperience";

const now = "2026-07-23T12:00:00.000Z";

function benchmarkDefinition(
  id: string,
  type: BenchmarkType,
  specialist = "specialist",
  domain = "example"
): BenchmarkDefinition {
  const external = ["professional-guideline", "population-benchmark", "age-benchmark", "peer-benchmark"].includes(type);
  return {
    id,
    name: `${type} example`,
    type,
    domain,
    source: {
      name: external ? "Official example authority" : "Authenticated member records",
      authority: type === "professional-guideline"
        ? "professional-authority"
        : ["population-benchmark", "age-benchmark"].includes(type)
          ? "population-study"
          : type === "peer-benchmark"
            ? "peer-dataset"
            : type === "goal-baseline"
              ? "member-goal"
              : type === "household-baseline"
                ? "household-records"
                : type === "configuration-threshold"
                  ? "configuration"
                  : "member-records",
      ownerScoped: !external,
      citation: external ? "https://official.example/guidance" : undefined,
    },
    sourceDate: "2026-07-01T00:00:00.000Z",
    calculation: {
      metric: "Example metric",
      unit: "points",
      formula: "current value compared with reference value",
      direction: "higher-is-better",
    },
    applicableMemberConditions: {
      description: "The required current and reference values exist.",
      requiredConditions: ["current-value", "reference-value"],
    },
    applicableSpecialists: [specialist],
    confidence: "high",
    strengthOfEvidence: "strong",
    notes: ["The result is contextual rather than predictive."],
    expiresAt: "2027-07-01T00:00:00.000Z",
  };
}

function evaluate(engine: SharedBenchmarkIntelligence, benchmarkId: string, ownerId = "owner-1", specialistId = "specialist", authorizedScopes = ["member:read"]) {
  return engine.evaluate({
    ownerId,
    specialistId,
    benchmarkId,
    current: { value: 12, label: "Current value", measuredAt: now, supportingRecordIds: ["current-1"] },
    reference: { value: 10, label: "Reference value", measuredAt: now, supportingRecordIds: ["reference-1"] },
    conditionEvidence: { "current-value": true, "reference-value": true },
    authorizedScopes,
  });
}

test("AGENT-211 exposes one shared Benchmark Intelligence service", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.benchmarks instanceof SharedBenchmarkIntelligence);
});

test("AGENT-211 supports all ten benchmark types through configuration", () => {
  const types: BenchmarkType[] = [
    "personal-historical-baseline",
    "recent-trend-baseline",
    "household-baseline",
    "goal-baseline",
    "professional-guideline",
    "population-benchmark",
    "age-benchmark",
    "peer-benchmark",
    "configuration-threshold",
    "custom-benchmark",
  ];
  const engine = new SharedBenchmarkIntelligence(() => now);
  types.forEach((type) => engine.register(benchmarkDefinition(`benchmark.${type}`, type)));
  assert.deepEqual(engine.listForSpecialist("specialist").map((item) => item.type).sort(), [...types].sort());
});

test("AGENT-211 requires authoritative citations for external comparisons", () => {
  const engine = new SharedBenchmarkIntelligence(() => now);
  const invalid = benchmarkDefinition("population.invalid", "population-benchmark");
  assert.throws(() => engine.register({ ...invalid, source: { ...invalid.source, citation: undefined } }), /citable source/);
  const invalidGuideline = benchmarkDefinition("guideline.invalid", "professional-guideline");
  assert.throws(() => engine.register({ ...invalidGuideline, source: { ...invalidGuideline.source, authority: "custom" } }), /professional authority/);
});

test("AGENT-211 enforces applicability, specialist availability, expiry, and data authorization", () => {
  const engine = new SharedBenchmarkIntelligence(() => now);
  engine.register(benchmarkDefinition("personal.metric", "personal-historical-baseline"));
  assert.throws(() => engine.evaluate({
    ownerId: "owner-1",
    specialistId: "specialist",
    benchmarkId: "personal.metric",
    current: { value: 1, label: "Current", measuredAt: now, supportingRecordIds: [] },
    reference: { value: 2, label: "Reference", measuredAt: now, supportingRecordIds: [] },
    conditionEvidence: { "current-value": true },
    authorizedScopes: ["member:read"],
  }), /missing reference-value/);
  assert.throws(() => evaluate(engine, "personal.metric", "owner-1", "other-specialist"), /not available/);
  assert.throws(() => evaluate(engine, "personal.metric", "owner-1", "specialist", []), /member:read/);
  const expired = benchmarkDefinition("expired.metric", "custom-benchmark");
  assert.throws(() => engine.register({ ...expired, expiresAt: "2026-01-01T00:00:00.000Z" }), /expired/);
});

test("AGENT-211 keeps household comparisons behind household authorization", () => {
  const engine = new SharedBenchmarkIntelligence(() => now);
  engine.register(benchmarkDefinition("household.metric", "household-baseline"));
  assert.throws(() => evaluate(engine, "household.metric"), /household:read/);
  const result = evaluate(engine, "household.metric", "owner-1", "specialist", ["household:read"]);
  assert.match(result.interpretation, /authorized household baseline/);
});

test("AGENT-211 results distinguish reference types and never imply guarantees", () => {
  const engine = new SharedBenchmarkIntelligence(() => now);
  const personal = benchmarkDefinition("personal.metric", "personal-historical-baseline");
  const guideline = benchmarkDefinition("guideline.metric", "professional-guideline");
  const population = benchmarkDefinition("population.metric", "population-benchmark");
  [personal, guideline, population].forEach((item) => engine.register(item));
  const results = [personal, guideline, population].map((item) => evaluate(engine, item.id));
  assert.match(results[0].interpretation, /personal historical baseline/);
  assert.match(results[1].interpretation, /professional guideline/);
  assert.match(results[2].interpretation, /population benchmark/);
  assert.ok(results.every((result) => result.limitations.some((item) => /not a guarantee/i.test(item))));
});

test("AGENT-211 stores owner-scoped results and exposes transparent calculations", () => {
  const engine = new SharedBenchmarkIntelligence(() => now);
  engine.register(benchmarkDefinition("personal.metric", "personal-historical-baseline"));
  const result = evaluate(engine, "personal.metric");
  evaluate(engine, "personal.metric", "owner-2");
  assert.equal(result.difference, 2);
  assert.equal(result.percentDifference, 20);
  assert.equal(engine.retrieve({ ownerId: "owner-1" }).length, 1);
  assert.equal(engine.retrieve({ ownerId: "owner-2" }).length, 1);
  const explanation = engine.explain("owner-1", result.id);
  assert.match(explanation.formula, /current value/);
  assert.throws(() => engine.explain("owner-2", result.id), /not found for this owner/);
});

test("Money Coach creates only data-supported personal, goal, and configured comparisons", () => {
  const benchmarks = buildMoneyCoachBenchmarks({
    current: {
      capturedAt: now,
      monthlyIncome: 6000,
      monthlyOutflow: 4500,
      projectedSurplus: 1500,
      currentCash: 5000,
      cashBuffer: 2500,
      totalDebt: 16000,
      utilization: 24,
      retirement: { balance: 40000 },
    },
    history: [{
      capturedAt: "2026-06-23T12:00:00.000Z",
      monthlyIncome: 6000,
      monthlyOutflow: 4800,
      projectedSurplus: 1200,
      currentCash: 4200,
      cashBuffer: 2500,
      totalDebt: 17500,
    }],
  }, "owner-1", now, [], {
    maximumDebtUtilization: 30,
    monthlyExpenseBudget: 4600,
    emergencyFundGoal: 9000,
    retirementBalanceGoal: 100000,
  });
  assert.ok(benchmarks.some((item) => /Savings rate/.test(item.benchmarkName)));
  assert.ok(benchmarks.some((item) => /utilization/.test(item.benchmarkName)));
  assert.ok(benchmarks.some((item) => /emergency-fund/.test(item.benchmarkName)));
  assert.ok(benchmarks.some((item) => /Retirement/.test(item.benchmarkName)));
  assert.ok(benchmarks.some((item) => /Debt payoff/.test(item.benchmarkName)));
  assert.ok(benchmarks.every((item) => ["personal-historical-baseline", "recent-trend-baseline", "goal-baseline", "configuration-threshold"].includes(item.benchmarkType)));
});

test("Money Coach does not fabricate population or professional benchmarks", () => {
  const benchmarks = buildMoneyCoachBenchmarks({
    current: {
      capturedAt: now,
      monthlyIncome: 0,
      monthlyOutflow: 0,
      projectedSurplus: 0,
      currentCash: 0,
      cashBuffer: 0,
      totalDebt: 0,
    },
    history: [],
  }, "owner-1", now);
  assert.deepEqual(benchmarks, []);
});

const moneyInput = {
  ownerId: "owner-1",
  userName: "Sean",
  asOfDate: new Date(now),
  activeBillCount: 1,
  billsDueSoonCount: 0,
  monthlyBills: 500,
  activeDebtCount: 1,
  totalDebt: 16000,
  projectedDebtReduction: 1500,
  debtProgressPercent: 8,
  monthlyIncome: 6000,
  monthlyOutflow: 4500,
  projectedSurplus: 1500,
  currentCash: 5000,
  cashBuffer: 2500,
  utilization: 24,
  fundingSourceCount: 0,
  safeFundingSourceCapacity: 0,
  assignedIncomePotCount: 1,
  totalObligationCount: 1,
  recommendationTitle: "Review the plan",
  recommendationAction: "Continue the current review.",
  recommendationWhy: "Current records support it.",
  recommendationHref: "/dashboard/money/dashboard",
  interestSaved: 0,
  timeSavedMonths: 0,
  observationHistory: [{
    capturedAt: "2026-06-23T12:00:00.000Z",
    monthlyIncome: 6000,
    monthlyOutflow: 4800,
    projectedSurplus: 1200,
    currentCash: 4200,
    cashBuffer: 2500,
    totalDebt: 17500,
  }],
};

test("Money Coach integrates benchmarks into natural responses with clear labels", () => {
  const model = buildMoneyCoachExperience(moneyInput);
  const response = answerMoneyCoachQuestion("How am I doing compared with my average?", model);
  assert.equal(response.intent, "benchmarks");
  assert.match(response.text, /Personal baseline:/);
  assert.match(response.text, /personal historical baseline|recent trend baseline/i);
  assert.match(response.text, /Confidence is (high|moderate|low)/i);
  assert.match(response.text, /not a guarantee/i);
});

test("Health and Guidance benchmark fixtures register without shared framework changes", () => {
  const engine = new SharedBenchmarkIntelligence(() => now);
  const healthMetrics = ["blood-pressure", "heart-rate", "weight", "sleep", "activity"];
  const guidanceMetrics = ["course-completion", "learning-consistency", "mastery", "retention"];
  healthMetrics.forEach((metric) => engine.register({
    ...benchmarkDefinition(`health.${metric}`, "personal-historical-baseline", "health-advisor", "health"),
    name: `${metric} personal baseline`,
  }));
  guidanceMetrics.forEach((metric) => engine.register({
    ...benchmarkDefinition(`guidance.${metric}`, "goal-baseline", "guidance-counselor", "education"),
    name: `${metric} goal baseline`,
  }));
  assert.equal(engine.listForSpecialist("health-advisor").length, 5);
  assert.equal(engine.listForSpecialist("guidance-counselor").length, 4);
});
