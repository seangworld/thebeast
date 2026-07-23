import {
  SharedExplainabilityEngine,
  sharedAgentActionTools,
  type BenchmarkResult,
  type ExplainabilityReport,
  type Observation,
} from "./platform/agents";
import type { MorningFinancialBriefing } from "./moneyMorningBriefing";
import {
  buildFinancialHealthScore,
  type FinancialHealthScoreResult,
} from "./financialHealthScore";

export type MissionControlTone = "positive" | "caution" | "critical" | "neutral" | "accent";

export type MissionControlHeroCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: MissionControlTone;
  href: string;
  explanation: ExplainabilityReport;
};

export type MissionControlScenario = {
  id: string;
  label: string;
  monthsToPayoff: number;
  totalInterest: number;
  monthlyCashStrain: number;
  riskLevel: string;
};

export type FinancialMissionControlModel = {
  generatedAt: string;
  heroCards: readonly MissionControlHeroCard[];
  financialHealth: FinancialHealthScoreResult;
  cashFlow: { income: number; outflow: number; surplus: number };
  spending: { bills: number; debtMinimums: number; total: number };
  savings: { monthlySurplus: number; cashEfficiency: number };
  debt: { remaining: number; progressPercent: number; monthlyReduction: number; countdown: string };
  retirement: { available: boolean; readiness: string; detail: string };
  velocity: { available: boolean; monthsToPayoff?: number; totalInterest?: number; riskLevel?: string };
  upcomingObligations: readonly { id: string; name: string; amount: number; dueLabel: string }[];
  observations: readonly { id: string; title: string; summary: string; priority: string; confidence?: string }[];
  recommendedFocus: { title: string; action: string; why: string; href: string };
  scenarios: readonly MissionControlScenario[];
  benchmarks: readonly { id: string; interpretation: string; confidence: string }[];
  morningBriefing: MorningFinancialBriefing;
};

export type BuildFinancialMissionControlInput = {
  ownerId: string;
  asOf: string;
  financialHealthScore: number;
  healthBand: string;
  healthSummary: string;
  financialHealth?: FinancialHealthScoreResult;
  monthlyIncome: number;
  monthlyOutflow: number;
  monthlyBills: number;
  debtMinimums: number;
  projectedSurplus: number;
  startingCash: number;
  cashBuffer: number;
  totalDebt: number;
  debtProgressPercent: number;
  monthlyDebtReduction: number;
  debtFreedomCountdown: string;
  cashEfficiency: number;
  retirementDataAvailable: boolean;
  scenarios: readonly MissionControlScenario[];
  upcomingObligations: readonly { id: string; name: string; amount: number; dueLabel: string }[];
  observations: readonly Observation[];
  benchmarks: readonly BenchmarkResult[];
  morningBriefing?: MorningFinancialBriefing;
  recommendedFocus: { title: string; action: string; why: string; href: string };
};

function moneyAction(toolId: string) {
  const tool = sharedAgentActionTools.require(toolId);
  const prepared = sharedAgentActionTools.prepare({
    toolId,
    specialistId: "beastmoney.money-coach",
    grantedPermissions: [tool.permission],
    actionId: `mission-control:${toolId}`,
  });
  return { toolId: prepared.toolId, title: prepared.title, target: prepared.target, confirmation: prepared.confirmation, status: prepared.status };
}

function heroExplanation(input: {
  ownerId: string;
  asOf: string;
  id: string;
  conclusion: string;
  why: string;
  evidence: readonly { id: string; statement: string }[];
  toolId: string;
  limitations?: readonly string[];
}) {
  return new SharedExplainabilityEngine(() => input.asOf).create({
    id: `mission-control:explain:${input.id}`,
    ownerId: input.ownerId,
    specialistId: "beastmoney.money-coach",
    entityType: "conclusion",
    entityId: input.id,
    conclusion: input.conclusion,
    why: input.why,
    evidence: input.evidence.map((item) => ({ ...item, source: "existing BeastMoney calculation engine", capturedAt: input.asOf, role: "supports", authoritative: true })),
    alternatives: [],
    reasoningPath: [{ id: `${input.id}:calculation`, label: "Use current BeastMoney calculation", purpose: input.why, sourceIds: input.evidence.map((item) => item.id), status: "used" }],
    action: moneyAction(input.toolId),
    limitations: input.limitations || [],
  });
}

export function buildFinancialMissionControl(input: BuildFinancialMissionControlInput): FinancialMissionControlModel {
  const financialHealth = input.financialHealth || buildFinancialHealthScore({
    monthlyIncome: input.monthlyIncome,
    monthlyOutflow: input.monthlyOutflow,
    projectedSurplus: input.projectedSurplus,
    currentCash: input.startingCash,
    cashBuffer: input.cashBuffer,
    totalDebt: input.totalDebt,
    debtMinimums: input.debtMinimums,
  });
  const aboveBuffer = input.startingCash - input.cashBuffer;
  const emergencyMonths = input.monthlyOutflow > 0 ? input.startingCash / input.monthlyOutflow : 0;
  const velocity = input.scenarios.find((scenario) => scenario.id === "velocity");
  const healthTone: MissionControlTone = financialHealth.score >= 75 ? "positive" : financialHealth.score >= 50 ? "caution" : "critical";
  const surplusTone: MissionControlTone = input.projectedSurplus > 0 ? "positive" : input.projectedSurplus < 0 ? "critical" : "neutral";
  const cashTone: MissionControlTone = aboveBuffer >= 0 ? "positive" : "critical";
  const heroCards: MissionControlHeroCard[] = [
    {
      id: "financial-health",
      label: "Financial Health Score",
      value: String(financialHealth.score),
      detail: financialHealth.band,
      trend: `Strongest: ${financialHealth.strongest.label} · Focus: ${financialHealth.improvementPriority.label}`,
      tone: healthTone,
      href: "/dashboard/money/dashboard#financial-health-score",
      explanation: heroExplanation({
        ownerId: input.ownerId,
        asOf: input.asOf,
        id: "financial-health",
        conclusion: `${financialHealth.score} (${financialHealth.band})`,
        why: financialHealth.formula,
        evidence: financialHealth.components.map((component) => ({
          id: `health-${component.id}`,
          statement: component.available
            ? `${component.label}: ${component.score}/100 × ${component.weight}% = ${component.weightedPoints.toFixed(1)} weighted points`
            : `${component.label}: unavailable and excluded from the denominator`,
        })),
        toolId: "open-money-dashboard",
        limitations: [
          financialHealth.disclaimer,
          ...financialHealth.components
            .filter((component) => !component.available)
            .map((component) => `${component.label} is unavailable from current records.`),
        ],
      }),
    },
    {
      id: "monthly-surplus",
      label: "Monthly Surplus",
      value: currency(input.projectedSurplus),
      detail: input.projectedSurplus >= 0 ? "Income exceeds tracked outflow" : "Tracked outflow exceeds income",
      trend: `${currency(input.monthlyIncome)} income · ${currency(input.monthlyOutflow)} outflow`,
      tone: surplusTone,
      href: "/dashboard/money/income",
      explanation: heroExplanation({ ownerId: input.ownerId, asOf: input.asOf, id: "monthly-surplus", conclusion: currency(input.projectedSurplus), why: "Monthly surplus is current normalized income minus known monthly outflow.", evidence: [{ id: "income", statement: `Monthly income: ${input.monthlyIncome}` }, { id: "outflow", statement: `Monthly outflow: ${input.monthlyOutflow}` }], toolId: "open-income" }),
    },
    {
      id: "cash-available",
      label: "Cash Available",
      value: currency(input.startingCash),
      detail: `${currency(Math.max(aboveBuffer, 0))} above protected reserve`,
      trend: `Reserve target ${currency(input.cashBuffer)}`,
      tone: cashTone,
      href: "/dashboard/money/cashflow",
      explanation: heroExplanation({ ownerId: input.ownerId, asOf: input.asOf, id: "cash-available", conclusion: currency(input.startingCash), why: "Cash available comes from the current Cash Intelligence snapshot and is compared with the configured reserve.", evidence: [{ id: "cash", statement: `Current cash: ${input.startingCash}` }, { id: "buffer", statement: `Protected reserve: ${input.cashBuffer}` }], toolId: "open-cash-flow" }),
    },
    {
      id: "debt-remaining",
      label: "Debt Remaining",
      value: currency(input.totalDebt),
      detail: `${input.debtProgressPercent}% current-plan progress`,
      trend: `${currency(input.monthlyDebtReduction)} modeled monthly reduction`,
      tone: input.totalDebt > 0 ? "caution" : "positive",
      href: "/dashboard/money/debts",
      explanation: heroExplanation({ ownerId: input.ownerId, asOf: input.asOf, id: "debt-remaining", conclusion: currency(input.totalDebt), why: "Debt remaining is the sum of active debt balances; progress comes from the existing Financial Insights engine.", evidence: [{ id: "debt", statement: `Active debt balance: ${input.totalDebt}` }, { id: "debt-progress", statement: `Progress: ${input.debtProgressPercent}%` }], toolId: "open-debt" }),
    },
    {
      id: "retirement-readiness",
      label: "Retirement Readiness",
      value: input.retirementDataAvailable ? "Review ready" : "Not configured",
      detail: input.retirementDataAvailable ? "Current retirement inputs are available" : "Add balances, contributions, and goals",
      trend: input.retirementDataAvailable ? "Open Retirement for the current projection" : "No readiness score is inferred",
      tone: input.retirementDataAvailable ? "accent" : "neutral",
      href: "/dashboard/money/retirement",
      explanation: heroExplanation({ ownerId: input.ownerId, asOf: input.asOf, id: "retirement-readiness", conclusion: input.retirementDataAvailable ? "Retirement inputs available" : "Retirement readiness unavailable", why: "Readiness is shown only when the existing retirement engine has member inputs.", evidence: [{ id: "retirement-availability", statement: `Retirement data available: ${input.retirementDataAvailable}` }], toolId: "open-retirement", limitations: input.retirementDataAvailable ? [] : ["No retirement readiness estimate is produced without current retirement records."] }),
    },
    {
      id: "emergency-fund",
      label: "Emergency Fund Status",
      value: input.monthlyOutflow > 0 ? `${emergencyMonths.toFixed(1)} months` : "Needs outflow data",
      detail: `${currency(input.startingCash)} compared with current outflow`,
      trend: aboveBuffer >= 0 ? "Protected reserve is currently covered" : "Cash is below the protected reserve",
      tone: aboveBuffer >= 0 ? "positive" : "critical",
      href: "/dashboard/money/cashflow",
      explanation: heroExplanation({ ownerId: input.ownerId, asOf: input.asOf, id: "emergency-fund", conclusion: input.monthlyOutflow > 0 ? `${emergencyMonths.toFixed(1)} months of current outflow` : "Emergency-fund coverage unavailable", why: "Coverage divides current cash by known monthly outflow and separately checks the configured protected reserve.", evidence: [{ id: "emergency-cash", statement: `Cash: ${input.startingCash}` }, { id: "emergency-outflow", statement: `Monthly outflow: ${input.monthlyOutflow}` }], toolId: "open-cash-flow" }),
    },
  ];
  return {
    generatedAt: input.asOf,
    heroCards,
    financialHealth,
    cashFlow: { income: input.monthlyIncome, outflow: input.monthlyOutflow, surplus: input.projectedSurplus },
    spending: { bills: input.monthlyBills, debtMinimums: input.debtMinimums, total: input.monthlyOutflow },
    savings: { monthlySurplus: Math.max(input.projectedSurplus, 0), cashEfficiency: input.cashEfficiency },
    debt: { remaining: input.totalDebt, progressPercent: input.debtProgressPercent, monthlyReduction: input.monthlyDebtReduction, countdown: input.debtFreedomCountdown },
    retirement: { available: input.retirementDataAvailable, readiness: input.retirementDataAvailable ? "Ready for review" : "Not configured", detail: input.retirementDataAvailable ? "Open the retirement projection for full assumptions." : "Add retirement records before evaluating readiness." },
    velocity: { available: Boolean(velocity), monthsToPayoff: velocity?.monthsToPayoff, totalInterest: velocity?.totalInterest, riskLevel: velocity?.riskLevel },
    upcomingObligations: input.upcomingObligations,
    observations: input.observations.slice(0, 5).map((observation) => ({ id: observation.id, title: observation.presentation.title, summary: observation.presentation.summary, priority: observation.assessment.priority, confidence: observation.confidenceAnalysis?.confidence })),
    recommendedFocus: input.recommendedFocus,
    scenarios: input.scenarios,
    benchmarks: input.benchmarks.slice(0, 4).map((benchmark) => ({ id: benchmark.id, interpretation: benchmark.interpretation, confidence: benchmark.confidenceAnalysis?.confidence || benchmark.confidence })),
    morningBriefing:
      input.morningBriefing || {
        id: `morning-briefing:${input.ownerId}:${input.asOf.slice(0, 10)}`,
        ownerId: input.ownerId,
        generatedAt: input.asOf,
        since: input.asOf,
        greeting: "Financial briefing",
        summary: "Current dashboard records are ready for review.",
        items: [],
        recommendedFocus: {
          title: input.recommendedFocus.title,
          detail: input.recommendedFocus.action,
          href: input.recommendedFocus.href,
        },
        freshness: {
          label: "unknown",
          confidenceNote: "No freshness assessment was supplied.",
        },
      },
  };
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
