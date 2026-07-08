import type { CashIntelligenceResult } from "./cashIntelligence";
import type { DailyFinancialAdvisorResult } from "./dailyFinancialAdvisor";
import type { FinancialForecastResult } from "./financialForecasting";
import type { FinancialInsightsResult } from "./financialInsights";
import type { FinancialScenarioComparisonResult } from "./financialScenarios";
import type { VelocityBankingResult } from "./velocity";

export type FinancialReportKind =
  | "monthly"
  | "debt_progress"
  | "interest_saved"
  | "net_worth"
  | "velocity";

export type FinancialReportSection = {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
};

export type FinancialReport = {
  id: string;
  kind: FinancialReportKind;
  title: string;
  subtitle: string;
  printable: true;
  sections: FinancialReportSection[];
};

export type FinancialReportsInput = {
  cashIntelligence: CashIntelligenceResult;
  forecast: FinancialForecastResult;
  insights: FinancialInsightsResult;
  advisor: DailyFinancialAdvisorResult;
  scenarios: FinancialScenarioComparisonResult;
  velocity?: VelocityBankingResult | null;
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

function section(title: string, rows: FinancialReportSection["rows"]) {
  return { title, rows };
}

export function buildFinancialReports(input: FinancialReportsInput): FinancialReport[] {
  const forecast30 = input.forecast.periods.find((period) => period.key === "30d");
  const forecast1y = input.forecast.periods.find((period) => period.key === "1y");
  const velocity = input.velocity;

  return [
    {
      id: "monthly-financial-report",
      kind: "monthly",
      title: "Monthly Financial Report",
      subtitle: "Cash, bills, minimums, and recommended action.",
      printable: true,
      sections: [
        section("Cash", [
          { label: "Monthly income", value: money(input.cashIntelligence.monthlyIncome) },
          { label: "Monthly bills", value: money(input.cashIntelligence.monthlyBills) },
          { label: "Monthly available cash", value: money(input.cashIntelligence.monthlyAvailableCash) },
        ]),
        section("Recommendation", [
          { label: "Today", value: input.advisor.primaryRecommendation.title },
          { label: "Risk", value: input.advisor.primaryRecommendation.risk },
        ]),
      ],
    },
    {
      id: "debt-progress-report",
      kind: "debt_progress",
      title: "Debt Progress Report",
      subtitle: "Projected debt reduction and payoff timeline.",
      printable: true,
      sections: [
        section("Progress", [
          { label: "30-day debt reduction", value: money(input.insights.monthlyProgress.debtReduction) },
          { label: "1-year debt reduction", value: money(input.insights.yearlyProgress.debtReduction) },
          { label: "Debt freedom countdown", value: input.insights.debtFreedomCountdown },
        ]),
      ],
    },
    {
      id: "interest-saved-report",
      kind: "interest_saved",
      title: "Interest Saved Report",
      subtitle: "Interest impact from the optimized plan.",
      printable: true,
      sections: [
        section("Interest", [
          { label: "Projected interest saved", value: money(input.insights.interestSaved) },
          { label: "Best scenario", value: input.scenarios.bestByInterest.label },
          { label: "Best scenario interest saved", value: money(input.scenarios.bestByInterest.interestSaved) },
        ]),
      ],
    },
    {
      id: "net-worth-report",
      kind: "net_worth",
      title: "Net Worth / Net Debt Report",
      subtitle: "Cash, debt, and projected net position.",
      printable: true,
      sections: [
        section("Net Position", [
          { label: "30-day net worth", value: money(forecast30?.netWorth || 0) },
          { label: "1-year net worth", value: money(forecast1y?.netWorth || 0) },
          { label: "30-day debt", value: money(forecast30?.debt || 0) },
        ]),
      ],
    },
    {
      id: "velocity-banking-report",
      kind: "velocity",
      title: "Velocity Banking Report",
      subtitle: "Chunk, source, recovery, and next-chunk timing.",
      printable: true,
      sections: [
        section("Velocity", [
          { label: "Status", value: velocity?.status || "Not evaluated" },
          { label: "Optimal chunk", value: money(velocity?.optimalChunkAmount || 0) },
          { label: "Next chunk timing", value: velocity?.nextChunkWaitReason || "Run Velocity to evaluate timing." },
        ]),
      ],
    },
  ];
}
