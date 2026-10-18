import type { MoneyCoachContextRows } from "./digitalStaffRuntime/moneyContext";
import type { CashIntelligenceResult } from "./cashIntelligence";
import { isDebtPayoffEligible } from "./debtLifecycle";
import { isOneTimeFrequency, normalizeRecurringAmountToMonthly } from "./financialMetrics";
import { runUnifiedStrategyEngine } from "./unifiedStrategyEngine";

/** Evidence/interpretation adapter around existing engines, never a second financial engine. */
export function moneyCoachFinancialAssessment(rows: MoneyCoachContextRows, cash: CashIntelligenceResult, asOf: Date) {
  const active = (row: Record<string, unknown>) => row.is_active !== false && row.is_archived !== true;
  const incomes = rows.incomes.filter(active), bills = rows.bills.filter(active), allDebts = rows.debts.filter(active), debts = allDebts.filter(isDebtPayoffEligible);
  const numeric = (v: unknown, negative = false) => (typeof v === "number" || typeof v === "string" && v.trim() !== "") && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 1_000_000_000 && (negative || Number(v) >= 0);
  const source = (row: Record<string, unknown>, kind: string) => `${kind}:${typeof row.id === "string" ? row.id : "unidentified"}`;
  const issues: Array<{ code: string; source: string; detail: string; blocks: "cash" | "payoff" | "none" }> = [];
  for (const field of ["starting_balance", "checking_buffer"]) if (!numeric(rows.cashSettings?.[field], field === "starting_balance")) issues.push({ code: "missing_or_invalid_amount", source: `cash_settings:${field}`, detail: `${field} is unknown or invalid; do not substitute zero.`, blocks: "cash" });
  for (const [kind, records, fields] of [["income", incomes, ["amount"]], ["bill", bills, ["amount"]], ["debt", allDebts, ["balance", "minimum_payment"]]] as const) {
    for (const row of records) for (const field of fields) if (!numeric(row[field])) issues.push({ code: "missing_or_invalid_amount", source: source(row, kind), detail: `${field} is unknown or invalid; do not substitute zero.`, blocks: "cash" });
  }
  const disputedIncome = incomes.filter(row => !isOneTimeFrequency(String(row.frequency || "")) && /\b(?:reimbursement|refund|one[- ]time|one[- ]off|windfall)\b/i.test(String(row.name || "")));
  for (const row of disputedIncome) issues.push({ code: "recurrence_requires_confirmation", source: source(row, "income"), detail: "Saved recurrence conflicts with a potentially nonrecurring payment label. Confirm classification; do not treat it as reliable recurring income or silently edit the source.", blocks: "cash" });
  for (const row of [...incomes, ...bills]) {
    if (!row.frequency) issues.push({ code: "frequency_assumption", source: source(row, "schedule"), detail: "Canonical legacy frequency defaults to monthly; recurrence is not independently confirmed.", blocks: "cash" });
    else if (!/^(?:weekly|biweekly|bi-weekly|semi-monthly|semimonthly|monthly|annual|annually|yearly|quarterly|every_[236]_months)$/i.test(String(row.frequency)) && !isOneTimeFrequency(String(row.frequency))) issues.push({ code: "unsupported_frequency", source: source(row, "schedule"), detail: "Unsupported frequency cannot substantiate a recurring cash projection.", blocks: "cash" });
  }
  for (const row of incomes) if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.next_date || "")) || !Number.isFinite(Date.parse(String(row.next_date)))) issues.push({ code: "missing_income_date", source: source(row, "income"), detail: "Income timing is unavailable; monthly arithmetic is not proof that obligations clear on time.", blocks: "cash" });
  for (const row of [...bills,...debts]) {
    const due=Number(row.due_date),override=row.next_due_date_after_payment;
    const hasOverride=typeof override === "string" && Number.isFinite(Date.parse(override));
    if (!hasOverride && !(Number.isInteger(due) && due>=1 && due<=31)) issues.push({code:"missing_due_date",source:source(row,"obligation"),detail:"Obligation timing is unavailable; a default day cannot establish personal affordability.",blocks:"cash"});
    if (hasOverride && String(override).slice(0,10)<asOf.toISOString().slice(0,10)) issues.push({code:"stale_due_override",source:source(row,"obligation"),detail:"Saved next-due override predates this review; confirm the current obligation cycle.",blocks:"cash"});
  }
  for (const row of [...incomes,...bills]) if (/^(?:semi-monthly|semimonthly)$/i.test(String(row.frequency))) issues.push({code:"unsupported_semimonthly_timing",source:source(row,"schedule"),detail:"The current dated cash engine has no two-date semimonthly schedule; monthly averaging is not proof of payment timing.",blocks:"cash"});
  for (const row of debts) if (!numeric(row.interest_rate) || Number(row.interest_rate) > 100) issues.push({ code: "missing_or_invalid_apr", source: source(row, "debt"), detail: "APR is unavailable or outside the supported range; zero APR must be explicit.", blocks: "payoff" });
  const promotional = debts.some(row => /\b(?:promo|promotional|introductory|deferred)\b/i.test(String(row.name || "")));
  if (promotional) issues.push({ code: "promotional_terms_unavailable", source: "debt", detail: "Promotional expiry, post-promo APR and deferred-interest terms are not supported by the current saved debt model. Do not certify an expiry-aware payoff comparison.", blocks: "payoff" });
  const cashVerified = !issues.some(i => i.blocks === "cash");
  const lowest = cash.simulatedTimeline.reduce((min, event) => event.balance < min.balance ? { balance: event.balance, date: event.date.toISOString().slice(0, 10) } : min, { balance: Number(rows.cashSettings?.starting_balance) || 0, date: asOf.toISOString().slice(0, 10) });
  const extraRaw = rows.debtSettings?.extra_payment ?? 0;
  if (!numeric(extraRaw)) issues.push({ code: "invalid_extra_payment", source: "debt_settings", detail: "Extra debt payment is invalid; no comparison is certified.", blocks: "payoff" });
  const extra = cashVerified ? Math.max(0, Math.min(Number(extraRaw) || 0, cash.monthlyAvailableCash, cash.safeAttackAmount, lowest.balance - Number(rows.cashSettings?.checking_buffer))) : 0;
  const comparisons = cashVerified && !issues.some(i => i.blocks === "payoff") && debts.length > 0 && debts.length <= 50 ? (["minimum", "snowball", "avalanche"] as const).map(strategy => {
    const result = runUnifiedStrategyEngine({ debts: debts.map(row => ({ id: String(row.id), name: String(row.name || "Unnamed debt"), balance: Number(row.balance), minimum_payment: Number(row.minimum_payment), interest_rate: Number(row.interest_rate), payment_behavior: row.payment_behavior === "revolving" ? "revolving" : "fixed" })), strategy, extraPayment: strategy === "minimum" ? 0 : extra });
    return { strategy, extraMonthly: strategy === "minimum" ? 0 : extra, totalInterest: result.total_interest, totalPaid: result.total_paid, monthsToPayoff: result.payoff_complete ? result.months_to_payoff : null, payoffCompleteWithinModel: result.payoff_complete, firstTarget: result.first_target, assumptions: result.calculation_assumptions };
  }) : [];
  const facts = {
    recurringIncomeExcludingDisputed: Math.round(incomes.filter(row => !disputedIncome.includes(row)).reduce((n,row) => n + normalizeRecurringAmountToMonthly(row.amount, String(row.frequency || "")),0)*100)/100,
    disputedIncomeSources: disputedIncome.map(row => source(row,"income")),
    oneTimeIncomeSources: incomes.filter(row => isOneTimeFrequency(String(row.frequency))).map(row => source(row,"income")),
    lowestProjectedBalance: cashVerified ? lowest : null,
    cashShortfall: cashVerified ? lowest.balance < Number(rows.cashSettings?.checking_buffer) || cash.monthlyAvailableCash < 0 : null,
    supportedExtraPayment: cashVerified ? Math.round(extra*100)/100 : null,
    requestedExtraPayment: numeric(extraRaw) ? Number(extraRaw) : null,
  };
  return {
    version: "money-coach-analysis-v1", asOf: asOf.toISOString(), provenance: "Current owner-scoped saved records; not independently bank-verified balances or future guarantees.",
    cashVerified, issues, facts, debtComparisons: comparisons,
    evidence: { incomeIds: incomes.map(r=>source(r,"income")), billIds: bills.map(r=>source(r,"bill")), debtIds: debts.map(r=>source(r,"debt")), sourceTimestampsAvailable: [...incomes,...bills,...debts].every(r=>typeof r.updated_at === "string"), rowsUsed: { income: incomes.length, bills: bills.length, debts: debts.length } },
    priorities: !cashVerified ? ["Resolve the identified source uncertainty before certifying affordability; explain available arithmetic conditionally."] : facts.cashShortfall ? ["Protect essential obligations and the cash buffer before extra debt payments; review the dated shortfall."] : ["Compare the canonical alternatives against the member's objective; distinguish interest savings from quick account wins and cash reserves."],
    limitations: ["Debt models assume constant saved APRs and recurring payments; no promotional-rate schedule or guarantee is supported.", "Credit availability is borrowing capacity, not income or cash savings.", "Scheduled obligations are conservative saved-record projections; this packet does not reconcile payment history, pending bank transactions or every living expense. Cash availability is conditional on those omissions being reviewed.", "Savings goals are aspirations, not achieved balances. Retirement scenarios are assumptions; no tax, investment return, withdrawal or retirement-date guarantee.", "No payment, transfer, account connection or financial-record modification was executed.", ...(debts.length > 50 ? ["Debt comparison omitted above the 50-debt computation bound."] : [])],
  };
}
