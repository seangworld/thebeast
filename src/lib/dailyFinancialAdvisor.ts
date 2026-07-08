import type { CashIntelligenceResult } from "./cashIntelligence";
import type {
  FinancialDecisionDebt,
  FinancialDecisionResult,
} from "./financialDecisionEngine";
import type { FinancialForecastResult } from "./financialForecasting";
import {
  buildFinancialExplanation,
  type FinancialExplanation,
} from "./financialExplanations";
import { roundMoney } from "./formatters";
import type { VelocityBankingResult } from "./velocity";

export type DailyFinancialRecommendationKind =
  | "pay_today"
  | "wait_until_paycheck"
  | "execute_velocity_chunk"
  | "delay_payment"
  | "increase_payment"
  | "maintain";

export type DailyFinancialRecommendationRisk = "low" | "medium" | "high";

export type DailyFinancialRecommendation = {
  id: string;
  kind: DailyFinancialRecommendationKind;
  title: string;
  action: string;
  why: string;
  impact: string;
  interestSaved: number;
  payoffImprovement: string;
  risk: DailyFinancialRecommendationRisk;
  priority: number;
  explanation: FinancialExplanation;
};

export type DailyFinancialAdvisorInput = {
  cashIntelligence: CashIntelligenceResult;
  financialDecision: FinancialDecisionResult;
  financialForecast: FinancialForecastResult;
  debts?: FinancialDecisionDebt[];
  velocityBanking?: VelocityBankingResult | null;
};

export type DailyFinancialAdvisorResult = {
  generatedAt: string;
  recommendations: DailyFinancialRecommendation[];
  primaryRecommendation: DailyFinancialRecommendation;
};

function money(value: number) {
  return roundMoney(value);
}

function getTargetDebt(input: DailyFinancialAdvisorInput) {
  return input.financialDecision.targetDebt || input.debts?.[0] || null;
}

function getInterestSaved(payment: number, debt: FinancialDecisionDebt | null) {
  const apr = Number(debt?.interest_rate || 0);
  return money((Math.max(payment, 0) * apr) / 100 / 12);
}

function getForecastRisk(input: DailyFinancialAdvisorInput) {
  const hasShortage = input.financialForecast.periods.some(
    (period) => period.cashShortages > 0
  );

  if (input.financialDecision.safetyRating === "unsafe" || hasShortage) {
    return "high";
  }

  if (input.financialDecision.safetyRating === "caution") return "medium";

  return "low";
}

function sortRecommendations(recommendations: DailyFinancialRecommendation[]) {
  return [...recommendations].sort((a, b) => b.priority - a.priority);
}

export function buildDailyFinancialAdvisor(
  input: DailyFinancialAdvisorInput
): DailyFinancialAdvisorResult {
  const targetDebt = getTargetDebt(input);
  const targetName = targetDebt?.name || "the recommended debt";
  const suggestedPayment = money(input.financialDecision.suggestedExtraPayment);
  const recommendations: DailyFinancialRecommendation[] = [];
  const forecast30 = input.financialForecast.periods.find(
    (period) => period.key === "30d"
  );
  const hasCashShortage =
    forecast30 != null ? forecast30.cashShortages > 0 : false;

  if (
    input.velocityBanking?.status === "ready" &&
    input.velocityBanking.optimalChunkAmount > 0
  ) {
    recommendations.push({
      id: "execute-velocity-chunk",
      kind: "execute_velocity_chunk",
      title: "Execute Velocity chunk",
      action: input.velocityBanking.readyRecommendation || "Execute the recommended Velocity chunk.",
      why: input.velocityBanking.chunkAdvisor,
      impact: `Applies ${money(input.velocityBanking.optimalChunkAmount)} to ${input.velocityBanking.automaticTargetDebt?.name || targetName}.`,
      interestSaved: money(
        input.velocityBanking.velocityEngineResult.interest_savings
          ?.projected_interest_saved || 0
      ),
      payoffImprovement: `${input.velocityBanking.paymentSchedule.length} projected schedule month(s) generated.`,
      risk: "medium",
      priority: 95,
      explanation: buildFinancialExplanation({
        recommendation: "Execute the Velocity chunk.",
        reason: input.velocityBanking.chunkAdvisor,
        impact: `Moves ${money(input.velocityBanking.optimalChunkAmount)} from the funding source to ${input.velocityBanking.automaticTargetDebt?.name || targetName}.`,
        risks: [
          input.velocityBanking.nextChunkWaitReason ||
            "Recovery must finish before another chunk is considered.",
        ],
        assumptions: [
          "Velocity chunk, source draw, and recovery are modeled through the shared Velocity and strategy engines.",
        ],
        affectedEntities: [
          {
            id: input.velocityBanking.automaticTargetDebt?.id,
            name: input.velocityBanking.automaticTargetDebt?.name || targetName,
            type: "debt",
          },
          {
            id: input.velocityBanking.fundingSourceSelection?.id,
            name: input.velocityBanking.fundingSourceSelection?.name || "Funding source",
            type: "funding_source",
          },
        ],
      }),
    });
  }

  if (input.financialDecision.shouldWait || hasCashShortage) {
    recommendations.push({
      id: "wait-until-next-paycheck",
      kind: "wait_until_paycheck",
      title: "Wait until next paycheck",
      action: "Wait until the next income window before making an extra debt payment.",
      why: input.financialDecision.reason,
      impact: "Protects the cash reserve and reduces shortage risk.",
      interestSaved: 0,
      payoffImprovement: "Prevents a risky payoff move from weakening cash flow.",
      risk: getForecastRisk(input),
      priority: 90,
      explanation: buildFinancialExplanation({
        recommendation: "Wait before making an extra payment.",
        reason: input.financialDecision.reason,
        impact: "Protects the cash reserve and reduces the chance of a forecasted shortage.",
        risks: input.financialDecision.guardrailViolations,
        assumptions: [
          "The recommendation is based on the current cash, bills, minimums, and forecast window.",
        ],
        affectedEntities: [{ name: "Cash reserve", type: "cash" }],
      }),
    });
  }

  if (suggestedPayment > 0 && !input.financialDecision.shouldWait) {
    recommendations.push({
      id: "pay-target-today",
      kind: "pay_today",
      title: `Pay ${targetName} today`,
      action: `Pay ${money(suggestedPayment)} toward ${targetName}.`,
      why: input.financialDecision.reason,
      impact: `Reduces projected debt by ${money(suggestedPayment)} while preserving guardrails.`,
      interestSaved: getInterestSaved(suggestedPayment, targetDebt),
      payoffImprovement: "Moves the payoff schedule forward using safe extra capacity.",
      risk: getForecastRisk(input),
      priority: 85,
      explanation: buildFinancialExplanation({
        recommendation: `Pay ${money(suggestedPayment)} toward ${targetName}.`,
        reason: input.financialDecision.reason,
        impact: `Reduces principal by ${money(suggestedPayment)} while preserving guardrails.`,
        risks: input.financialDecision.guardrailViolations,
        assumptions: input.financialDecision.reasoning,
        affectedEntities: [
          {
            id: targetDebt?.id,
            name: targetName,
            type: "debt",
          },
        ],
      }),
    });
  }

  if (
    input.cashIntelligence.monthlyAvailableCash > suggestedPayment &&
    suggestedPayment > 0 &&
    !input.financialDecision.shouldWait
  ) {
    const increaseAmount = money(
      Math.min(
        input.cashIntelligence.monthlyAvailableCash - suggestedPayment,
        suggestedPayment * 0.25
      )
    );

    if (increaseAmount > 0) {
      recommendations.push({
        id: "increase-payment",
        kind: "increase_payment",
        title: "Increase payment",
        action: `Consider increasing the payment by ${increaseAmount}.`,
        why: "Monthly available cash is above the current safe extra payment.",
        impact: `Could reduce debt by an additional ${increaseAmount}.`,
        interestSaved: getInterestSaved(increaseAmount, targetDebt),
        payoffImprovement: "May shorten the payoff timeline if the extra cash remains stable.",
        risk: "medium",
        priority: 70,
        explanation: buildFinancialExplanation({
          recommendation: `Increase the payment by ${increaseAmount}.`,
          reason: "Monthly available cash is above the current safe extra payment.",
          impact: `Could reduce debt by an additional ${increaseAmount}.`,
          risks: ["Only increase if the income and bill records are current."],
          assumptions: [
            "Increase guidance is capped at 25% of the current suggested payment.",
          ],
          affectedEntities: [
            {
              id: targetDebt?.id,
              name: targetName,
              type: "debt",
            },
          ],
        }),
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "maintain-plan",
      kind: "maintain",
      title: "Maintain current plan",
      action: "Keep records current and review the next bill or payday.",
      why: input.financialDecision.reason,
      impact: "Keeps forecasts and recommendations accurate.",
      interestSaved: 0,
      payoffImprovement: "No payoff acceleration is recommended today.",
      risk: getForecastRisk(input),
      priority: 50,
      explanation: buildFinancialExplanation({
        recommendation: "Maintain the current plan.",
        reason: input.financialDecision.reason,
        impact: "Keeps records accurate until a safer payoff action is available.",
        risks: input.financialDecision.guardrailViolations,
        assumptions: ["No extra payoff capacity was identified by the shared engines."],
        affectedEntities: [{ name: "Money records", type: "strategy" }],
      }),
    });
  }

  const sorted = sortRecommendations(recommendations);

  return {
    generatedAt: new Date().toISOString(),
    recommendations: sorted,
    primaryRecommendation: sorted[0],
  };
}
