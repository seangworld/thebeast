import { formatCurrency } from "./formatters";
import {
  calculateInsightPriority,
  classifyDomainResponseIntent,
  composeRoleDefinedResponse,
  prepareRoleDefinedExecution,
  recognizeConversationIntent,
  specialistProfessionalIdentityProfiles,
  sharedAgentActionTools,
  specialistAgentPlanningPolicies,
  specialistKnowledgeSourcePolicies,
  type ConversationResponseSection,
  type DomainIntentCandidate,
  type DomainIntentRoute,
  type DomainResponseIntent,
  type Insight,
  type InsightAction,
  type InsightPriorityFactor,
  type Observation,
  type BenchmarkResult,
  createDefaultConversationStarterEngine,
  type AgentConversationThread,
  type ProfessionalJournalReasoningItem,
  type MemberUnderstandingReasoningItem,
  type StarterCandidate,
  type UpcomingStarterEvent,
  type ConversationStarterKind,
  type ProfessionalBehaviorProfile,
  type ProfessionalIdentityProfile,
  type ProfessionalResponseExecution,
  type StructuredAgentAction,
  SharedAgentPlanningEngine,
  specialistRoleDefinitions,
  type RoleDefinedExecution,
  type SpecialistRoleDefinition,
} from "./platform/agents";
import {
  buildMoneyCoachObservations,
  type MoneyObservationData,
  type MoneyObservationSnapshot,
} from "./moneyCoachObservations";
import {
  buildMoneyCoachBenchmarks,
  type MoneyBenchmarkConfiguration,
} from "./moneyCoachBenchmarks";
import {
  buildMorningFinancialBriefing,
  type MorningFinancialBriefing,
} from "./moneyMorningBriefing";
import type { FinancialHealthScoreResult } from "./financialHealthScore";

export type MoneyCoachExperienceCard = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  explainWhy: string;
  href: string;
  insight: Insight;
};

export type MoneyCoachExperienceSuggestion = {
  id: string;
  label: string;
  category?: ConversationStarterKind | "ask-anything";
  group?: string;
  href?: string;
  intent?: "ask";
  action?: InsightAction;
  prompt?: string;
};

export type MoneyCoachExperienceModel = {
  ownerId: string;
  greeting: string;
  introduction: string;
  conversationOpening: string;
  summary: string[];
  importantItems: string[];
  wins: string[];
  potentialIssues: string[];
  opportunities: string[];
  cards: MoneyCoachExperienceCard[];
  suggestions: MoneyCoachExperienceSuggestion[];
  primaryRecommendation: {
    title: string;
    action: string;
    explainWhy: string;
    href: string;
  };
  insights: Insight[];
  observations: Observation[];
  benchmarks: BenchmarkResult[];
  morningBriefing: MorningFinancialBriefing;
  behavior: ProfessionalBehaviorProfile;
  professional: ProfessionalIdentityProfile;
  roleDefinition: SpecialistRoleDefinition;
  safetyNotice: string;
  userFirstName: string;
  financialContext: {
    currentCash: number;
    cashBuffer: number;
    projectedSurplus: number;
    monthlyIncome: number;
    monthlyOutflow: number;
    billsDueSoon: readonly { name: string; amount: number; dueDate: string; status?: string; incomePot?: string }[];
    upcomingIncome: readonly { name: string; amount: number; date?: string }[];
    debts: readonly { name: string; balance: number; minimumPayment: number; interestRate: number; minimumPaymentKnown?: boolean; interestRateKnown?: boolean }[];
    fundingSources: readonly { name: string; type: string; available: number }[];
    paymentConfigurations: readonly {
      obligationName: string;
      paymentAccountName?: string;
      fundingAccountName?: string;
      strategyLabel: string;
      strategyId: string;
      complete: boolean;
      reviewMessages: readonly string[];
      explanation: string;
    }[];
    helocReserve: number;
    activeDebtStrategy: "avalanche" | "snowball" | "velocity" | "custom";
    strategyScenarios: readonly { id: string; label: string; monthsToPayoff: number; totalInterest: number; monthlyCashStrain: number; riskLevel: string; debtFreeDate: string }[];
    forecast: readonly { label: string; cash: number; debt: number; cashShortages: number }[];
    incomePotAssignedCount: number;
    totalObligationCount: number;
    retirementDataAvailable: boolean;
    financialHealth?: FinancialHealthScoreResult;
  };
};

export type MoneyCoachExperienceInput = {
  ownerId: string;
  userName: string;
  asOfDate: Date;
  activeBillCount: number;
  billsDueSoonCount: number;
  monthlyBills: number;
  activeDebtCount: number;
  totalDebt: number;
  projectedDebtReduction: number;
  debtProgressPercent: number;
  monthlyIncome: number;
  monthlyOutflow: number;
  projectedSurplus: number;
  currentCash: number;
  cashBuffer: number;
  utilization: number;
  fundingSourceCount: number;
  safeFundingSourceCapacity: number;
  assignedIncomePotCount: number;
  totalObligationCount: number;
  recommendationTitle: string;
  recommendationAction: string;
  recommendationWhy: string;
  recommendationHref: string;
  interestSaved: number;
  timeSavedMonths: number;
  billsDueSoon?: readonly { name: string; amount: number; dueDate: string; status?: string; incomePot?: string }[];
  upcomingIncome?: readonly { name: string; amount: number; date?: string }[];
  debts?: readonly { name: string; balance: number; minimumPayment: number; interestRate: number; minimumPaymentKnown?: boolean; interestRateKnown?: boolean }[];
  fundingSources?: readonly { name: string; type: string; available: number }[];
  paymentConfigurations?: readonly {
    obligationName: string;
    paymentAccountName?: string;
    fundingAccountName?: string;
    strategyLabel: string;
    strategyId: string;
    complete: boolean;
    reviewMessages: readonly string[];
    explanation: string;
  }[];
  helocReserve?: number;
  activeDebtStrategy?: "avalanche" | "snowball" | "velocity" | "custom";
  strategyScenarios?: readonly { id: string; label: string; monthsToPayoff: number; totalInterest: number; monthlyCashStrain: number; riskLevel: string; debtFreeDate: string }[];
  forecast?: readonly { label: string; cash: number; debt: number; cashShortages: number }[];
  retirementDataAvailable?: boolean;
  financialHealth?: FinancialHealthScoreResult;
  observationHistory?: readonly MoneyObservationSnapshot[];
  observationVelocity?: MoneyObservationSnapshot["velocity"];
  observationRetirement?: MoneyObservationSnapshot["retirement"];
  benchmarkConfiguration?: MoneyBenchmarkConfiguration;
  conversationHistory?: readonly AgentConversationThread[];
  professionalJournalEntries?: readonly ProfessionalJournalReasoningItem[];
  lastVisitedAt?: string;
  recentPayments?: readonly {
    id: string;
    name: string;
    amount: number;
    date: string;
    kind: "bill" | "debt";
  }[];
  memberUnderstandingEntries?: readonly MemberUnderstandingReasoningItem[];
  upcomingConversationEvents?: readonly UpcomingStarterEvent[];
  currentGoals?: readonly {
    id: string;
    title: string;
    status?: string;
    targetDate?: string;
    updatedAt?: string;
  }[];
};

const priorityConfiguration = {
  weights: {
    urgency: 3,
    financialImpact: 3,
    confidence: 2,
    dueDate: 2,
    unresolvedStatus: 2,
    recurrence: 1,
  } satisfies Partial<Record<InsightPriorityFactor, number>>,
};

function moneyInsight(input: MoneyCoachExperienceInput, values: {
  id: string;
  category: string;
  title: string;
  summary: string;
  explanation: string;
  rule: string;
  factors: Record<string, number>;
  supportingData: { label: string; value: string | number | boolean | null; source?: string }[];
  href?: string;
  severity?: Insight["severity"];
  limitations?: string[];
}): Insight {
  const ranked = calculateInsightPriority(values.factors, priorityConfiguration);
  const timestamp = input.asOfDate.toISOString();
  const action = values.href ? {
    id: `open-${values.id}`,
    label: `Review ${values.title}`,
    type: "navigate" as const,
    target: values.href,
  } : undefined;
  return {
    id: `money-coach:${values.id}`,
    ownerId: input.ownerId,
    specialist: "beastmoney.money-coach",
    category: values.category,
    priority: ranked.priority,
    priorityScore: ranked.score,
    priorityFactors: values.factors,
    severity: values.severity || "info",
    confidence: "high",
    title: values.title,
    summary: values.summary,
    detailedExplanation: values.explanation,
    supportingData: values.supportingData,
    provenance: {
      originatingData: "Authenticated owner-scoped BeastMoney records",
      calculationOrRule: values.rule,
      timestamp,
      supportingRecords: [],
      confidence: "high",
      limitations: values.limitations || ["Results depend on the completeness and freshness of saved BeastMoney records."],
    },
    generatedAt: timestamp,
    applicablePeriod: { label: "Current BeastMoney review", startsAt: timestamp },
    relatedEntities: [],
    action,
    navigationTarget: values.href,
    explainWhy: {
      reason: values.explanation,
      supportingData: values.supportingData,
      calculations: [values.rule],
      assumptions: ["Saved records are current and accurate."],
      limitations: values.limitations || ["Missing or stale records can change this result."],
    },
    rendering: {
      badge: ranked.priority,
      accentColor: ranked.priority === "critical" ? "red" : ranked.priority === "high" ? "amber" : "cyan",
      cardSize: "standard",
      expandableSections: ["Explain Why", "Supporting data", "Limitations"],
      actionButtons: action ? [action] : [],
    },
    status: "New",
    deduplicationKey: values.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there";
}

export function buildMoneyCoachGreeting(userName: string, date: Date) {
  const hour = date.getHours();
  const period = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${period}, ${firstName(userName)}.`;
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

export function buildMoneyCoachExperience(
  input: MoneyCoachExperienceInput
): MoneyCoachExperienceModel {
  const roleDefinition = specialistRoleDefinitions.moneyCoach;
  const importantItems: string[] = [];
  const wins: string[] = [];
  const potentialIssues: string[] = [];
  const opportunities: string[] = [];
  const cards: MoneyCoachExperienceCard[] = [];
  const insights: Insight[] = [];
  const observationData: MoneyObservationData = {
    current: {
      capturedAt: input.asOfDate.toISOString(),
      monthlyIncome: input.monthlyIncome,
      monthlyOutflow: input.monthlyOutflow,
      projectedSurplus: input.projectedSurplus,
      currentCash: input.currentCash,
      cashBuffer: input.cashBuffer,
      totalDebt: input.totalDebt,
      utilization: input.utilization,
      bills: input.billsDueSoon,
      debts: input.debts,
      velocity: input.observationVelocity,
      retirement: input.observationRetirement,
      paymentConfigurations: input.paymentConfigurations,
    },
    history: input.observationHistory || [],
  };
  const observations = buildMoneyCoachObservations(observationData, input.ownerId, input.asOfDate.toISOString());
  const benchmarks = buildMoneyCoachBenchmarks(
    observationData,
    input.ownerId,
    input.asOfDate.toISOString(),
    observations,
    input.benchmarkConfiguration
  );

  if (input.billsDueSoonCount > 0) {
    importantItems.push(
      `${plural(input.billsDueSoonCount, "bill")} due in the next 7 days.`
    );
    insights.push(moneyInsight(input, {
      id: "bills-due-soon", category: "Upcoming", title: "Bills due soon",
      summary: `${plural(input.billsDueSoonCount, "bill")} due in the next 7 days.`,
      explanation: "This is shown because saved active bill due dates fall within the seven-day review window.",
      rule: "Count active bill records with a due date from today through seven days from today.",
      factors: { urgency: 90, financialImpact: 70, confidence: 90, dueDate: 95, unresolvedStatus: 80, recurrence: 60 },
      supportingData: [{ label: "Bills due within 7 days", value: input.billsDueSoonCount, source: "bill_events" }],
      href: "/dashboard/money/cashflow#bills", severity: "warning",
    }));
  }

  if (input.currentCash < input.cashBuffer) {
    potentialIssues.push(
      `Available cash is ${formatCurrency(input.currentCash)}, below the protected buffer of ${formatCurrency(input.cashBuffer)}.`
    );
    insights.push(moneyInsight(input, {
      id: "cash-below-buffer", category: "Needs Attention", title: "Cash is below the protected buffer",
      summary: `${formatCurrency(input.currentCash)} available versus a ${formatCurrency(input.cashBuffer)} buffer.`,
      explanation: "Available cash is lower than the member-configured protected cash buffer.",
      rule: "Compare saved current cash with the saved checking buffer.",
      factors: { urgency: 85, financialImpact: 90, confidence: 95, dueDate: 60, unresolvedStatus: 90, recurrence: 50 },
      supportingData: [{ label: "Available cash", value: input.currentCash, source: "cash_settings" }, { label: "Protected buffer", value: input.cashBuffer, source: "cash_settings" }],
      href: "/dashboard/money/cashflow", severity: "critical",
    }));
  } else if (input.cashBuffer > 0) {
    wins.push(
      `Available cash is covering the configured ${formatCurrency(input.cashBuffer)} buffer.`
    );
  }

  if (input.monthlyIncome > 0 && input.projectedSurplus >= 0) {
    wins.push(
      `Tracked monthly income covers known monthly obligations with ${formatCurrency(input.projectedSurplus)} available.`
    );
    insights.push(moneyInsight(input, {
      id: "cash-flow-covered", category: "Wins", title: "Known monthly obligations are covered",
      summary: `${formatCurrency(input.projectedSurplus)} remains after known monthly obligations.`,
      explanation: "Tracked recurring income is greater than normalized bills, debt minimums, and scheduled transfers.",
      rule: "Monthly recurring income minus normalized monthly obligations.",
      factors: { urgency: 20, financialImpact: 65, confidence: 90, dueDate: 20, unresolvedStatus: 10, recurrence: 60 },
      supportingData: [{ label: "Monthly income", value: input.monthlyIncome }, { label: "Monthly obligations", value: input.monthlyOutflow }, { label: "Remaining", value: input.projectedSurplus }],
      href: "/dashboard/money/cashflow", severity: "success",
    }));
  } else if (input.monthlyIncome > 0 && input.projectedSurplus < 0) {
    potentialIssues.push(
      `Known monthly obligations exceed tracked monthly income by ${formatCurrency(Math.abs(input.projectedSurplus))}.`
    );
    insights.push(moneyInsight(input, {
      id: "cash-flow-shortfall", category: "Needs Attention", title: "Known obligations exceed tracked income",
      summary: `${formatCurrency(Math.abs(input.projectedSurplus))} more is scheduled out than in.`,
      explanation: "Normalized monthly obligations exceed active recurring income in Cash Intelligence.",
      rule: "Monthly recurring income minus normalized monthly obligations.",
      factors: { urgency: 90, financialImpact: 95, confidence: 90, dueDate: 75, unresolvedStatus: 95, recurrence: 80 },
      supportingData: [{ label: "Monthly income", value: input.monthlyIncome }, { label: "Monthly obligations", value: input.monthlyOutflow }],
      href: "/dashboard/money/cashflow", severity: "critical",
    }));
  }

  if (input.utilization > 50) {
    potentialIssues.push(
      `Tracked credit utilization is ${Math.round(input.utilization)}%, above the Money Coach 50% review threshold.`
    );
  }

  if (input.projectedDebtReduction > 0) {
    wins.push(
      `The current 30-day plan projects ${formatCurrency(input.projectedDebtReduction)} of debt reduction.`
    );
  } else if (input.activeDebtCount === 0) {
    wins.push("No active debt balance is currently tracked.");
  }

  if (input.interestSaved > 0 || input.timeSavedMonths > 0) {
    opportunities.push(
      `The optimized debt plan projects ${formatCurrency(input.interestSaved)} in interest savings and ${plural(input.timeSavedMonths, "month")} saved.`
    );
  }

  if (input.safeFundingSourceCapacity > 0) {
    opportunities.push(
      `${formatCurrency(input.safeFundingSourceCapacity)} of funding-source capacity remains inside current guardrails.`
    );
  }

  if (input.activeBillCount > 0) {
    const cardInsight = insights.find((item) => item.id === "money-coach:bills-due-soon") || moneyInsight(input, {
      id: "upcoming-bills", category: "Financial Summary", title: "Upcoming Bills", summary: `${plural(input.activeBillCount, "active bill")}`,
      explanation: "This summarizes active bill records and the normalized monthly bill total.", rule: "Count active bills and use Cash Intelligence monthlyBills.",
      factors: { urgency: 40, financialImpact: 60, confidence: 90, dueDate: 40, unresolvedStatus: 40, recurrence: 70 },
      supportingData: [{ label: "Active bills", value: input.activeBillCount }, { label: "Monthly bills", value: input.monthlyBills }], href: "/dashboard/money/cashflow#bills",
    });
    if (!insights.includes(cardInsight)) insights.push(cardInsight);
    cards.push({
      id: "upcoming-bills",
      title: "Upcoming Bills",
      summary: `${plural(input.activeBillCount, "active bill")} · ${formatCurrency(input.monthlyBills)} monthly`,
      detail:
        input.billsDueSoonCount > 0
          ? `${plural(input.billsDueSoonCount, "bill")} need attention in the next 7 days.`
          : "No tracked bills are due in the next 7 days.",
      explainWhy: `This uses ${input.activeBillCount} active bill records and the Cash Intelligence monthly bill total of ${formatCurrency(input.monthlyBills)}.`,
      href: "/dashboard/money/cashflow#bills",
      insight: cardInsight,
    });
  }

  if (input.activeDebtCount > 0) {
    const cardInsight = moneyInsight(input, { id: "debt-progress", category: "Financial Summary", title: "Debt Progress", summary: `${formatCurrency(input.totalDebt)} tracked debt`, explanation: "Debt balance and projected reduction reuse the active debt records and 30-day Financial Insights forecast.", rule: "Sum active debt balances and compare with the 30-day forecast balance.", factors: { urgency: 45, financialImpact: 80, confidence: 85, dueDate: 35, unresolvedStatus: 70, recurrence: 65 }, supportingData: [{ label: "Active debt", value: input.totalDebt }, { label: "30-day projected reduction", value: input.projectedDebtReduction }], href: "/dashboard/money/debts" });
    insights.push(cardInsight);
    cards.push({
      id: "debt-progress",
      title: "Debt Progress",
      summary: `${formatCurrency(input.totalDebt)} across ${plural(input.activeDebtCount, "active debt")}`,
      detail: `${formatCurrency(input.projectedDebtReduction)} projected reduction in 30 days (${Math.round(input.debtProgressPercent)}%).`,
      explainWhy: `The debt balance comes from active debt records. Progress reuses the 30-day Financial Insights calculation against the current forecast.`,
      href: "/dashboard/money/debts",
      insight: cardInsight,
    });
  }

  if (input.monthlyIncome > 0 || input.activeBillCount > 0 || input.activeDebtCount > 0) {
    const cardInsight = insights.find((item) => ["money-coach:cash-flow-covered", "money-coach:cash-flow-shortfall"].includes(item.id)) || moneyInsight(input, { id: "cash-flow", category: "Financial Summary", title: "Cash Flow", summary: "Current cash-flow totals", explanation: "Cash Intelligence normalizes current recurring records into monthly totals.", rule: "Normalize active income and obligations to monthly amounts.", factors: { urgency: 40, financialImpact: 80, confidence: 85, dueDate: 40, unresolvedStatus: 50, recurrence: 70 }, supportingData: [{ label: "Monthly income", value: input.monthlyIncome }, { label: "Monthly obligations", value: input.monthlyOutflow }], href: "/dashboard/money/cashflow" });
    if (!insights.includes(cardInsight)) insights.push(cardInsight);
    cards.push({
      id: "cash-flow",
      title: "Cash Flow",
      summary: `${formatCurrency(input.monthlyIncome)} income · ${formatCurrency(input.monthlyOutflow)} obligations`,
      detail:
        input.projectedSurplus >= 0
          ? `${formatCurrency(input.projectedSurplus)} remains after known monthly obligations.`
          : `${formatCurrency(Math.abs(input.projectedSurplus))} more is going out than coming in.`,
      explainWhy: `Cash Intelligence normalizes active recurring income, bills, debt minimums, and scheduled transfers into monthly totals.`,
      href: "/dashboard/money/cashflow",
      insight: cardInsight,
    });
  }

  if (input.cashBuffer > 0) {
    const cardInsight = insights.find((item) => item.id === "money-coach:cash-below-buffer") || moneyInsight(input, { id: "cash-buffer", category: "Financial Summary", title: "Cash Buffer", summary: `${formatCurrency(input.cashBuffer)} protected`, explanation: "This compares current cash with the member-configured buffer and does not infer an emergency-fund target.", rule: "Compare cash_settings starting balance and checking buffer.", factors: { urgency: 30, financialImpact: 70, confidence: 90, dueDate: 20, unresolvedStatus: 30, recurrence: 50 }, supportingData: [{ label: "Available cash", value: input.currentCash }, { label: "Protected buffer", value: input.cashBuffer }], href: "/dashboard/money/cashflow" });
    if (!insights.includes(cardInsight)) insights.push(cardInsight);
    cards.push({
      id: "cash-buffer",
      title: "Cash Buffer",
      summary: `${formatCurrency(input.currentCash)} available`,
      detail: `${formatCurrency(input.cashBuffer)} is protected by the current cash setting.`,
      explainWhy: `This compares the saved starting cash balance with the saved checking-buffer setting; it does not infer an emergency-fund target.`,
      href: "/dashboard/money/cashflow",
      insight: cardInsight,
    });
  }

  if (input.totalObligationCount > 0) {
    const unassigned = Math.max(
      input.totalObligationCount - input.assignedIncomePotCount,
      0
    );
    const cardInsight = moneyInsight(input, { id: "income-pots", category: unassigned > 0 ? "Needs Attention" : "Wins", title: "Income Pots", summary: `${input.assignedIncomePotCount} of ${input.totalObligationCount} assigned`, explanation: "This counts income-date assignments on current active bills and debts.", rule: "Count non-empty assigned_income_date values on active obligations.", factors: { urgency: unassigned > 0 ? 65 : 20, financialImpact: 60, confidence: 95, dueDate: 55, unresolvedStatus: unassigned > 0 ? 80 : 10, recurrence: 50 }, supportingData: [{ label: "Assigned obligations", value: input.assignedIncomePotCount }, { label: "Total obligations", value: input.totalObligationCount }], href: "/dashboard/money/cashflow#bills", severity: unassigned > 0 ? "warning" : "success" });
    insights.push(cardInsight);
    cards.push({
      id: "income-pots",
      title: "Income Pots",
      summary: `${input.assignedIncomePotCount} of ${input.totalObligationCount} obligations assigned`,
      detail:
        unassigned > 0
          ? `${plural(unassigned, "obligation")} still need an income date.`
          : "Every active obligation has an income-date assignment.",
      explainWhy: `This counts assigned_income_date values on the current active bill and debt records.`,
      href: "/dashboard/money/cashflow#bills",
      insight: cardInsight,
    });
  }

  if (input.fundingSourceCount > 0) {
    const cardInsight = moneyInsight(input, { id: "funding-sources", category: "Financial Summary", title: "Funding Sources", summary: `${plural(input.fundingSourceCount, "active source")}`, explanation: "Capacity comes from active source balances, limits, types, and Cash Intelligence utilization guardrails.", rule: "Reuse Cash Intelligence safeFundingSourceCapacity.", factors: { urgency: 25, financialImpact: 65, confidence: 85, dueDate: 15, unresolvedStatus: 30, recurrence: 40 }, supportingData: [{ label: "Active sources", value: input.fundingSourceCount }, { label: "Safe capacity", value: input.safeFundingSourceCapacity }], href: "/dashboard/money/cashflow" });
    insights.push(cardInsight);
    cards.push({
      id: "funding-sources",
      title: "Funding Sources",
      summary: plural(input.fundingSourceCount, "active source"),
      detail: `${formatCurrency(input.safeFundingSourceCapacity)} is currently inside Cash Intelligence capacity guardrails.`,
      explainWhy: `The capacity is calculated from active funding-source limits, balances, source types, and utilization guardrails.`,
      href: "/dashboard/money/cashflow",
      insight: cardInsight,
    });
  }

  if (input.activeDebtCount > 0 && input.fundingSourceCount > 0) {
    const cardInsight = moneyInsight(input, { id: "velocity-banking", category: "Opportunities", title: "Velocity Banking", summary: `${formatCurrency(input.safeFundingSourceCapacity)} safe source capacity`, explanation: "This appears only when both active debt and an active funding source exist; no borrowing recommendation is made.", rule: "Require active debt and funding-source records; display Cash Intelligence safe capacity.", factors: { urgency: 20, financialImpact: 70, confidence: 70, dueDate: 10, unresolvedStatus: 40, recurrence: 30 }, supportingData: [{ label: "Active debts", value: input.activeDebtCount }, { label: "Active sources", value: input.fundingSourceCount }, { label: "Safe capacity", value: input.safeFundingSourceCapacity }], href: "/dashboard/money/velocity", limitations: ["This is planning information, not lending advice or a recommendation to borrow."] });
    insights.push(cardInsight);
    cards.push({
      id: "velocity-banking",
      title: "Velocity Banking",
      summary: `${formatCurrency(input.safeFundingSourceCapacity)} safe source capacity`,
      detail: "Open the existing Velocity workspace to review whether current guardrails support a strategy.",
      explainWhy: `Money Coach shows this card only because active debt and active funding-source records both exist. The displayed capacity comes from Cash Intelligence, not an assumed credit line.`,
      href: "/dashboard/money/velocity",
      insight: cardInsight,
    });
  }

  if (input.activeBillCount === 0 && input.activeDebtCount === 0 && input.monthlyIncome === 0) {
    const cardInsight = moneyInsight(input, {
      id: "missing-core-records", category: "Needs Attention", title: "Add financial information",
      summary: "Money Coach needs income, bill, or debt records to provide a meaningful review.",
      explanation: "No active recurring income, bill, or debt records were available in the authenticated BeastMoney snapshot.",
      rule: "Show when active income, active bills, and active debts are all absent.",
      factors: { urgency: 45, financialImpact: 50, confidence: 100, dueDate: 10, unresolvedStatus: 90, recurrence: 30 },
      supportingData: [{ label: "Active income total", value: input.monthlyIncome }, { label: "Active bills", value: input.activeBillCount }, { label: "Active debts", value: input.activeDebtCount }],
      href: "/dashboard/money/cashflow", severity: "warning",
      limitations: ["Money Coach will not infer balances, due dates, or recommendations from missing records."],
    });
    insights.push(cardInsight);
    cards.push({ id: "missing-information", title: "Missing Information", summary: cardInsight.summary, detail: cardInsight.detailedExplanation, explainWhy: cardInsight.explainWhy?.reason || cardInsight.detailedExplanation, href: cardInsight.navigationTarget || "/dashboard/money/cashflow", insight: cardInsight });
    potentialIssues.push("Add income, bills, or debts so Money Coach can evaluate the current plan without guessing.");
  }

  const recommendedToday: StarterCandidate[] = [];
  if (input.activeBillCount > 0) {
    recommendedToday.push({
      id: "review-bills",
      kind: "recommended-today",
      title: "Review bills",
      prompt: "What bills need my attention?",
      reason: "Current BeastMoney records include active bills.",
      group: "Recommended Today",
      priority: input.billsDueSoonCount > 0 ? 95 : 75,
      evidence: [{ sourceType: "current-context", sourceId: "active-bills", capturedAt: input.asOfDate.toISOString(), reason: `${input.activeBillCount} active bill records.` }],
    });
  }
  if (opportunities.length > 0) {
    recommendedToday.push({
      id: "show-opportunities",
      kind: "recommended-today",
      title: "Review opportunities",
      prompt: "Where are my opportunities?",
      reason: "The current financial review contains evidence-backed opportunities.",
      group: "Recommended Today",
      priority: 82,
      evidence: [{ sourceType: "current-context", sourceId: "current-opportunities", capturedAt: input.asOfDate.toISOString(), reason: opportunities[0] }],
    });
  }
  if (input.activeDebtCount > 0) {
    recommendedToday.push({
      id: "review-debt",
      kind: "recommended-today",
      title: "Review debt progress",
      prompt: "How is my debt plan progressing?",
      reason: "Current BeastMoney records include active debt.",
      group: "Recommended Today",
      priority: 80,
      evidence: [{ sourceType: "current-context", sourceId: "active-debts", capturedAt: input.asOfDate.toISOString(), reason: `${input.activeDebtCount} active debt records.` }],
    });
  }
  if (input.monthlyIncome > 0 || input.monthlyOutflow > 0) {
    recommendedToday.push({
      id: "explain-cash-flow",
      kind: "recommended-today",
      title: "Review cash flow",
      prompt: "Can my income cover this month?",
      reason: "Current income or outflow records support a cash-flow review.",
      group: "Recommended Today",
      priority: 78,
      evidence: [{ sourceType: "current-context", sourceId: "cash-flow", capturedAt: input.asOfDate.toISOString(), reason: "Current monthly income and outflow context is available." }],
    });
  }
  const morningBriefing = buildMorningFinancialBriefing({
    ownerId: input.ownerId,
    asOf: input.asOfDate.toISOString(),
    since:
      input.lastVisitedAt ||
      new Date(input.asOfDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    observations,
    benchmarks,
    journalEntries: input.professionalJournalEntries,
    memberUnderstanding: input.memberUnderstandingEntries,
    currentGoals: input.currentGoals,
    recentPayments: input.recentPayments,
    upcomingBills: (input.billsDueSoon || []).map((bill, index) => ({
      id: `bill-${index}-${bill.name}`,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
    })),
    recommendedFocus: {
      title: input.recommendationTitle,
      detail: input.recommendationAction,
      href: input.recommendationHref,
    },
  });
  recommendedToday.unshift({
    id: "morning-financial-briefing",
    kind: "recommended-today",
    title: "Review today’s financial briefing",
    prompt: "Walk me through my morning financial briefing.",
    reason: morningBriefing.summary,
    group: "Recommended Today",
    priority: 96,
    evidence: morningBriefing.items.map((item) => ({
      sourceType:
        item.source === "current-data" || item.source === "goal"
          ? "current-context"
          : item.source === "benchmark"
            ? "configuration"
            : item.source,
      sourceId: item.id,
      capturedAt: input.asOfDate.toISOString(),
      reason: item.detail,
    })),
  });
  const starterEngine = createDefaultConversationStarterEngine();
  const generatedStarters = starterEngine.generate({
    ownerId: input.ownerId,
    specialistId: "beastmoney.money-coach",
    asOf: input.asOfDate.toISOString(),
    observations,
    journalEntries: input.professionalJournalEntries,
    memberUnderstanding: input.memberUnderstandingEntries,
    conversationHistory: input.conversationHistory,
    recommendedToday,
    upcomingEvents: input.upcomingConversationEvents,
    limit: 8,
  });
  const suggestions: MoneyCoachExperienceSuggestion[] = generatedStarters.map((starter) => ({
    id: starter.id,
    label: starter.title,
    category: starter.kind,
    group: starter.group,
    prompt: starter.prompt,
    href: starter.action?.target,
  }));
  suggestions.push({ id: "ask-question", label: "Ask anything", category: "ask-anything", group: "Ask Anything", intent: "ask" });

  const summary = [
    `${formatCurrency(input.currentCash)} available cash with a ${formatCurrency(input.cashBuffer)} protected buffer.`,
    `${formatCurrency(input.monthlyIncome)} tracked monthly income and ${formatCurrency(input.monthlyOutflow)} known monthly obligations.`,
    input.activeDebtCount > 0
      ? `${formatCurrency(input.totalDebt)} in active tracked debt.`
      : "No active debt balance is currently tracked.",
  ];

  const openingObservation =
    importantItems[0] || potentialIssues[0] || wins[0] || summary[0];
  const conversationOpening = importantItems[0]
    ? `I reviewed your current plan. ${importantItems[0]} Let’s make sure it is covered.`
    : potentialIssues[0]
      ? `One thing I wanted to mention: ${potentialIssues[0]}`
      : opportunities[0]
        ? `I found an opportunity worth reviewing: ${opportunities[0]}`
        : wins[0]
          ? `Your current records show something positive: ${wins[0]}`
          : `I reviewed the information currently available. ${openingObservation}`;

  insights.sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
  return {
    ownerId: input.ownerId,
    greeting: buildMoneyCoachGreeting(input.userName, input.asOfDate),
    introduction: "I reviewed the BeastMoney records and calculations currently available.",
    conversationOpening,
    summary,
    importantItems,
    wins,
    potentialIssues,
    opportunities,
    cards,
    suggestions,
    primaryRecommendation: {
      title: input.recommendationTitle,
      action: input.recommendationAction,
      explainWhy: input.recommendationWhy,
      href: input.recommendationHref,
    },
    insights,
    observations,
    benchmarks,
    morningBriefing,
    behavior: specialistProfessionalIdentityProfiles.moneyCoach.behavior,
    professional: specialistProfessionalIdentityProfiles.moneyCoach,
    roleDefinition,
    safetyNotice: specialistProfessionalIdentityProfiles.moneyCoach.identity.professionalBoundaries.join(". "),
    userFirstName: firstName(input.userName),
    financialContext: {
      currentCash: input.currentCash,
      cashBuffer: input.cashBuffer,
      projectedSurplus: input.projectedSurplus,
      monthlyIncome: input.monthlyIncome,
      monthlyOutflow: input.monthlyOutflow,
      billsDueSoon: input.billsDueSoon || [],
      upcomingIncome: input.upcomingIncome || [],
      debts: input.debts || [],
      fundingSources: input.fundingSources || [],
      paymentConfigurations: input.paymentConfigurations || [],
      helocReserve: input.helocReserve || 0,
      activeDebtStrategy: input.activeDebtStrategy || "avalanche",
      strategyScenarios: input.strategyScenarios || [],
      forecast: input.forecast || [],
      incomePotAssignedCount: input.assignedIncomePotCount,
      totalObligationCount: input.totalObligationCount,
      retirementDataAvailable: Boolean(input.retirementDataAvailable),
      financialHealth: input.financialHealth,
    },
  };
}

export type MoneyCoachIntent = "test" | "social" | "incomplete" | "bills" | "debt-strategy" | "payment-affordability" | "changes" | "benchmarks" | "financial-health" | "cash-flow" | "forecast" | "retirement" | "funding" | "velocity" | "general-finance" | "non-financial";

export type MoneyCoachResponseSection = ConversationResponseSection;

export type MoneyCoachStructuredAnswer = {
  intent: MoneyCoachIntent;
  opening: string;
  sections: readonly MoneyCoachResponseSection[];
  assumptions?: readonly string[];
  followUp?: string;
  text: string;
  href: string;
  action: string;
  toolAction?: StructuredAgentAction;
  intentType?: DomainResponseIntent;
  topics?: readonly MoneyCoachTopic[];
  confidence?: number;
  professionalExecution: ProfessionalResponseExecution;
  roleExecution?: {
    roleDefinitionId: string;
    loadOrder: RoleDefinedExecution["loadOrder"];
    planId: string;
  };
  consultation?: {
    explicitFactCount: number;
    implicitFactCount: number;
    referencedContextCount: number;
    clarificationSuppressed: boolean;
  };
};

export type MoneyCoachConversationContext = {
  recentMessages?: readonly string[];
  summary?: string;
  priorSummaries?: readonly string[];
  memories?: readonly { key: string; value: unknown }[];
  activeTopics?: readonly MoneyCoachTopic[];
};

export type MoneyCoachTopic = "velocity-banking" | "avalanche" | "snowball" | "financial-health" | "cash-flow" | "bills" | "debts" | "income-pots" | "funding-sources" | "retirement" | "forecasting" | "cash-buffer" | "heloc";

const moneyCoachConcepts = [
  { topic: "velocity-banking", label: "Velocity Banking", aliases: ["velocity", "velocity banking"] },
  { topic: "avalanche", label: "Avalanche", aliases: ["avalanche", "debt avalanche"] },
  { topic: "snowball", label: "Snowball", aliases: ["snowball", "debt snowball"] },
  { topic: "financial-health", label: "Financial Health Score", aliases: ["financial health", "financial health score", "health score", "wellness score"] },
  { topic: "cash-flow", label: "Cash Flow", aliases: ["cash flow", "cashflow"] },
  { topic: "bills", label: "Bills", aliases: ["bill", "bills"] },
  { topic: "debts", label: "Debts", aliases: ["debt", "debts"] },
  { topic: "income-pots", label: "Income Pots", aliases: ["income pot", "income pots"] },
  { topic: "funding-sources", label: "Payment Configuration", aliases: ["payment account", "funding account", "funding strategy", "payment setup", "payment configuration", "funding source", "funding sources"] },
  { topic: "retirement", label: "Retirement", aliases: ["retirement", "401k", "ira"] },
  { topic: "forecasting", label: "Forecasting", aliases: ["forecast", "forecasting", "projection"] },
  { topic: "cash-buffer", label: "Cash Buffer", aliases: ["cash buffer", "protected reserve"] },
  { topic: "heloc", label: "HELOC", aliases: ["heloc", "home equity line of credit"] },
] as const;

export function classifyMoneyCoachRequest(question: string, conversation: MoneyCoachConversationContext = {}): DomainIntentRoute<MoneyCoachTopic> {
  return classifyDomainResponseIntent(question, moneyCoachConcepts, { activeTopics: conversation.activeTopics });
}

function recognizeMoneyDomainIntent(value: string): DomainIntentCandidate<Exclude<MoneyCoachIntent, "test" | "social" | "incomplete" | "non-financial">> | undefined {
  if (/\b(stay with|switch (to|from)|avalanche|snowball|payoff (method|strategy)|debt strategy)\b/.test(value)) return { intent: "debt-strategy", confidence: 0.95, signals: ["strategy-comparison"] };
  const candidates: readonly [RegExp, Exclude<MoneyCoachIntent, "test" | "social" | "incomplete" | "non-financial">, string][] = [
    [/\b(can i afford|safe to (pay|make)|another payment|extra payment|pay more)\b/, "payment-affordability", "payment-capacity"],
    [/\b(what changed|what is different|since (my )?last|recent changes?)\b/, "changes", "change-comparison"],
    [/\b(financial health|health score|wellness score)\b/, "financial-health", "financial-health"],
    [/\b(how (do|does|am|are) (i|my|this)|compare(d)? (with|to)|benchmark|against my (goal|average)|versus my (goal|average))\b/, "benchmarks", "benchmark-comparison"],
    [/\b(bills?|due|upcoming expenses?|needs? attention)\b/, "bills", "obligation-attention"],
    [/\b(cash flow|income|monthly surplus|monthly shortfall)\b/, "cash-flow", "cash-flow"],
    [/\b(forecast|projection|next month|future cash)\b/, "forecast", "forecast"],
    [/\b(retire|retirement|401k|ira)\b/, "retirement", "retirement"],
    [/\b(payment account|funding account|funding strategy|payment setup|payment configuration|funding source|credit line|available credit|heloc)\b/, "funding", "funding"],
    [/\bvelocity\b/, "velocity", "velocity"],
    [/\b(money|finance|debt|cash|payment|budget|spend|save|interest|credit|risk|recommend)\b/, "general-finance", "financial-topic"],
  ];
  const match = candidates.find(([pattern]) => pattern.test(value));
  return match ? { intent: match[1], confidence: 0.9, signals: [match[2]] } : undefined;
}

export function classifyMoneyCoachIntent(question: string): MoneyCoachIntent {
  const result = recognizeConversationIntent(question, {
    recognizeDomainIntent: ({ normalized }) => {
      const strategy = /\b(stay with|switch (to|from)|avalanche|snowball|payoff (method|strategy)|debt strategy)\b/.test(normalized);
      if (strategy) return { intent: "debt-strategy" as const, confidence: 0.95, signals: ["strategy-comparison"] };
      return recognizeMoneyDomainIntent(normalized);
    },
    domainVocabulary: ["money", "finance", "financial health", "health score", "bill", "debt", "cash", "income", "payment", "retirement", "forecast", "velocity", "funding", "budget", "interest", "credit"],
  });
  if (result.kind === "testing") return "test";
  if (["greeting", "thanks", "acknowledgement"].includes(result.kind)) return "social";
  if (result.kind === "incomplete") return "incomplete";
  if (result.kind === "domain") return result.domainIntent || "general-finance";
  return "non-financial";
}

const moneyCoachIntentTools: Partial<Record<MoneyCoachIntent, string>> = {
  bills: "open-bills",
  "debt-strategy": "open-debt",
  "cash-flow": "open-cash-flow",
  "financial-health": "open-financial-health-score",
  benchmarks: "open-money-dashboard",
  forecast: "open-forecast",
  retirement: "open-retirement",
  velocity: "open-velocity",
  incomplete: "continue-money-coach-conversation",
};

const moneyCoachTopicTools: Record<MoneyCoachTopic, string> = {
  "velocity-banking": "open-velocity",
  avalanche: "open-debt",
  snowball: "open-debt",
  "financial-health": "open-financial-health-score",
  "cash-flow": "open-cash-flow",
  bills: "open-bills",
  debts: "open-debt",
  "income-pots": "open-income-pots",
  "funding-sources": "open-funding-sources",
  retirement: "open-retirement",
  forecasting: "open-forecast",
  "cash-buffer": "open-cash-flow",
  heloc: "open-velocity",
};

function consultationTransition(
  intentType: DomainResponseIntent | undefined,
  sections: readonly MoneyCoachResponseSection[]
) {
  if (!sections.length || intentType === "navigate" || intentType === "clarify") {
    return "";
  }
  if (intentType === "define") return "Here’s how I think about it.";
  if (intentType === "explain-current-status") {
    return "Based on your current setup, here’s what matters.";
  }
  if (intentType === "evaluate") {
    return "In your situation, the tradeoffs matter as much as the headline result.";
  }
  if (intentType === "compare") {
    return "The important distinction is how each option affects your plan.";
  }
  if (intentType === "calculate") return "Here’s how the numbers come together.";
  return "Let me walk you through the useful detail.";
}

function createMoneyCoachResponse(values: Omit<MoneyCoachStructuredAnswer, "text" | "professionalExecution">, professional: ProfessionalIdentityProfile, execution: RoleDefinedExecution): MoneyCoachStructuredAnswer {
  const registeredToolId = values.topics?.length === 1 ? moneyCoachTopicTools[values.topics[0]] : moneyCoachIntentTools[values.intent];
  const registeredTool = registeredToolId ? sharedAgentActionTools.get(registeredToolId) : undefined;
  const tool = registeredTool?.target === values.href ? registeredTool : sharedAgentActionTools.findNavigationByTarget(values.href);
  if (!tool) throw new Error(`Money Coach cannot prepare an unregistered navigation target: ${values.href}`);
  const toolAction = sharedAgentActionTools.prepare({
    toolId: tool.id,
    specialistId: "beastmoney.money-coach",
    grantedPermissions: [tool.permission],
    actionId: `money-coach-${values.intent}-${tool.id}`,
  });
  const transition = consultationTransition(values.intentType, values.sections);
  const conversationalOpening = transition
    ? `${values.opening} ${transition}`
    : values.opening;
  const shared = composeRoleDefinedResponse(execution, {
    intent: values.intent,
    shortAnswer: conversationalOpening,
    sections: values.sections,
    assumptions: values.assumptions,
    nextStep: values.followUp,
    actions: [{ id: toolAction.id, label: values.action, type: "navigate", target: toolAction.target }],
    expertiseUsed: professional.identity.expertise,
    mode: values.intentType === "define" ? "teaching" : values.intentType === "clarify" ? "clarification" : values.intentType === "evaluate" ? "recommendation" : "answer",
    followUpRequired: values.intentType === "clarify",
    nextStepUseful: Boolean(values.followUp),
    workspaceBenefit: "deeper-analysis",
  });
  return {
    ...values,
    opening: conversationalOpening,
    href: toolAction.target || values.href,
    toolAction,
    sections: shared.sections,
    text: shared.text,
    professionalExecution: shared.professionalExecution,
    roleExecution: { roleDefinitionId: execution.roleDefinition.id, loadOrder: execution.loadOrder, planId: execution.plan.id },
    consultation: {
      explicitFactCount: execution.plan.consultationStory.explicitFacts.length,
      implicitFactCount: execution.plan.consultationStory.implicitFacts.length,
      referencedContextCount: execution.plan.consultationStory.references.length,
      clarificationSuppressed: execution.plan.consultationQuestionDecision?.shouldAsk === false,
    },
  };
}

const moneyTopicDetails: Record<MoneyCoachTopic, { label: string; definition: string; href: string }> = {
  "velocity-banking": { label: "Velocity Banking", definition: "Velocity Banking is a debt-paydown method that uses available revolving credit as a temporary cash-flow tool, then directs income back toward restoring that credit line.", href: "/dashboard/money/velocity" },
  avalanche: { label: "Avalanche", definition: "The debt avalanche directs extra payments to the highest-interest debt first while maintaining required payments on the others.", href: "/dashboard/money/debts" },
  snowball: { label: "Snowball", definition: "The debt snowball directs extra payments to the smallest balance first to create earlier account wins.", href: "/dashboard/money/debts" },
  "financial-health": { label: "Financial Health Score", definition: "The Financial Health Score is a transparent BeastMoney financial-wellness measure. It is not a credit score.", href: "/dashboard/money/dashboard#financial-health-score" },
  "cash-flow": { label: "Cash Flow", definition: "Cash flow is the movement of income into and obligations or spending out of your plan over time.", href: "/dashboard/money/cashflow" },
  bills: { label: "Bills", definition: "Bills are scheduled obligations with an amount and due date that must be accounted for in the cash plan.", href: "/dashboard/money/cashflow#bills" },
  debts: { label: "Debts", definition: "Debts are outstanding balances owed to creditors, usually governed by rates, required payments, and payoff terms.", href: "/dashboard/money/debts" },
  "income-pots": { label: "Income Pots", definition: "Income Pots group obligations against a particular income date so the money has an explicit job before it is spent.", href: "/dashboard/money/cashflow#income-planning" },
  "funding-sources": { label: "Payment Configuration", definition: "Payment Configuration separates the account a payment drafts from, the account or income pot where its funds originated, and the strategy used to move those funds.", href: "/dashboard/money/cashflow#funding-sources" },
  retirement: { label: "Retirement", definition: "Retirement planning connects current savings and contributions with a future income goal and the assumptions used to project it.", href: "/dashboard/money/retirement" },
  forecasting: { label: "Forecasting", definition: "Forecasting projects current balances forward using known income, obligations, transfers, and strategy assumptions.", href: "/dashboard/money/dashboard" },
  "cash-buffer": { label: "Cash Buffer", definition: "A cash buffer is the protected amount kept available so normal obligations and unexpected costs do not immediately require new debt.", href: "/dashboard/money/cashflow" },
  heloc: { label: "HELOC", definition: "A HELOC is a revolving credit line secured by home equity, with borrowing costs and terms that can change over time.", href: "/dashboard/money/velocity" },
};

function velocityResponse(route: DomainIntentRoute<MoneyCoachTopic>, model: MoneyCoachExperienceModel, execution: RoleDefinedExecution): MoneyCoachStructuredAnswer | undefined {
  const structuredAnswer = (values: Omit<MoneyCoachStructuredAnswer, "text" | "professionalExecution">) => createMoneyCoachResponse(values, model.professional, execution);
  if (!route.topics.includes("velocity-banking")) return undefined;
  const context = model.financialContext;
  const details = moneyTopicDetails["velocity-banking"];
  const velocity = context.strategyScenarios.find((scenario) => scenario.id === "velocity");
  const avalanche = context.strategyScenarios.find((scenario) => scenario.id === "avalanche");
  const highestDebtRate = Math.max(0, ...context.debts.map((debt) => debt.interestRate));
  if (route.intentType === "define") return structuredAnswer({ intent: "velocity", intentType: route.intentType, topics: route.topics, confidence: route.confidence, opening: details.definition, sections: [
    { heading: "How it generally works", numberedItems: ["Use an eligible credit line for a carefully sized payment against a higher-cost debt.", "Direct recurring income through the cash plan while required obligations continue.", "Restore the credit line before considering another payment cycle."] },
    { heading: "Main requirements", bullets: ["Stable positive cash flow", "A suitable credit line with known rates, fees, and draw terms", "Enough protected cash for upcoming obligations", "A disciplined recovery plan that does not add new spending"] },
    { heading: "Main risks", bullets: ["Variable borrowing costs can erase projected savings", "A cash interruption can delay recovery", "Using secured home equity can increase consequences", "New charges or incomplete records can invalidate the model"] },
    { heading: "Your current setup", paragraphs: [context.helocReserve > 0 ? `BeastMoney currently tracks ${formatCurrency(context.helocReserve)} of HELOC availability. That is context, not by itself a recommendation to use it.` : "I don’t currently see usable HELOC availability in this review, so I would not assume the strategy is available to you."] },
  ], followUp: "If you want, I can evaluate whether the current records satisfy those requirements.", href: details.href, action: "Open Velocity" });
  if (route.intentType === "explain-current-status") return structuredAnswer({ intent: "velocity", intentType: route.intentType, topics: route.topics, confidence: route.confidence, opening: context.helocReserve > 0 && context.projectedSurplus > 0 ? "Your current records show capacity to model Velocity, but the guardrails still need to hold before another cycle." : "Your current records do not yet show a complete, safely recoverable Velocity setup.", sections: [
    { heading: "Current status", table: { columns: ["Guardrail", "Current value"], rows: [["Cash", formatCurrency(context.currentCash)], ["Protected buffer", formatCurrency(context.cashBuffer)], ["Monthly cash flow", formatCurrency(context.projectedSurplus)], ["HELOC availability", formatCurrency(context.helocReserve)], ["Highest tracked debt rate", `${highestDebtRate}%`]] } },
    { heading: "Capacity and next review", paragraphs: [velocity ? `The current Velocity scenario models ${velocity.monthsToPayoff} months to payoff, ${formatCurrency(velocity.totalInterest)} of interest, and ${formatCurrency(velocity.monthlyCashStrain)} of monthly strain.` : "A current Velocity scenario is not available, so I cannot report modeled payoff performance.", context.upcomingIncome[0] ? `Review again around the next tracked income event: ${context.upcomingIncome[0].name}${context.upcomingIncome[0].date ? ` on ${context.upcomingIncome[0].date}` : ""}.` : "Review again after income timing and upcoming obligations are current."] },
  ], href: details.href, action: "Review Velocity workspace" });
  if (route.intentType === "evaluate") {
    const hasBasicCapacity = context.currentCash >= context.cashBuffer && context.projectedSurplus > 0 && context.helocReserve > 0 && context.debts.length > 0;
    return structuredAnswer({ intent: "velocity", intentType: route.intentType, topics: route.topics, confidence: route.confidence, opening: hasBasicCapacity ? "Velocity may be worth comparing, but I would not choose it until the HELOC cost and recovery schedule beat the safer alternatives." : "I would not use Velocity from the current record set because one or more basic safety conditions are missing.", sections: [
      { heading: "Evaluation", table: { columns: ["Factor", "Current evidence"], rows: [["Cash above buffer", formatCurrency(Math.max(context.currentCash - context.cashBuffer, 0))], ["Monthly surplus", formatCurrency(context.projectedSurplus)], ["HELOC availability", formatCurrency(context.helocReserve)], ["Highest debt rate", `${highestDebtRate}%`], ["Tracked income", formatCurrency(context.monthlyIncome)]] } },
      { heading: "Uncertainty", paragraphs: ["This review does not include verified HELOC APR, fees, variable-rate terms, draw restrictions, or lender conditions. Without those terms, apparent capacity is not proof of savings or suitability."] },
    ], assumptions: ["Current balances, income, obligations, debt rates, and reserve settings are accurate.", "No new revolving spending is added during recovery."], followUp: "The next useful step is to compare the verified HELOC cost with the current Avalanche scenario.", href: details.href, action: "Review Velocity assumptions" });
  }
  if (route.intentType === "compare") {
    if (!velocity || !avalanche) return structuredAnswer({ intent: "debt-strategy", intentType: route.intentType, topics: route.topics, confidence: route.confidence, opening: "I can explain the difference, but I cannot make a current numerical comparison because both modeled scenarios are not available.", sections: [{ heading: "General difference", table: { columns: ["Strategy", "Primary mechanism", "Key risk"], rows: [["Velocity", "Temporary credit-line cycling", "Credit-line cost and recovery risk"], ["Avalanche", "Highest-rate debt first", "Fewer early account wins"]] } }], followUp: "Is your priority minimizing modeled interest or preserving the simplest, lowest-risk process?", href: "/dashboard/money/debts", action: "Review debt strategies" });
    return structuredAnswer({ intent: "debt-strategy", intentType: route.intentType, topics: route.topics, confidence: route.confidence, opening: `${velocity.totalInterest < avalanche.totalInterest ? "Velocity" : "Avalanche"} has the lower modeled interest in the current scenarios, but cost is not the only decision factor.`, sections: [{ heading: "Current comparison", table: { columns: ["Strategy", "Payoff time", "Total interest", "Monthly strain", "Risk"], rows: [velocity, avalanche].map((scenario) => [scenario.label, `${scenario.monthsToPayoff} months`, formatCurrency(scenario.totalInterest), formatCurrency(scenario.monthlyCashStrain), scenario.riskLevel]) } }, { heading: "Tradeoff", paragraphs: ["Avalanche is operationally simpler. Velocity depends on suitable credit terms, reliable cash flow, and disciplined recovery."] }], followUp: "Which matters more to you: the lowest modeled interest or the simpler strategy with less credit-line exposure?", href: "/dashboard/money/debts", action: "Compare strategies" });
  }
  if (route.intentType === "calculate") return structuredAnswer({ intent: "velocity", intentType: route.intentType, topics: route.topics, confidence: route.confidence, opening: velocity && avalanche ? `The current Velocity scenario models ${formatCurrency(Math.max(avalanche.totalInterest - velocity.totalInterest, 0))} less interest than Avalanche.` : "I cannot calculate current Velocity interest savings because comparable Velocity and Avalanche scenarios are not both available.", sections: velocity && avalanche ? [{ heading: "Calculation", table: { columns: ["Scenario", "Modeled interest"], rows: [["Avalanche", formatCurrency(avalanche.totalInterest)], ["Velocity", formatCurrency(velocity.totalInterest)], ["Difference", formatCurrency(avalanche.totalInterest - velocity.totalInterest)]] } }] : [{ heading: "Required inputs", bullets: ["Current balances and rates", "Verified HELOC rate and fees", "Payment capacity and recovery timing", "Comparable strategy scenarios"] }], assumptions: ["Scenario inputs remain unchanged and HELOC terms are fully represented."], href: details.href, action: "Review Velocity calculation" });
  return undefined;
}

export function answerMoneyCoachQuestion(
  question: string,
  model: MoneyCoachExperienceModel,
  conversation: MoneyCoachConversationContext = {}
): MoneyCoachStructuredAnswer {
  const intent = classifyMoneyCoachIntent(question);
  const domainRoute = classifyMoneyCoachRequest(question, conversation);
  const knownConversationContext = [
    ...(conversation.recentMessages || []).map((value, index) => ({ id: `recent-message-${index}`, label: "recent conversation", value, source: "conversation-context" as const })),
    ...(conversation.priorSummaries || []).map((value, index) => ({ id: `prior-summary-${index}`, label: "prior conversation", value, source: "conversation-context" as const })),
    ...(conversation.summary ? [{ id: "active-summary", label: "conversation summary", value: conversation.summary, source: "conversation-context" as const }] : []),
    ...(conversation.memories || []).map((item, index) => ({ id: `memory-${index}`, label: item.key, value: JSON.stringify(item.value), source: "member-understanding" as const, aliases: [item.key.replace(/[-_]/g, " ")] })),
  ];
  const knownModuleData = [
    { id: "current-cash", label: "current cash", value: formatCurrency(model.financialContext.currentCash), source: "module-data" as const, aliases: ["cash balance", "available cash"] },
    { id: "cash-buffer", label: "cash buffer", value: formatCurrency(model.financialContext.cashBuffer), source: "module-data" as const, aliases: ["protected reserve"] },
    { id: "active-strategy", label: "debt strategy", value: model.financialContext.activeDebtStrategy, source: "module-data" as const, aliases: ["strategy"] },
    ...model.financialContext.billsDueSoon.map((bill, index) => ({ id: `bill-${index}`, label: bill.name, value: `${bill.amount} due ${bill.dueDate}`, source: "module-data" as const, aliases: ["bill"] })),
    ...model.financialContext.debts.map((debt, index) => ({ id: `debt-${index}`, label: debt.name, value: `${debt.balance} at ${debt.interestRate}%`, source: "module-data" as const, aliases: ["debt"] })),
    ...model.financialContext.fundingSources.map((source, index) => ({ id: `funding-${index}`, label: source.name, value: `${source.available} available`, source: "module-data" as const, aliases: ["funding source", source.type] })),
  ];
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const execution = prepareRoleDefinedExecution({
    roleDefinition: model.roleDefinition,
    professionalProfile: model.professional,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: conversation,
    currentState: model.financialContext,
    planner,
    planningRequest: {
      specialistId: "beastmoney.money-coach",
      input: question,
      intent: domainRoute.intentType,
      topics: domainRoute.topics,
      confidence: ["test", "social", "non-financial"].includes(intent) ? 1 : domainRoute.confidence,
      ambiguous: domainRoute.ambiguous,
      requirements: [
        { id: "current-money-records", kind: "information", description: "Load current authenticated BeastMoney records", required: true, alreadyAvailable: true },
        { id: "current-observations", kind: "information", description: "Load ranked evidence-backed observations", required: false, alreadyAvailable: model.observations.length > 0 },
        { id: "current-benchmarks", kind: "information", description: "Load applicable benchmark comparisons", required: false, alreadyAvailable: model.benchmarks.length > 0 },
        { id: "money-knowledge", kind: "specialist-knowledge", description: "Load approved Money Coach domain knowledge", required: true, alreadyAvailable: true },
      ],
      consultationContext: {
        conversationContext: knownConversationContext.filter((item) => item.source === "conversation-context"),
        memberUnderstanding: knownConversationContext.filter((item) => item.source === "member-understanding"),
        moduleData: knownModuleData,
      },
      proposedClarificationQuestion: domainRoute.clarification,
    },
  });
  const structuredAnswer = (values: Omit<MoneyCoachStructuredAnswer, "text" | "professionalExecution">) => createMoneyCoachResponse(values, model.professional, execution);
  const context = model.financialContext;
  const dashboard = { href: "/dashboard/money/dashboard", action: "Open the financial dashboard" };

  if (intent === "test" || intent === "social") {
    const opening = intent === "test" ? "It looks like you’re testing the conversation. Everything appears to be working." : "I’m here and ready when you are.";
    return structuredAnswer({ intent, opening, sections: [], followUp: "Whenever you’re ready, ask me anything about your finances.", ...dashboard });
  }

  if (intent === "incomplete") {
    return structuredAnswer({ intent, opening: "I’m not quite sure what you want me to evaluate yet.", sections: [{ heading: "Clarification", classification: "uncertainty", paragraphs: ["Add the financial topic or decision you want help with, and I’ll use the relevant current records."] }], followUp: "For example: which bills need attention, whether another payment is safe, or how two debt strategies compare.", href: "#money-coach-question", action: "Continue your question" });
  }

  if (
    domainRoute.ambiguous &&
    execution.plan.requiresClarification &&
    !["payment-affordability", "financial-health"].includes(intent)
  ) {
    return structuredAnswer({ intent: "incomplete", intentType: "clarify", topics: domainRoute.topics, confidence: domainRoute.confidence, opening: "I want to make sure I answer the right question.", sections: [{ heading: "Clarification", classification: "uncertainty", paragraphs: [execution.plan.clarificationQuestion || domainRoute.clarification || "Please tell me whether you want a definition, current status, evaluation, comparison, calculation, or workspace.", execution.plan.clarificationReason || "This distinction materially changes the financial analysis I should use."] }], href: "#money-coach-question", action: "Clarify your question" });
  }

  if (domainRoute.topics.length && domainRoute.intentType === "navigate") {
    const topic = domainRoute.topics[0];
    const details = moneyTopicDetails[topic];
    return structuredAnswer({ intent: topic === "velocity-banking" ? "velocity" : "general-finance", intentType: "navigate", topics: domainRoute.topics, confidence: domainRoute.confidence, opening: `Opening ${details.label}.`, sections: [], href: details.href, action: `Open ${details.label}` });
  }

  if (intent === "financial-health" || domainRoute.topics.includes("financial-health")) {
    const health = context.financialHealth;
    if (!health) {
      return structuredAnswer({
        intent: "financial-health",
        intentType: domainRoute.intentType,
        topics: domainRoute.topics,
        confidence: domainRoute.confidence,
        opening: "I can explain the Financial Health Score, but I cannot report a current score because the component calculation is unavailable.",
        sections: [{
          heading: "What it measures",
          paragraphs: ["It is a transparent financial-wellness measure across cash flow, debt, savings, emergency reserves, retirement progress, goal progress, consistency, and planning completeness. It is not a credit score."],
        }],
        followUp: "Open the dashboard after the current BeastMoney records finish loading.",
        href: "/dashboard/money/dashboard#financial-health-score",
        action: "Review Financial Health Score",
      });
    }
    const unavailable = health.components.filter((component) => !component.available);
    return structuredAnswer({
      intent: "financial-health",
      intentType: domainRoute.intentType,
      topics: domainRoute.topics,
      confidence: domainRoute.confidence,
      opening: `Your current Financial Health Score is ${health.score} out of 100, in the ${health.band} range. This is a financial-wellness measure, not a credit score.`,
      sections: [
        {
          heading: "How it is calculated",
          paragraphs: [health.formula],
          table: {
            columns: ["Dimension", "Score", "Weight", "Weighted points"],
            rows: health.components.map((component) => [
              component.label,
              component.available ? `${component.score}/100` : "Unavailable",
              `${component.weight}%`,
              component.available ? component.weightedPoints.toFixed(1) : "Excluded",
            ]),
          },
        },
        {
          heading: "Why it changed",
          paragraphs: [health.change.explanation],
          bullets: health.change.drivers,
        },
        {
          heading: "How to improve it",
          paragraphs: [`The clearest current opportunity is ${health.improvementPriority.label}. ${health.improvementPriority.improvement}`],
          ...(unavailable.length
            ? { bullets: unavailable.map((component) => `${component.label}: ${component.evidence[0]}`) }
            : {}),
        },
        {
          heading: "Professional boundary",
          paragraphs: [health.disclaimer],
        },
      ],
      followUp: `Would you like to work through the ${health.improvementPriority.label.toLowerCase()} inputs or options?`,
      href: "/dashboard/money/dashboard#financial-health-score",
      action: "Review Financial Health Score",
    });
  }

  const velocity = velocityResponse(domainRoute, model, execution);
  if (velocity) return velocity;

  if (domainRoute.topics.length === 1 && domainRoute.intentType === "define") {
    const topic = domainRoute.topics[0];
    const details = moneyTopicDetails[topic];
    return structuredAnswer({ intent: topic === "bills" ? "bills" : topic === "cash-flow" ? "cash-flow" : "general-finance", intentType: "define", topics: domainRoute.topics, confidence: domainRoute.confidence, opening: details.definition, sections: [{ heading: "In BeastMoney", paragraphs: ["The related workspace holds the current records and calculations; the definition itself does not depend on your current status."] }], followUp: "If helpful, I can explain how your current records relate to this concept.", href: details.href, action: `Open ${details.label}` });
  }

  if (intent === "payment-affordability") {
    const availableAboveReserve = Math.max(context.currentCash - context.cashBuffer, 0);
    const nextForecast = context.forecast[0];
    const obligations = context.billsDueSoon.reduce((sum, item) => sum + item.amount, 0) + context.debts.reduce((sum, item) => sum + item.minimumPayment, 0);
    const recommendation = context.currentCash < context.cashBuffer || context.projectedSurplus < 0 ? "I would wait before making another payment." : `A payment up to ${formatCurrency(availableAboveReserve)} stays above your protected ${formatCurrency(context.cashBuffer)} reserve, but I would check timing before committing it.`;
    return structuredAnswer({ intent, opening: recommendation, sections: [
      { heading: "Current position", table: { columns: ["Measure", "Current value"], rows: [["Available cash", formatCurrency(context.currentCash)], ["Protected reserve", formatCurrency(context.cashBuffer)], ["Above reserve", formatCurrency(availableAboveReserve)], ["Known near-term obligations", formatCurrency(obligations)], ["HELOC availability", formatCurrency(context.helocReserve)]] } },
      { heading: "Projected effect", paragraphs: [`Tracked monthly cash flow is ${context.projectedSurplus >= 0 ? `${formatCurrency(context.projectedSurplus)} positive` : `${formatCurrency(Math.abs(context.projectedSurplus))} short`}.${nextForecast ? ` The next forecast period ends at ${formatCurrency(nextForecast.cash)} with ${nextForecast.cashShortages} projected cash shortage${nextForecast.cashShortages === 1 ? "" : "s"}.` : ""}`] },
      { heading: "Explain Why", paragraphs: [model.primaryRecommendation.explainWhy] },
    ], assumptions: ["This assumes your saved balances, income, due dates, and reserve settings are current.", "This is planning guidance, not a guarantee of account availability."], followUp: "What payment amount are you considering? I can compare it with the reserve and upcoming bills.", ...dashboard });
  }

  if (intent === "bills") {
    if (!context.billsDueSoon.length) return structuredAnswer({ intent, opening: "I don’t see any bill records due in the current seven-day review window.", sections: [{ heading: "What I need", paragraphs: ["If you expected a bill here, confirm its due date and active status in Bills so I can evaluate it without guessing."] }], followUp: "Would you like to review all saved bills?", href: "/dashboard/money/cashflow#bills", action: "Open Bills" });
    const total = context.billsDueSoon.reduce((sum, bill) => sum + bill.amount, 0);
    return structuredAnswer({ intent, opening: `${context.billsDueSoon.length} bill${context.billsDueSoon.length === 1 ? "" : "s"} need the closest attention, totaling ${formatCurrency(total)}.`, sections: [
      { heading: "Bills to review", table: { columns: ["Due", "Bill", "Amount", "Status", "Income Pot"], rows: context.billsDueSoon.map((bill) => [bill.dueDate, bill.name, formatCurrency(bill.amount), bill.status || "Upcoming", bill.incomePot || "Not assigned"]) } },
      { heading: "Explain Why", paragraphs: ["These are active bills whose saved due dates fall inside the current seven-day review window. Overdue and due-today items should be handled before later items."] },
    ], followUp: "Would you like me to help match these bills to upcoming income?", href: "/dashboard/money/cashflow#bills", action: "Open Bills" });
  }

  if (intent === "debt-strategy") {
    const scenarios = context.strategyScenarios.filter((item) => item.id === "avalanche" || item.id === "snowball");
    if (!context.debts.length || scenarios.length < 2) return structuredAnswer({ intent, opening: "I can’t make a reliable avalanche-versus-snowball comparison from the records currently available.", sections: [{ heading: "What’s missing", paragraphs: ["I need current debt balances, interest rates, minimum payments, and both payoff scenarios before recommending a switch."] }], followUp: "Would you like to review the debt records that feed the comparison?", href: "/dashboard/money/debts", action: "Open Debts" });
    const avalanche = scenarios.find((item) => item.id === "avalanche")!;
    const snowball = scenarios.find((item) => item.id === "snowball")!;
    const preference = conversation.memories?.map((item) => JSON.stringify(item.value)).find((value) => /minimi[sz]e interest|quick wins|motivation/i.test(value));
    const betterInterest = avalanche.totalInterest <= snowball.totalInterest ? avalanche : snowball;
    return structuredAnswer({ intent, opening: `Based on the current payoff scenarios, I would ${context.activeDebtStrategy === betterInterest.id ? "stay with" : "consider switching to"} ${betterInterest.label}.`, sections: [
      { heading: "Strategy comparison", table: { columns: ["Strategy", "Payoff time", "Total interest", "Monthly strain", "Risk"], rows: scenarios.map((item) => [item.label, `${item.monthsToPayoff} months`, formatCurrency(item.totalInterest), formatCurrency(item.monthlyCashStrain), item.riskLevel]) } },
      { heading: "Observation", paragraphs: [`${betterInterest.label} has the lower modeled interest cost. The current strategy is ${context.activeDebtStrategy}.`] },
      { heading: "Recommendation", paragraphs: [preference ? `I also considered your saved preference: ${preference}. Current balances and scenario calculations still control the recommendation.` : "If minimizing interest is your priority, use the lower-interest scenario. If early account wins matter more, snowball may still be the better behavioral fit."] },
      { heading: "Explain Why", paragraphs: [`The comparison uses current balances, rates, minimum payments, and modeled payoff schedules across ${context.debts.length} debt account${context.debts.length === 1 ? "" : "s"}.`] },
    ], assumptions: ["Debt records and modeled extra-payment capacity are current.", "Payoff dates can change with rates, fees, or new charges."], followUp: "Is your higher priority minimizing total interest or getting faster account wins?", href: "/dashboard/money/debts", action: "Review debt strategy" });
  }

  if (intent === "changes") {
    const changeObservations = model.observations.filter((observation) =>
      ["Change", "Trend", "Improvement", "Regression", "Milestone"].includes(observation.type)
    );
    if (changeObservations.length) {
      const observations = changeObservations.slice(0, 5);
      return structuredAnswer({
        intent,
        opening: observations[0].presentation.summary,
        sections: observations.map((observation) => ({
          heading: observation.presentation.title,
          paragraphs: [
            observation.presentation.whatChanged || observation.presentation.detail,
            `Why I noticed: ${observation.presentation.whyNoticed}`,
            ...(observation.presentation.whyItMayMatter ? [`Why it may matter: ${observation.presentation.whyItMayMatter}`] : []),
            ...(observation.confidenceAnalysis?.reasons[0] ? [observation.confidenceAnalysis.reasons[0]] : []),
          ],
        })),
        assumptions: Array.from(new Set(observations.flatMap((observation) => observation.provenance.limitations))),
        followUp: "Would you like me to explain the evidence behind the highest-priority observation?",
        href: "/dashboard/money/observations",
        action: "Open Observation Center",
      });
    }
    const prior = conversation.priorSummaries?.[0] || conversation.summary;
    return structuredAnswer({ intent, opening: "I can describe the current position, but I don’t have a versioned financial snapshot that proves which account values changed since your last visit.", sections: [{ heading: "Current position", bullets: [`Cash: ${formatCurrency(context.currentCash)}`, `Debt: ${formatCurrency(context.debts.reduce((sum, item) => sum + item.balance, 0))}`, `Monthly cash flow: ${formatCurrency(context.projectedSurplus)}`] }, ...(prior ? [{ heading: "Prior conversation context", paragraphs: [`The prior discussion was summarized as: ${prior}. That summary is context, not authoritative financial data.`] }] : [])], followUp: "Would you like to review the observations supported by your current records?", href: "/dashboard/money/observations", action: "Open Observation Center" });
  }

  if (intent === "benchmarks") {
    if (!model.benchmarks.length) {
      return structuredAnswer({
        intent,
        opening: "I don’t have enough applicable reference data to make a responsible comparison yet.",
        sections: [{
          heading: "What is needed",
          paragraphs: ["A comparison needs a supported personal history, stated goal, authorized household baseline, configured threshold, or citable professional or population source. I won’t invent one."],
        }],
        followUp: "You can add a goal or build more financial history before we compare.",
        ...dashboard,
      });
    }
    const grouped = model.benchmarks.reduce<Record<string, BenchmarkResult[]>>((groups, benchmark) => {
      const label =
        benchmark.benchmarkType === "personal-historical-baseline" || benchmark.benchmarkType === "recent-trend-baseline"
          ? "Personal baseline"
          : benchmark.benchmarkType === "professional-guideline"
            ? "Professional guideline"
            : ["population-benchmark", "age-benchmark", "peer-benchmark"].includes(benchmark.benchmarkType)
              ? "Population or peer benchmark"
              : benchmark.benchmarkType === "goal-baseline"
                ? "Stated goals"
                : "Configured thresholds";
      (groups[label] ||= []).push(benchmark);
      return groups;
    }, {});
    return structuredAnswer({
      intent,
      opening: `${model.benchmarks.length} supported comparison${model.benchmarks.length === 1 ? " is" : "s are"} available from your current records and applicable reference points.`,
      sections: Object.entries(grouped).map(([heading, comparisons]) => ({
        heading,
        bullets: comparisons.map((benchmark) => `${benchmark.interpretation} This uses ${benchmark.source.name}.${benchmark.confidenceAnalysis?.reasons[0] ? ` ${benchmark.confidenceAnalysis.reasons[0]}` : ""}`),
      })),
      assumptions: Array.from(new Set(model.benchmarks.flatMap((benchmark) => [
        ...benchmark.limitations,
        ...(benchmark.confidenceAnalysis?.uncertaintyReasons || []),
      ]))),
      followUp: "Which comparison would you like me to explain in detail?",
      ...dashboard,
    });
  }

  if (intent === "non-financial") {
    return structuredAnswer({ intent, opening: "That doesn’t appear to be a financial question, but no problem.", sections: [], followUp: "I can help with bills, debt, cash flow, forecasts, payment configurations, or retirement whenever you’re ready.", ...dashboard });
  }

  if (intent === "funding" && context.paymentConfigurations.length > 0) {
    const incomplete = context.paymentConfigurations.filter(
      (configuration) => !configuration.complete
    );
    const reviews = context.paymentConfigurations.filter(
      (configuration) => configuration.reviewMessages.length > 0
    );
    return structuredAnswer({
      intent,
      opening: "Payment Account, Funding Account, and Funding Strategy describe different parts of how each obligation is paid.",
      sections: [
        {
          heading: "Current payment workflows",
          bullets: context.paymentConfigurations.map(
            (configuration) =>
              `${configuration.obligationName}: ${configuration.explanation}`
          ),
        },
        ...(incomplete.length
          ? [{
              heading: "Missing setup",
              bullets: incomplete.map(
                (configuration) =>
                  `${configuration.obligationName}: ${configuration.reviewMessages.join(" ")}`
              ),
            }]
          : []),
        ...(reviews.length
          ? [{
              heading: "Recommended improvements",
              bullets: reviews.map(
                (configuration) =>
                  `${configuration.obligationName}: ${configuration.reviewMessages.join(" ")}`
              ),
            }]
          : []),
      ],
      followUp: "Would you like to review or change one of these payment workflows?",
      href: "/dashboard/money/cashflow",
      action: "Open Cash Flow",
    });
  }

  const intentCardIds: Partial<Record<MoneyCoachIntent, string>> = { "cash-flow": "cash-flow", velocity: "velocity-banking", funding: "funding-sources", retirement: "retirement", forecast: "cash-flow" };
  if (intent === "retirement" && !context.retirementDataAvailable) return structuredAnswer({ intent, opening: "I don’t have retirement records in this review, so I can’t give you a responsible retirement assessment yet.", sections: [{ heading: "What I need", paragraphs: ["Current retirement balances, contributions, target date, and assumptions are needed before I calculate or recommend anything."] }], followUp: "Would you like to open Retirement and review those inputs?", href: "/dashboard/money/retirement", action: "Open Retirement" });
  const card = model.cards.find((item) => item.id === intentCardIds[intent]);
  if (card) return structuredAnswer({ intent, opening: card.detail, sections: [{ heading: "Explain Why", paragraphs: [card.explainWhy] }], followUp: "Would you like me to explain the assumptions or open the detailed workspace?", href: card.href, action: `Open ${card.title}` });
  return structuredAnswer({ intent, opening: model.primaryRecommendation.action, sections: [{ heading: "Explain Why", paragraphs: [model.primaryRecommendation.explainWhy] }], followUp: "Would you like me to explain the assumptions or open the detailed workspace?", href: model.primaryRecommendation.href, action: "Review the current recommendation" });
}
