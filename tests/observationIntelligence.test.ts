import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  calculateObservationPriority,
  createObservationEvidenceSignature,
  createObservationFingerprint,
  SharedObservationIntelligence,
  type ObservationDetectionContext,
  type ObservationDetector,
  type ObservationDraft,
} from "../src/lib/platform/agents";
import {
  buildMoneyCoachObservations,
  createMoneyCoachObservationIntelligence,
  type MoneyObservationData,
} from "../src/lib/moneyCoachObservations";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
} from "../src/lib/moneyCoachExperience";

const now = "2026-07-23T12:00:00.000Z";

function genericDraft(value: number, materiallyChanged = false): ObservationDraft {
  const evidence = [{
    id: "metric",
    kind: "fact" as const,
    label: "Current personal metric",
    value,
    source: "member.module",
    observedAt: now,
  }];
  const ranked = calculateObservationPriority({
    urgency: 70,
    materiality: 80,
    memberRelevance: 90,
    actionability: 70,
    confidence: 0.9,
  });
  return {
    fingerprint: createObservationFingerprint(["specialist", "metric", "change"]),
    evidenceSignature: createObservationEvidenceSignature(evidence),
    domain: "example",
    category: "Progress",
    type: "Change",
    time: { observedAt: now, periodLabel: "Personal review" },
    evidence,
    provenance: {
      ruleId: "example.metric-change",
      ruleDescription: "Compare the current member metric with its personal baseline.",
      sourceSystems: ["member.module"],
      supportingRecordIds: [],
      retrievedAt: now,
      freshness: "current",
      limitations: ["No external benchmark was used."],
    },
    assessment: {
      ...ranked,
      severity: "informational",
      confidence: 0.9,
      urgency: 70,
      materiality: 80,
      memberRelevance: 90,
      actionability: 70,
    },
    presentation: {
      title: "Personal metric changed",
      summary: "The member's current metric differs from the prior value.",
      detail: "This is an evidence-backed observation.",
      whyNoticed: "The personal-change rule matched.",
      whatChanged: `The metric is now ${value}.`,
      whyItMayMatter: "The direction may be relevant to the member's goal.",
    },
    relatedEntityIds: [],
    materiallyChanged,
  };
}

function detector(value: () => number, materiallyChanged = () => false): ObservationDetector<{}> {
  return {
    id: "specialist.metric-detector",
    specialistId: "specialist",
    domain: "example",
    supportedTypes: ["Change"],
    detect: () => ({ observations: [genericDraft(value(), materiallyChanged())] }),
  };
}

function analyze(engine: SharedObservationIntelligence, ownerId = "owner-1") {
  return engine.analyze({
    ownerId,
    specialistId: "specialist",
    asOf: now,
    data: {},
    authorizedDomains: ["example"],
  });
}

test("AGENT-210 exposes observation intelligence through the shared platform", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.observations instanceof SharedObservationIntelligence);
});

test("AGENT-210 requires evidence, provenance, and facts rather than hidden reasoning", () => {
  const engine = new SharedObservationIntelligence(undefined, () => now);
  const invalid = detector(() => 10);
  invalid.detect = () => ({ observations: [{ ...genericDraft(10), evidence: [] }] });
  engine.registerDetector(invalid);
  assert.throws(() => analyze(engine), /structured evidence/);
});

test("AGENT-210 ranks deterministically with stable tie breaking", () => {
  const engine = new SharedObservationIntelligence(undefined, () => now);
  const first = genericDraft(1);
  const second = { ...genericDraft(2), fingerprint: "a-second", id: "second" };
  const third = { ...genericDraft(3), fingerprint: "z-third", id: "third", assessment: { ...genericDraft(3).assessment, priorityScore: 99 } };
  const registration: ObservationDetector<{}> = {
    id: "specialist.ranking",
    specialistId: "specialist",
    domain: "example",
    supportedTypes: ["Change"],
    detect: () => ({ observations: [first, second, third] }),
  };
  engine.registerDetector(registration);
  const ranked = analyze(engine);
  assert.equal(ranked[0].fingerprint, "z-third");
  assert.equal(ranked[1].fingerprint, "a-second");
});

test("AGENT-210 deduplicates unchanged evidence and explains facts separately", () => {
  const engine = new SharedObservationIntelligence(undefined, () => now);
  engine.registerDetector(detector(() => 10));
  const first = analyze(engine)[0];
  const second = analyze(engine)[0];
  assert.equal(first.id, second.id);
  assert.equal(second.revision, 1);
  assert.equal(engine.retrieve({ ownerId: "owner-1" }).length, 1);
  const explanation = engine.explain("owner-1", first.id);
  assert.equal(explanation.facts.length, 1);
  assert.equal(explanation.inferences.length, 0);
  assert.match(explanation.rule, /personal baseline/);
});

test("AGENT-210 preserves dismissals until evidence changes materially", () => {
  let value = 10;
  let material = false;
  const engine = new SharedObservationIntelligence(undefined, () => now);
  engine.registerDetector(detector(() => value, () => material));
  const observation = analyze(engine)[0];
  engine.dismiss("owner-1", observation.id, "owner-1");
  assert.equal(analyze(engine).length, 0);
  value = 20;
  assert.equal(analyze(engine).length, 0);
  material = true;
  const reopened = analyze(engine)[0];
  assert.equal(reopened.status, "Active");
  assert.equal(reopened.revision, 3);
});

test("AGENT-210 supports acknowledgement, resolution, filtering, and owner isolation", () => {
  const engine = new SharedObservationIntelligence(undefined, () => now);
  engine.registerDetector(detector(() => 10));
  const ownerOne = analyze(engine, "owner-1")[0];
  analyze(engine, "owner-2");
  engine.acknowledge("owner-1", ownerOne.id);
  assert.equal(engine.retrieve({ ownerId: "owner-1", statuses: ["Acknowledged"] }).length, 1);
  engine.resolve("owner-1", ownerOne.id);
  assert.equal(engine.retrieve({ ownerId: "owner-1", statuses: ["Resolved"] }).length, 1);
  assert.equal(engine.retrieve({ ownerId: "owner-2" }).length, 1);
  assert.throws(() => engine.explain("owner-3", ownerOne.id), /not found for this owner/);
});

test("AGENT-210 detectors only receive explicitly authorized domains", () => {
  const engine = new SharedObservationIntelligence(undefined, () => now);
  engine.registerDetector(detector(() => 10));
  const result = engine.analyze({
    ownerId: "owner-1",
    specialistId: "specialist",
    asOf: now,
    data: {},
    authorizedDomains: [],
  });
  assert.deepEqual(result, []);
});

test("Money Coach uses personal financial history for change and trend observations", () => {
  const data: MoneyObservationData = {
    current: { capturedAt: now, monthlyIncome: 6000, monthlyOutflow: 4700, projectedSurplus: 1300, currentCash: 4000, cashBuffer: 2500, totalDebt: 17000 },
    history: [
      { capturedAt: "2026-06-23T12:00:00.000Z", monthlyIncome: 6000, monthlyOutflow: 4300, projectedSurplus: 1700, currentCash: 4500, cashBuffer: 2500, totalDebt: 18000 },
      { capturedAt: "2026-05-23T12:00:00.000Z", monthlyIncome: 6000, monthlyOutflow: 4000, projectedSurplus: 2000, currentCash: 4600, cashBuffer: 2500, totalDebt: 19000 },
    ],
  };
  const observations = buildMoneyCoachObservations(data, "owner-1", now);
  assert.ok(observations.some((item) => item.type === "Trend" && /declined/.test(item.presentation.title)));
  assert.ok(observations.some((item) => item.type === "Improvement" && /debt.*decreased/i.test(item.presentation.title)));
  assert.ok(observations.every((item) => item.provenance.sourceSystems.every((source) => source.startsWith("beastmoney."))));
});

test("Money Coach detects only supported missing and inconsistent records", () => {
  const engine = createMoneyCoachObservationIntelligence();
  const observations = engine.analyze({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    asOf: now,
    authorizedDomains: ["money"],
    data: {
      current: {
        capturedAt: now,
        monthlyIncome: 5000,
        monthlyOutflow: 3000,
        projectedSurplus: 2000,
        currentCash: 5000,
        cashBuffer: 2000,
        totalDebt: 1000,
        bills: [
          { id: "bill-1", name: "Electric", amount: 100, dueDate: "2026-07-25" },
          { id: "bill-2", name: " electric ", amount: 100, dueDate: "2026-08-25", incomePot: "July pay" },
        ],
        debts: [{ id: "debt-1", name: "Card", balance: 1000, minimumPayment: 0, interestRate: 0 }],
        velocity: { assumptionsCurrent: false },
        retirement: { balance: 1000 },
      },
      history: [],
    },
  });
  assert.ok(observations.some((item) => item.type === "Missing information" && /Income Pot/.test(item.presentation.title)));
  assert.ok(observations.some((item) => item.type === "Inconsistency" && /duplicate/i.test(item.presentation.title)));
  assert.ok(observations.some((item) => item.category === "Velocity"));
  assert.ok(observations.some((item) => item.category === "Retirement"));
  assert.ok(observations.every((item) => item.presentation.action?.status === "prepared"));
});

test("Money Coach does not invent observations when required source history is absent", () => {
  const observations = buildMoneyCoachObservations({
    current: { capturedAt: now, monthlyIncome: 6000, monthlyOutflow: 4000, projectedSurplus: 2000, currentCash: 5000, cashBuffer: 2500, totalDebt: 18000 },
    history: [],
  }, "owner-1", now);
  assert.deepEqual(observations, []);
});

const moneyInput = {
  ownerId: "owner-1",
  userName: "Sean",
  asOfDate: new Date(now),
  activeBillCount: 1,
  billsDueSoonCount: 1,
  monthlyBills: 100,
  activeDebtCount: 1,
  totalDebt: 17000,
  projectedDebtReduction: 1000,
  debtProgressPercent: 5,
  monthlyIncome: 6000,
  monthlyOutflow: 4700,
  projectedSurplus: 1300,
  currentCash: 4000,
  cashBuffer: 2500,
  utilization: 20,
  fundingSourceCount: 0,
  safeFundingSourceCapacity: 0,
  assignedIncomePotCount: 1,
  totalObligationCount: 1,
  recommendationTitle: "Review cash flow",
  recommendationAction: "Review the current cash plan.",
  recommendationWhy: "Current records support the review.",
  recommendationHref: "/dashboard/money/cashflow",
  interestSaved: 0,
  timeSavedMonths: 0,
  billsDueSoon: [{ id: "bill-1", name: "Electric", amount: 100, dueDate: "Jul 25", incomePot: "July pay" }],
  observationHistory: [
    { capturedAt: "2026-06-23T12:00:00.000Z", monthlyIncome: 6000, monthlyOutflow: 4300, projectedSurplus: 1700, currentCash: 4500, cashBuffer: 2500, totalDebt: 18000 },
  ],
};

test("Money Coach uses observations as reasoning input without returning canned alert text", () => {
  const model = buildMoneyCoachExperience(moneyInput);
  assert.ok(model.observations.length > 0);
  const answer = answerMoneyCoachQuestion("What changed since last time?", model);
  assert.match(answer.text, /Why I noticed:/);
  assert.match(answer.text, /prior snapshot|personal-change threshold/i);
  assert.match(answer.text, /Confidence is (high|moderate|low)/i);
  assert.equal(answer.toolAction?.status, "prepared");
});

test("future specialists can register distinct education and health detectors without framework changes", () => {
  const makeFutureDetector = (id: string, specialistId: string, domain: string, label: string): ObservationDetector<{ value: number }> => ({
    id,
    specialistId,
    domain,
    supportedTypes: ["Milestone"],
    detect: (context: ObservationDetectionContext<{ value: number }>) => ({
      observations: [{ ...genericDraft(context.data.value), domain, category: label, fingerprint: `${specialistId}:${domain}:milestone`, presentation: { ...genericDraft(context.data.value).presentation, title: `${label} milestone` } }],
    }),
  });
  const engine = new SharedObservationIntelligence(undefined, () => now);
  engine.registerDetector(makeFutureDetector("education.progress", "guidance-counselor", "education", "Learning"));
  engine.registerDetector(makeFutureDetector("health.progress", "health-advisor", "health", "Health"));
  const education = engine.analyze({ ownerId: "owner-1", specialistId: "guidance-counselor", asOf: now, data: { value: 1 }, authorizedDomains: ["education"] });
  const health = engine.analyze({ ownerId: "owner-1", specialistId: "health-advisor", asOf: now, data: { value: 1 }, authorizedDomains: ["health"] });
  assert.equal(education[0].presentation.title, "Learning milestone");
  assert.equal(health[0].presentation.title, "Health milestone");
});
