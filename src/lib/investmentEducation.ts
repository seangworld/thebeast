import type { InvestmentAccount, InvestmentHolding } from "./investments";

export const INVESTMENT_EDUCATION_TOPIC_IDS = [
  "tsp",
  "dividends",
  "performance",
  "risk_profile",
] as const;

export type InvestmentEducationTopicId = (typeof INVESTMENT_EDUCATION_TOPIC_IDS)[number];

export type InvestmentEducationSource = {
  label: string;
  url: string;
  reviewedOn: string;
};

export type InvestmentEducationTopic = {
  id: InvestmentEducationTopicId;
  title: string;
  summary: string;
  keyPoints: string[];
  reflectionPrompts: string[];
  officialSources: InvestmentEducationSource[];
};

export const INVESTMENT_EDUCATION_TOPICS: InvestmentEducationTopic[] = [
  {
    id: "tsp",
    title: "Thrift Savings Plan basics",
    summary:
      "The TSP is a retirement plan with individual fund and Lifecycle Fund options. Learn the plan structure, then confirm current details with the official TSP before making a decision.",
    keyPoints: [
      "Individual funds represent different investment categories and levels of market exposure.",
      "Lifecycle Funds combine the TSP individual funds and adjust their target allocations over time.",
      "Eligibility, contribution rules, fund details, fees, and withdrawal rules can change and belong to the official TSP.",
    ],
    reflectionPrompts: [
      "Which TSP materials do you need to review for your situation?",
      "When do you expect to need this retirement money?",
      "Which plan fees, restrictions, and risks have you confirmed at tsp.gov?",
    ],
    officialSources: [
      { label: "TSP individual funds", url: "https://www.tsp.gov/funds-individual/", reviewedOn: "2026-07-18" },
      { label: "TSP Lifecycle Funds", url: "https://www.tsp.gov/funds-lifecycle/", reviewedOn: "2026-07-18" },
    ],
  },
  {
    id: "dividends",
    title: "Dividends and distributions",
    summary:
      "A dividend is a distribution to shareholders. A payment can be received as cash or reinvested when a plan supports it, and future payments are never guaranteed by a past payment.",
    keyPoints: [
      "Record the payment date and gross amount separately from changes in market value.",
      "Reinvested dividends buy additional shares; they are not the same as new owner contributions.",
      "Taxes, fees, eligibility dates, and plan rules require separate review.",
    ],
    reflectionPrompts: [
      "Was this payment received as cash, reinvested, or not yet confirmed?",
      "Does the source statement identify fees or tax information that should be retained?",
      "Are you treating a past payment as a record rather than a promise of future income?",
    ],
    officialSources: [
      { label: "Investor.gov dividend glossary", url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/dividend", reviewedOn: "2026-07-18" },
      { label: "Investor.gov direct investing", url: "https://www.investor.gov/introduction-investing/getting-started/investing-your-own/direct-investing", reviewedOn: "2026-07-18" },
    ],
  },
  {
    id: "performance",
    title: "Understanding observed performance",
    summary:
      "Observed change compares recorded values for a completed period. The result depends on the calculation method, cash-flow timing, fees, taxes, and data quality, and does not predict future results.",
    keyPoints: [
      "Separate contributions and withdrawals from investment gain or loss.",
      "A simple period change is not a time-weighted or money-weighted return.",
      "Fees and expenses reduce returns and should be reviewed alongside any performance figure.",
    ],
    reflectionPrompts: [
      "Are the beginning value, ending value, and external cash flows from the same period?",
      "Which fees, taxes, or timing effects are not represented?",
      "Is this result clearly labeled as historical rather than forecast?",
    ],
    officialSources: [
      { label: "Investor.gov performance claims bulletin", url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47", reviewedOn: "2026-07-18" },
      { label: "Investor.gov fees and expenses bulletin", url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated", reviewedOn: "2026-07-18" },
    ],
  },
  {
    id: "risk_profile",
    title: "Risk profile reflection",
    summary:
      "Risk reflection keeps time horizon, willingness to accept loss, financial capacity for loss, and liquidity needs visible as separate factors instead of turning them into an allocation recommendation.",
    keyPoints: [
      "Willingness to accept loss and financial capacity for loss are different questions.",
      "Time horizon and near-term liquidity needs can affect how investment risk feels in practice.",
      "A self-reflection answer is educational context, not a professional assessment or risk score.",
    ],
    reflectionPrompts: [
      "When might you need access to this money?",
      "How would a substantial decline affect essential goals or obligations?",
      "How comfortable are you with changes in value, independent of your capacity to absorb them?",
    ],
    officialSources: [
      { label: "Investor.gov risk tolerance glossary", url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/risk-tolerance", reviewedOn: "2026-07-18" },
      { label: "Investor.gov investing on your own", url: "https://www.investor.gov/introduction-investing/getting-started/investing-your-own", reviewedOn: "2026-07-18" },
    ],
  },
];

export type InvestmentDividendRecord = {
  id: string;
  accountId: string;
  holdingId?: string;
  paidOn: string;
  grossAmount: number;
  disposition: "cash" | "reinvested" | "unknown";
  source: "owner_entered";
};

export type ObservedPerformanceInput = {
  periodStart: string;
  periodEnd: string;
  beginningValue: number;
  endingValue: number;
  contributions: number;
  withdrawals: number;
  reportedFees?: number;
};

export type ObservedPerformanceSummary = {
  method: "simple_period_change";
  netExternalFlows: number;
  observedChangeExcludingExternalFlows: number;
  simpleChangePercent: number | null;
  reportedFees: number | null;
  caveats: string[];
};

export type RiskReflectionAnswer = "low" | "medium" | "high" | "unknown";

export type InvestmentRiskReflection = {
  timeHorizon: "short" | "medium" | "long" | "unknown";
  lossWillingness: RiskReflectionAnswer;
  lossCapacity: RiskReflectionAnswer;
  liquidityNeed: RiskReflectionAnswer;
};

export type InvestmentRiskReflectionSummary = {
  factors: Array<{ id: keyof InvestmentRiskReflection; response: string }>;
  profileLabel: null;
  score: null;
  allocationRecommendation: null;
  boundary: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  return DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function nonNegativeFinite(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function listInvestmentEducationTopics(): InvestmentEducationTopic[] {
  return INVESTMENT_EDUCATION_TOPICS.map((topic) => ({
    ...topic,
    keyPoints: [...topic.keyPoints],
    reflectionPrompts: [...topic.reflectionPrompts],
    officialSources: topic.officialSources.map((source) => ({ ...source })),
  }));
}

export function validateDividendRecords(input: {
  accounts: InvestmentAccount[];
  holdings: InvestmentHolding[];
  dividends: InvestmentDividendRecord[];
}): string[] {
  const errors: string[] = [];
  const accountIds = new Set(input.accounts.map(({ id }) => id));
  const holdingsById = new Map(input.holdings.map((holding) => [holding.id, holding]));
  const seen = new Set<string>();

  for (const dividend of input.dividends) {
    if (!dividend.id.trim()) errors.push("Dividend records require an id.");
    if (seen.has(dividend.id)) errors.push(`Duplicate dividend record id: ${dividend.id}.`);
    seen.add(dividend.id);
    if (!accountIds.has(dividend.accountId)) errors.push(`Dividend ${dividend.id} references missing account ${dividend.accountId}.`);
    if (dividend.holdingId) {
      const holding = holdingsById.get(dividend.holdingId);
      if (!holding) errors.push(`Dividend ${dividend.id} references missing holding ${dividend.holdingId}.`);
      else if (holding.accountId !== dividend.accountId) errors.push(`Dividend ${dividend.id} holding does not belong to account ${dividend.accountId}.`);
    }
    if (!validDate(dividend.paidOn)) errors.push(`Dividend ${dividend.id} has invalid payment date ${dividend.paidOn}.`);
    if (!Number.isFinite(dividend.grossAmount) || dividend.grossAmount <= 0) errors.push(`Dividend ${dividend.id} requires a positive finite gross amount.`);
    if (dividend.source !== "owner_entered") errors.push(`Dividend ${dividend.id} must be owner-entered.`);
  }

  return errors;
}

export function organizeDividendRecords(input: {
  accounts: InvestmentAccount[];
  holdings: InvestmentHolding[];
  dividends: InvestmentDividendRecord[];
}): InvestmentDividendRecord[] {
  const errors = validateDividendRecords(input);
  if (errors.length) throw new Error(errors.join(" "));
  return input.dividends
    .map((dividend) => ({ ...dividend }))
    .sort((left, right) => right.paidOn.localeCompare(left.paidOn) || left.id.localeCompare(right.id));
}

export function summarizeObservedPerformance(input: ObservedPerformanceInput): ObservedPerformanceSummary {
  if (!validDate(input.periodStart) || !validDate(input.periodEnd) || input.periodEnd < input.periodStart) {
    throw new Error("Observed performance requires a valid period in chronological order.");
  }
  for (const [label, value] of Object.entries({
    beginningValue: input.beginningValue,
    endingValue: input.endingValue,
    contributions: input.contributions,
    withdrawals: input.withdrawals,
    reportedFees: input.reportedFees ?? 0,
  })) {
    if (!nonNegativeFinite(value)) throw new Error(`Observed performance ${label} must be a non-negative finite amount.`);
  }

  const netExternalFlows = input.contributions - input.withdrawals;
  const observedChangeExcludingExternalFlows = input.endingValue - input.beginningValue - netExternalFlows;
  return {
    method: "simple_period_change",
    netExternalFlows,
    observedChangeExcludingExternalFlows,
    simpleChangePercent: input.beginningValue === 0 ? null : (observedChangeExcludingExternalFlows / input.beginningValue) * 100,
    reportedFees: input.reportedFees ?? null,
    caveats: [
      "This simple period change is not a time-weighted or money-weighted return.",
      "Cash-flow timing, taxes, unreported fees, and data quality can change the interpretation.",
      "Past performance does not predict future results.",
    ],
  };
}

export function summarizeRiskReflection(input: InvestmentRiskReflection): InvestmentRiskReflectionSummary {
  return {
    factors: [
      { id: "timeHorizon", response: input.timeHorizon },
      { id: "lossWillingness", response: input.lossWillingness },
      { id: "lossCapacity", response: input.lossCapacity },
      { id: "liquidityNeed", response: input.liquidityNeed },
    ],
    profileLabel: null,
    score: null,
    allocationRecommendation: null,
    boundary: "This reflection preserves owner-entered factors for education. It does not assess suitability, score risk, recommend an allocation, or provide investment advice.",
  };
}

export const INVESTMENT_EDUCATION_BOUNDARY =
  "BeastMoney provides provider-neutral education and owner-entered records only. It does not evaluate, recommend, rank, monetize, or integrate financial providers; recommend securities or allocations; forecast returns or dividends; or provide investment, tax, legal, or financial advice.";
