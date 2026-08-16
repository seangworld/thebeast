import { buildCashIntelligence } from "../cashIntelligence";
import { numberValue } from "../financialMetrics";

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
};

function active(rows: MoneyRow[]) {
  return rows.filter((row) => row.is_archived !== true && row.is_active !== false);
}

function structured(domain: string, rows: MoneyRow[], limit: number) {
  return rows.slice(0, limit).map((record) => ({
    domain,
    record,
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
  const bills = active(rows.bills);
  const incomes = active(rows.incomes);
  const fundingSources = active(rows.fundingSources);
  const currentCash = numberValue(rows.cashSettings?.starting_balance);
  const cashBuffer = numberValue(rows.cashSettings?.checking_buffer);
  const cash = buildCashIntelligence({
    asOfDate,
    income: incomes,
    bills,
    debtMinimums: debts,
    fundingSources,
    settings: { currentCash, cashBuffer, lookaheadDays: 30 },
  });

  const canonicalSummary = {
    domain: "beastmoney.money-coach:canonical-affordability",
    record: {
      asOf: asOfDate.toISOString(),
      currentCash,
      cashBuffer,
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
      activeBillCount: bills.length,
      activeIncomeCount: incomes.length,
      activeFundingSourceCount: fundingSources.length,
      moneyGoalCount: rows.goals.length,
      calculation: "canonical BeastMoney Cash Intelligence; saved records only",
    },
    updatedAt: asOfDate.toISOString(),
  };

  return [
    canonicalSummary,
    ...structured("beastmoney.money-coach:debt", debts, 5),
    ...structured("beastmoney.money-coach:bill", bills, 5),
    ...structured("beastmoney.money-coach:income", incomes, 4),
    ...structured("beastmoney.money-coach:funding", fundingSources, 2),
    ...structured("beastmoney.money-coach:goal", rows.goals, 3),
  ].slice(0, 20);
}
