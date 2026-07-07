import type { CashIntelligenceResult } from "../cashIntelligence";
import type { FinancialDecisionResult } from "../financialDecisionEngine";
import {
  runUnifiedStrategyEngine,
  type UnifiedStrategyDebt,
  type UnifiedStrategyResult,
} from "../unifiedStrategyEngine";
import { roundMoney } from "../formatters";
import { runVelocityEngine } from "./engine";
import type {
  VelocityAccountSnapshot,
  VelocityEngineResult,
  VelocityInputSnapshot,
} from "./types";

export type VelocityBankingStatus = "ready" | "wait";

export type VelocityFundingSourceSelection = {
  id?: string;
  name: string;
  type: VelocityAccountSnapshot["type"];
  availableCredit: number;
  safeCapacity: number;
  interestRate: number;
  reason: string;
};

export type VelocityChunkCalendarItem = {
  month: number;
  dateLabel: string;
  type: "chunk" | "recovery" | "complete" | "wait";
  label: string;
  amount: number;
  detail: string;
};

export type VelocityBankingResult = {
  status: VelocityBankingStatus;
  optimalChunkAmount: number;
  optimalChunkTiming: string;
  postChunkTargetDebtBalance: number;
  postChunkFundingSourceBalance: number;
  postChunkFundingSourceUtilization: number;
  postChunkNetDebt: number;
  netWorthImpact: number;
  nextChunkEligibleMonth: number | null;
  nextChunkWaitReason: string | null;
  recoveryDetected: boolean;
  recoveryTimeline: VelocityEngineResult["recovery_timeline"];
  fundingSourceSelection: VelocityFundingSourceSelection | null;
  automaticTargetDebt: VelocityEngineResult["target_debt"];
  chunkAdvisor: string;
  waitRecommendation: string | null;
  readyRecommendation: string | null;
  chunkCalendar: VelocityChunkCalendarItem[];
  paymentSchedule: UnifiedStrategyResult["payment_schedule"];
  strategyResult: UnifiedStrategyResult;
  velocityEngineResult: VelocityEngineResult;
};

export type VelocityBankingEngineInput = {
  velocityInputSnapshot: VelocityInputSnapshot;
  cashIntelligence?: CashIntelligenceResult | null;
  financialDecision?: FinancialDecisionResult | null;
  velocityEngineResult?: VelocityEngineResult;
};

function money(value: number) {
  return roundMoney(value);
}

function getCreditAccounts(input: VelocityInputSnapshot) {
  return input.accounts.filter(
    (account) => Number(account.credit_limit || 0) > 0
  );
}

function selectFundingSource(
  input: VelocityInputSnapshot,
  chunkAmount: number
): VelocityFundingSourceSelection | null {
  const maxUtilization =
    Number(input.settings.max_source_utilization_percent || 100) / 100;
  const reserve = Number(input.settings.minimum_cash_after_payment || 0);
  const candidates = getCreditAccounts(input)
    .map((account) => {
      const creditLimit = Number(account.credit_limit || 0);
      const balance = Number(account.current_balance || 0);
      const availableCredit = Math.max(
        Number(account.available_credit ?? creditLimit - balance),
        0
      );
      const utilizationCapacity = Math.max(creditLimit * maxUtilization - balance, 0);
      const safeCapacity = money(Math.max(Math.min(availableCredit, utilizationCapacity) - reserve, 0));

      return {
        id: account.id,
        name: account.name || "Velocity source",
        type: account.type,
        availableCredit,
        safeCapacity,
        interestRate: Number(account.interest_rate || 0),
        reason:
          safeCapacity >= chunkAmount
            ? "Selected because it can cover the recommended chunk within utilization and reserve guardrails."
            : "Available as a source, but safe capacity is below the recommended chunk.",
      };
    })
    .sort((a, b) => {
      const capacitySort = b.safeCapacity - a.safeCapacity;
      if (capacitySort !== 0) return capacitySort;
      return a.interestRate - b.interestRate;
    });

  return candidates[0] || null;
}

function getNextIncomeDate(input: VelocityInputSnapshot) {
  const nextIncome = input.incomes
    .map((income) => income.next_date)
    .filter(Boolean)
    .sort()[0];

  return nextIncome || input.as_of_date || new Date().toISOString();
}

function getAccountBalance(
  input: VelocityInputSnapshot,
  accountId: string | undefined
) {
  if (!accountId) return 0;

  return Number(
    input.accounts.find((account) => account.id === accountId)?.current_balance || 0
  );
}

function getPostChunkFundingSourceUtilization({
  input,
  source,
  postChunkBalance,
}: {
  input: VelocityInputSnapshot;
  source: VelocityFundingSourceSelection | null;
  postChunkBalance: number;
}) {
  if (!source?.id) return 0;

  const creditLimit = Number(
    input.accounts.find((account) => account.id === source.id)?.credit_limit || 0
  );

  return creditLimit > 0 ? money((postChunkBalance / creditLimit) * 100) : 0;
}

function getFirstRecoveryCompleteMonth(strategyResult: UnifiedStrategyResult) {
  const recoveryRows = strategyResult.payment_schedule.filter(
    (row) => Number(row.velocity_source_payment || 0) > 0
  );

  if (recoveryRows.length === 0) return null;

  return (
    recoveryRows.find((row) => Number(row.velocity_source_balance || 0) <= 0)
      ?.month || null
  );
}

function buildChunkCalendar({
  status,
  chunkAmount,
  timing,
  strategyResult,
}: {
  status: VelocityBankingStatus;
  chunkAmount: number;
  timing: string;
  strategyResult: UnifiedStrategyResult;
}): VelocityChunkCalendarItem[] {
  if (status === "wait") {
    return [
      {
        month: 0,
        dateLabel: timing,
        type: "wait",
        label: "Wait",
        amount: 0,
        detail: "Guardrails recommend waiting before creating a Velocity chunk.",
      },
    ];
  }

  const calendar: VelocityChunkCalendarItem[] = [
    {
      month: 0,
      dateLabel: timing,
      type: "chunk",
      label: "Make Velocity chunk",
      amount: chunkAmount,
      detail: "Apply the chunk to the selected target debt.",
    },
  ];

  strategyResult.payment_schedule
    .filter((row) => Number(row.velocity_source_payment || 0) > 0)
    .slice(0, 6)
    .forEach((row) => {
      calendar.push({
        month: row.month,
        dateLabel: `Month ${row.month}`,
        type: "recovery",
        label: "Recover funding source",
        amount: Number(row.velocity_source_payment || 0),
        detail: `Projected source balance: ${money(Number(row.velocity_source_balance || 0))}.`,
      });
    });

  const finalRecovery = strategyResult.payment_schedule.find(
    (row) =>
      Number(row.velocity_source_payment || 0) > 0 &&
      Number(row.velocity_source_balance || 0) <= 0
  );

  if (finalRecovery) {
    calendar.push({
      month: finalRecovery.month,
      dateLabel: `Month ${finalRecovery.month}`,
      type: "complete",
      label: "Recovery complete",
      amount: 0,
      detail: "Funding source is projected to be recovered.",
    });
  }

  return calendar;
}

export function runVelocityBankingEngine(
  input: VelocityBankingEngineInput
): VelocityBankingResult {
  const velocityEngineResult =
    input.velocityEngineResult || runVelocityEngine(input.velocityInputSnapshot);
  const engineChunk = money(
    Math.max(velocityEngineResult.chunk_recommendation?.recommended_chunk || 0, 0)
  );
  const decisionChunk =
    input.financialDecision && input.financialDecision.suggestedExtraPayment > 0
      ? input.financialDecision.suggestedExtraPayment
      : engineChunk;
  const optimalChunkAmount = money(Math.min(engineChunk, decisionChunk));
  const status: VelocityBankingStatus =
    optimalChunkAmount > 0 &&
    !velocityEngineResult.chunk_recommendation?.hold_reason &&
    input.financialDecision?.shouldWait !== true
      ? "ready"
      : "wait";
  const optimalChunkTiming =
    status === "ready"
      ? input.velocityInputSnapshot.as_of_date || new Date().toISOString()
      : getNextIncomeDate(input.velocityInputSnapshot);
  const fundingSourceSelection = selectFundingSource(
    input.velocityInputSnapshot,
    optimalChunkAmount
  );
  const monthlyRecoveryCapacity = money(
    Math.max(
      Number(input.velocityInputSnapshot.settings.monthly_recovery_capacity || 0),
      0
    )
  );
  const recoveryPaymentPool =
    input.financialDecision && input.financialDecision.suggestedExtraPayment > 0
      ? money(Math.min(input.financialDecision.suggestedExtraPayment, monthlyRecoveryCapacity))
      : monthlyRecoveryCapacity;
  const strategyResult = runUnifiedStrategyEngine({
    debts: input.velocityInputSnapshot.debts as UnifiedStrategyDebt[],
    strategy: "velocity",
    cashIntelligence: input.cashIntelligence || undefined,
    financialDecision: input.financialDecision || undefined,
    extraPayment: recoveryPaymentPool,
    velocityInputSnapshot: input.velocityInputSnapshot,
    velocityEngineResult,
    velocityTargetDebtId:
      velocityEngineResult.recommendation?.debt_id ||
      velocityEngineResult.target_debt?.id,
  });
  const sourceStartingBalance = getAccountBalance(
    input.velocityInputSnapshot,
    fundingSourceSelection?.id
  );
  const sourceChunkApplied = Number(strategyResult.velocity_chunk_applied || 0);
  const postChunkFundingSourceBalance = money(sourceStartingBalance + sourceChunkApplied);
  const postChunkTargetDebtBalance = money(
    Math.max(
      Number(velocityEngineResult.target_debt?.balance || 0) - sourceChunkApplied,
      0
    )
  );
  const nonTargetDebtBalance = input.velocityInputSnapshot.debts
    .filter((debt) => debt.id !== velocityEngineResult.target_debt?.id)
    .reduce((sum, debt) => sum + Number(debt.balance || 0), 0);
  const postChunkNetDebt = money(
    nonTargetDebtBalance + postChunkTargetDebtBalance + postChunkFundingSourceBalance
  );
  const preChunkNetDebt = money(
    input.velocityInputSnapshot.debts.reduce(
      (sum, debt) => sum + Number(debt.balance || 0),
      0
    ) + sourceStartingBalance
  );
  const recoveryDetected =
    Number(strategyResult.velocity_source_paid || 0) >=
      Number(strategyResult.velocity_chunk_applied || 0) &&
    Number(strategyResult.velocity_chunk_applied || 0) > 0;
  const waitRecommendation =
    status === "wait"
      ? velocityEngineResult.chunk_recommendation?.limiting_constraint_label ||
        input.financialDecision?.reason ||
        "Wait until cash, recovery, and source guardrails are ready."
      : null;
  const readyRecommendation =
    status === "ready"
      ? `Ready to apply ${money(optimalChunkAmount)} to ${
          velocityEngineResult.target_debt?.name || "the selected debt"
        }.`
      : null;
  const nextChunkEligibleMonth = getFirstRecoveryCompleteMonth(strategyResult);
  const nextChunkWaitReason =
    sourceChunkApplied > 0 && nextChunkEligibleMonth == null
      ? "Wait until the funding source is recovered before considering another Velocity chunk."
      : sourceChunkApplied > 0
      ? `Wait until month ${nextChunkEligibleMonth} recovery completes before considering another Velocity chunk.`
      : waitRecommendation;

  return {
    status,
    optimalChunkAmount,
    optimalChunkTiming,
    postChunkTargetDebtBalance,
    postChunkFundingSourceBalance,
    postChunkFundingSourceUtilization: getPostChunkFundingSourceUtilization({
      input: input.velocityInputSnapshot,
      source: fundingSourceSelection,
      postChunkBalance: postChunkFundingSourceBalance,
    }),
    postChunkNetDebt,
    netWorthImpact: money(preChunkNetDebt - postChunkNetDebt),
    nextChunkEligibleMonth,
    nextChunkWaitReason,
    recoveryDetected,
    recoveryTimeline: velocityEngineResult.recovery_timeline,
    fundingSourceSelection,
    automaticTargetDebt: velocityEngineResult.target_debt,
    chunkAdvisor: readyRecommendation || waitRecommendation || "Review Velocity guardrails.",
    waitRecommendation,
    readyRecommendation,
    chunkCalendar: buildChunkCalendar({
      status,
      chunkAmount: optimalChunkAmount,
      timing: optimalChunkTiming,
      strategyResult,
    }),
    paymentSchedule: strategyResult.payment_schedule,
    strategyResult,
    velocityEngineResult,
  };
}
