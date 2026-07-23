import {
  SharedTrustDataFreshnessEngine,
  type BenchmarkResult,
  type Observation,
  type ProfessionalJournalReasoningItem,
} from "./platform/agents";

export type MorningFinancialBriefingItem = {
  id: string;
  title: string;
  detail: string;
  source:
    | "current-data"
    | "observation"
    | "benchmark"
    | "professional-journal";
  href?: string;
  priority: number;
};

export type MorningFinancialBriefing = {
  id: string;
  ownerId: string;
  generatedAt: string;
  since: string;
  greeting: string;
  summary: string;
  items: readonly MorningFinancialBriefingItem[];
  recommendedFocus: {
    title: string;
    detail: string;
    href: string;
  };
  freshness: {
    label: string;
    confidenceNote: string;
  };
};

export type BuildMorningFinancialBriefingInput = {
  ownerId: string;
  asOf: string;
  since: string;
  observations: readonly Observation[];
  benchmarks: readonly BenchmarkResult[];
  journalEntries?: readonly ProfessionalJournalReasoningItem[];
  recentPayments?: readonly {
    id: string;
    name: string;
    amount: number;
    date: string;
    kind: "bill" | "debt";
  }[];
  upcomingBills?: readonly {
    id: string;
    name: string;
    amount: number;
    dueDate: string;
  }[];
  recommendedFocus: {
    title: string;
    detail: string;
    href: string;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function after(value: string, since: string, asOf: string) {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp >= Date.parse(since) &&
    timestamp <= Date.parse(asOf)
  );
}

function timeGreeting(asOf: string) {
  const hour = new Date(asOf).getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function buildMorningFinancialBriefing(
  input: BuildMorningFinancialBriefingInput
): MorningFinancialBriefing {
  const observationItems = input.observations
    .filter((observation) =>
      after(observation.time.observedAt, input.since, input.asOf)
    )
    .map(
      (observation): MorningFinancialBriefingItem => ({
        id: `observation:${observation.id}`,
        title: observation.presentation.title,
        detail: observation.presentation.summary,
        source: "observation",
        href:
          observation.presentation.workspaceTarget ||
          observation.presentation.action?.target,
        priority: observation.assessment.priorityScore,
      })
    );
  const paymentItems = (input.recentPayments || [])
    .filter((payment) => after(payment.date, input.since, input.asOf))
    .map(
      (payment): MorningFinancialBriefingItem => ({
        id: `payment:${payment.id}`,
        title: `${payment.name} payment posted`,
        detail: `${money(payment.amount)} was recorded toward this ${payment.kind}.`,
        source: "current-data",
        href:
          payment.kind === "debt"
            ? "/dashboard/money/debts"
            : "/dashboard/money/cashflow#bills",
        priority: payment.kind === "debt" ? 88 : 76,
      })
    );
  const journalItems = (input.journalEntries || [])
    .filter((entry) => after(entry.timestamp, input.since, input.asOf))
    .map(
      (entry): MorningFinancialBriefingItem => ({
        id: `journal:${entry.entryId}`,
        title: entry.observation,
        detail: entry.interpretation,
        source: "professional-journal",
        priority: entry.confidence === "high" ? 72 : 55,
      })
    );
  const benchmarkItems = input.benchmarks.slice(0, 2).map(
    (benchmark): MorningFinancialBriefingItem => ({
      id: `benchmark:${benchmark.id}`,
      title: benchmark.benchmarkName,
      detail: benchmark.interpretation,
      source: "benchmark",
      priority: benchmark.confidence === "high" ? 68 : 50,
    })
  );
  const upcoming = input.upcomingBills || [];
  const upcomingItem: MorningFinancialBriefingItem[] = upcoming.length
    ? [
        {
          id: "current-data:upcoming-bills",
          title: `${upcoming.length} bill${upcoming.length === 1 ? "" : "s"} become due soon`,
          detail: upcoming
            .slice(0, 2)
            .map((bill) => `${bill.name} (${money(bill.amount)})`)
            .join(" · "),
          source: "current-data",
          href: "/dashboard/money/cashflow#bills",
          priority: 70,
        },
      ]
    : [];

  const candidates = [
    ...paymentItems,
    ...observationItems,
    ...journalItems,
    ...benchmarkItems,
    ...upcomingItem,
  ];
  const items = candidates
    .filter(
      (item, index) =>
        candidates.findIndex(
          (candidate) =>
            candidate.title.toLowerCase() === item.title.toLowerCase()
        ) === index
    )
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 4);

  const latestRetrievedAt = input.observations
    .map((observation) => observation.provenance.retrievedAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort()
    .at(-1);
  const trust = new SharedTrustDataFreshnessEngine().assess({
    ownerId: input.ownerId,
    specialistId: "beastmoney.money-coach",
    asOf: input.asOf,
    sources: [
      {
        id: "beastmoney-current-records",
        ownerId: input.ownerId,
        specialistId: "beastmoney.money-coach",
        source: "beastmoney",
        label: "Current BeastMoney records",
        recordType: "financial-records",
        lastSynchronizedAt: latestRetrievedAt || input.asOf,
        lastSuccessfulSynchronizationAt: latestRetrievedAt || input.asOf,
        expectedRefreshMinutes: 1440,
        health: "healthy",
      },
    ],
  });

  return {
    id: `morning-briefing:${input.ownerId}:${input.asOf.slice(0, 10)}`,
    ownerId: input.ownerId,
    generatedAt: input.asOf,
    since: input.since,
    greeting: timeGreeting(input.asOf),
    summary: items.length
      ? `I found ${items.length} meaningful update${items.length === 1 ? "" : "s"} since your last review.`
      : "I did not find a material financial change since your last review.",
    items,
    recommendedFocus: input.recommendedFocus,
    freshness: {
      label: trust.overallFreshness,
      confidenceNote:
        trust.sources[0]?.confidenceImpact ||
        "Freshness could not be established.",
    },
  };
}
