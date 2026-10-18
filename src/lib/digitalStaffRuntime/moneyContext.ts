import { buildCashIntelligence } from "../cashIntelligence";
import { getDebtLifecycleStatus, isDebtPayoffEligible } from "../debtLifecycle";
import { numberValue } from "../financialMetrics";
import { moneyCoachFinancialAssessment } from "../moneyCoachAnalysis";

type MoneyRow = Record<string, unknown>;

export const moneyCoachCashSettingsColumns = "starting_balance, checking_buffer";
export const moneyCoachFundingSourceColumns = "id, name, current_balance, credit_limit, available_credit, is_active, created_at";

export type MoneyCoachContextRows = {
  debts: MoneyRow[];
  bills: MoneyRow[];
  incomes: MoneyRow[];
  cashSettings: MoneyRow | null;
  fundingSources: MoneyRow[];
  goals: MoneyRow[];
  debtSettings?: MoneyRow | null;
  retirementScenarios?: MoneyRow[];
};

function active(rows: MoneyRow[]) {
  return rows.filter((row) => row.is_archived !== true && row.is_active !== false);
}

function structured(domain: string, rows: MoneyRow[], limit: number) {
  return rows.slice(0, limit).map((record) => ({
    domain,
    record: structuredClone(record),
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : undefined,
  }));
}

/**
 * Builds one deterministic affordability summary from the same canonical
 * BeastMoney calculation used by the product, then appends a bounded,
 * balanced set of supporting rows for explanation.
 */
export function buildMoneyCoachStructuredRecords(
  rows: MoneyCoachContextRows,
  asOfDate = new Date()
) {
  const debts = active(rows.debts);
  const payableDebts = debts.filter(isDebtPayoffEligible);
  const bills = active(rows.bills);
  const incomes = active(rows.incomes);
  const fundingSources = active(rows.fundingSources);
  const currentCash = numberValue(rows.cashSettings?.starting_balance);
  const cashBuffer = numberValue(rows.cashSettings?.checking_buffer);
  const cash = buildCashIntelligence({
    asOfDate,
    income: incomes,
    bills: bills.map(row => ({ ...row, nextDueDateOverride: typeof row.next_due_date_after_payment === "string" ? row.next_due_date_after_payment : undefined })),
    debtMinimums: payableDebts.map(row => ({ ...row, nextDueDateOverride: typeof row.next_due_date_after_payment === "string" ? row.next_due_date_after_payment : undefined })),
    fundingSources,
    settings: { currentCash, cashBuffer, lookaheadDays: 30 },
  });
  const financialAssessment = moneyCoachFinancialAssessment(rows, cash, asOfDate);

  const canonicalSummary = {
    domain: "beastmoney.money-coach:canonical-affordability",
    record: {
      asOf: asOfDate.toISOString(),
      safeToSpendToday: cash.currentAvailableCash,
      projectedAvailableCash: cash.projectedAvailableCash,
      requiredCashNext30Days: cash.requiredCash,
      billsDueNext30Days: cash.billsDue,
      incomeExpectedNext30Days: cash.incomeExpected,
      monthlyIncome: cash.monthlyIncome,
      monthlyBills: cash.monthlyBills,
      monthlyDebtMinimums: cash.monthlyDebtMinimums,
      monthlyAvailableCash: cash.monthlyAvailableCash,
      projectedCashBalance: cash.projectedCashBalance,
      safeFundingSourceCapacity: cash.safeFundingSourceCapacity,
      activeDebtCount: debts.length,
      openZeroBalanceDebtCount: debts.filter(
        (debt) => getDebtLifecycleStatus(debt) === "open_zero_balance"
      ).length,
      activeBillCount: bills.length,
      activeIncomeCount: incomes.length,
      activeFundingSourceCount: fundingSources.length,
      moneyGoalCount: rows.goals.length,
      activeDebtStrategy: typeof rows.debtSettings?.strategy === "string" ? rows.debtSettings.strategy : "minimum",
      plannedExtraDebtPayment: numberValue(rows.debtSettings?.extra_payment),
      retirementScenarioCount: rows.retirementScenarios?.length || 0,
      retirementDataAvailable: Boolean(rows.retirementScenarios?.length),
      calculation: "canonical BeastMoney Cash Intelligence; saved records only",
      financialAssessment,
      ...(!financialAssessment.cashVerified ? Object.fromEntries([
        "safeToSpendToday", "projectedAvailableCash", "requiredCashNext30Days", "billsDueNext30Days", "incomeExpectedNext30Days", "monthlyIncome", "monthlyBills", "monthlyDebtMinimums", "monthlyAvailableCash", "projectedCashBalance",
      ].map(key => [key, null])) : {}),
      currentCash: financialAssessment.issues.some(issue => issue.source === "cash_settings:starting_balance") ? null : currentCash,
      cashBuffer: financialAssessment.issues.some(issue => issue.source === "cash_settings:checking_buffer") ? null : cashBuffer,
    },
    updatedAt: asOfDate.toISOString(),
  };

  return [
    canonicalSummary,
    ...structured("beastmoney.money-coach:debt", debts, 4),
    ...structured("beastmoney.money-coach:bill", bills, 3),
    ...structured("beastmoney.money-coach:income", incomes, 3),
    ...structured("beastmoney.money-coach:funding", fundingSources, 2),
    ...structured("beastmoney.money-coach:goal", rows.goals.map(goal => ({ ...goal, context_note: "Member aspiration for advice, not actual income, an achieved fact, or permission to change records." })), 2),
    ...structured("beastmoney.money-coach:retirement-scenario", rows.retirementScenarios || [], 2),
  ].slice(0, 20);
}
