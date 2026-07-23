import {
  SharedTrustDataFreshnessEngine,
  type BenchmarkResult,
  type MemberUnderstandingReasoningItem,
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
    | "goal";
  href?: string;
  conversationPrompt: string;
  priority: number;
};

export type MorningFinancialBriefing = {
  id: string;
  ownerId: string;
  generatedAt: string;
  since: string;
  summary: string;
  items: readonly MorningFinancialBriefingItem[];
  recommendedFocus: {
    title: string;
    detail: string;
    href: string;
    conversationPrompt: string;
  };
  freshness: {
    label: string;
    confidenceNote: string;
  };
  sourcesConsulted: readonly (
    | "observation-intelligence"
    | "professional-journal"
    | "member-understanding"
    | "current-records"
    | "benchmark-intelligence"
    | "trust-and-freshness"
    | "goals"
  )[];
};

export type BuildMorningFinancialBriefingInput = {
  ownerId: string;
  asOf: string;
  since: string;
  observations: readonly Observation[];
  benchmarks: readonly BenchmarkResult[];
  journalEntries?: readonly ProfessionalJournalReasoningItem[];
  memberUnderstanding?: readonly MemberUnderstandingReasoningItem[];
  currentGoals?: readonly {
    id: string;
    title: string;
    status?: string;
    targetDate?: string;
    updatedAt?: string;
  }[];
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
    conversationPrompt?: string;
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

function conversationalPrompt(title: string, detail: string) {
  return `Help me understand this update: ${title}. ${detail}`;
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
        conversationPrompt: conversationalPrompt(
          observation.presentation.title,
          observation.presentation.summary
        ),
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
        conversationPrompt: `Walk me through the ${payment.name} payment that posted and what it changes in my plan.`,
        priority: payment.kind === "debt" ? 88 : 76,
      })
    );
  const recentJournalResources = new Set(
    (input.journalEntries || [])
      .filter((entry) => after(entry.timestamp, input.since, input.asOf))
      .flatMap((entry) => entry.relatedResources.map((resource) => resource.toLowerCase()))
  );
  const benchmarkItems = input.benchmarks
    .filter((benchmark) => after(benchmark.evaluatedAt, input.since, input.asOf))
    .slice(0, 2)
    .map(
    (benchmark): MorningFinancialBriefingItem => ({
      id: `benchmark:${benchmark.id}`,
      title: benchmark.benchmarkName,
      detail: benchmark.interpretation,
      source: "benchmark",
      conversationPrompt: `Explain how my ${benchmark.benchmarkName.toLowerCase()} compares with its benchmark and what I should take from it.`,
      priority:
        (benchmark.confidence === "high" ? 68 : 50) +
        (recentJournalResources.has((benchmark.domain || "").toLowerCase()) ? 4 : 0),
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
          conversationPrompt: "Which upcoming bills deserve my attention first, and why?",
          priority: 70,
        },
      ]
    : [];
  const upcomingGoal = (input.currentGoals || [])
    .filter((goal) => !["Completed", "Archived"].includes(goal.status || ""))
    .filter((goal) => {
      if (!goal.targetDate) return false;
      const remaining = Date.parse(goal.targetDate) - Date.parse(input.asOf);
      return remaining >= 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
    })
    .sort((left, right) => Date.parse(left.targetDate || "") - Date.parse(right.targetDate || ""))[0];
  const goalItems: MorningFinancialBriefingItem[] = upcomingGoal
    ? [{
        id: `goal:${upcomingGoal.id}`,
        title: `${upcomingGoal.title} is coming up`,
        detail: `The current target date is ${new Date(upcomingGoal.targetDate || "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
        source: "goal",
        href: "/dashboard/goals",
        conversationPrompt: `Review my ${upcomingGoal.title} goal and the most useful next step.`,
        priority: 66,
      }]
    : [];

  const candidates = [
    ...paymentItems,
    ...observationItems,
    ...benchmarkItems,
    ...upcomingItem,
    ...goalItems,
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
    summary: items.length
      ? `I found ${items.length} meaningful update${items.length === 1 ? "" : "s"} since your last review.`
      : "I did not find a material financial change since your last review.",
    items,
    recommendedFocus: {
      ...input.recommendedFocus,
      conversationPrompt:
        input.recommendedFocus.conversationPrompt ||
        `Help me review today’s recommended focus: ${input.recommendedFocus.title}.`,
    },
    freshness: {
      label: trust.overallFreshness,
      confidenceNote:
        trust.sources[0]?.confidenceImpact ||
        "Freshness could not be established.",
    },
    sourcesConsulted: [
      "observation-intelligence",
      ...(input.journalEntries?.length ? ["professional-journal" as const] : []),
      ...(input.memberUnderstanding?.length ? ["member-understanding" as const] : []),
      "current-records",
      "benchmark-intelligence",
      "trust-and-freshness",
      ...(input.currentGoals?.length ? ["goals" as const] : []),
    ],
  };
}
