"use client";

import { useMemo } from "react";
import FundingSourcesSummaryCards from "./components/FundingSourcesSummaryCards";
import PaymentSourceCoverage from "./components/PaymentSourceCoverage";
import FundingIntelligence from "./components/FundingIntelligence";
import FundingRecommendations from "./components/FundingRecommendations";
import BillsSection from "./components/BillsSection";
import DebtsSection from "./components/DebtsSection";
import { useCashFlow } from "./useCashFlow";
import {
  BillFrequency,
  FundingSource,
  OperationalAlert,
  PaycheckAssignment,
  PayoffStrategy,
  PaymentSourceCoverageType,
  getAssignmentLabel,
  getBillStatus,
  getCycleMonth,
  getCurrentBillCycleDueDate,
  getCurrentDebtCycleDueDate,
  getFrequencyLabel,
  getFrequencyMonthStep,
  getTargetDebt,
  addDays,
  addMonthsClamped,
  buildIncomeBuckets,
  formatDate,
  formatShortDate,
  getNextIncomeDateDisplay,
  parseDateOnly,
  getFundingSourceBalance,
} from "./cashflowUtils";

const billFrequencyOptions: { value: BillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "every_2_months", label: "Every 2 Months" },
  { value: "every_3_months", label: "Every 3 Months" },
  { value: "every_6_months", label: "Every 6 Months" },
  { value: "yearly", label: "Yearly" },
];

const paycheckAssignmentOptions: {
  value: PaycheckAssignment;
  label: string;
}[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "paycheck_1", label: "Paycheck 1" },
  { value: "paycheck_2", label: "Paycheck 2" },
];

export default function CashFlowPage() {
  const {
    data,
    incomes,
    bills,
    debts,
    billPayments,
    debtPaymentRows,
    fundingSources,
    editingFundingSourceId,
    editingFundingSource,
    newFundingSource,
    requiredCash,
    billsDue,
    incomeExpected,
    lookaheadDays,
    assignmentHorizonMonths,
    buffer,
    startingBalance,
    saveStatus,
    saveError,
    strategy,
    extraPayment,
    targetDebtName,
    incomeName,
    incomeAmount,
    incomeFrequency,
    incomeNextDate,
    billName,
    billAmount,
    billDueDate,
    billFrequency,
    nextPaycheckAmount,
    nextPaycheckDate,
    secondPaycheckAmount,
    secondPaycheckDate,
    loading,
    editingIncomeId,
    editingBillId,
    editingDebtId,
    editIncomeName,
    editIncomeAmount,
    editIncomeFrequency,
    editIncomeNextDate,
    editBillName,
    editBillAmount,
    editBillDueDate,
    editBillFrequency,
    editDebtName,
    editDebtBalance,
    editDebtMinimumPayment,
    editDebtInterestRate,
    editDebtDueDate,
    editDebtPaymentBehavior,
    editDebtMinimumPaymentRate,
    editDebtMinimumPaymentFloor,
    debtPayments,
    partialPayments,
    debtPaymentStatus,
    applyingDebtPaymentId,
    isApplyingSuggestedAttack,
    suggestedAttackMessage,
    showAddIncome,
    showAddBill,
    showBills,
    showDebts,
    showIncomeEvents,
    showFundingSources,
    showCashTimeline,
    showArchivedBills,
    showArchivedDebts,
    setEditingFundingSource,
    setNewFundingSource,
    setStartingBalance,
    setIncomeName,
    setIncomeAmount,
    setIncomeFrequency,
    setIncomeNextDate,
    setBillName,
    setBillAmount,
    setBillDueDate,
    setBillFrequency,
    setNextPaycheckAmount,
    setNextPaycheckDate,
    setSecondPaycheckAmount,
    setSecondPaycheckDate,
    setEditIncomeName,
    setEditIncomeAmount,
    setEditIncomeFrequency,
    setEditIncomeNextDate,
    setEditBillName,
    setEditBillAmount,
    setEditBillDueDate,
    setEditBillFrequency,
    setEditDebtName,
    setEditDebtBalance,
    setEditDebtMinimumPayment,
    setEditDebtInterestRate,
    setEditDebtDueDate,
    setEditDebtPaymentBehavior,
    setEditDebtMinimumPaymentRate,
    setEditDebtMinimumPaymentFloor,
    setDebtPayments,
    setPartialPayments,
    setIsApplyingSuggestedAttack,
    setSuggestedAttackMessage,
    setShowAddIncome,
    setShowAddBill,
    setShowBills,
    setShowDebts,
    setShowIncomeEvents,
    setShowFundingSources,
    setShowCashTimeline,
    setShowArchivedBills,
    setShowArchivedDebts,
    isStartingBalanceFocusedRef,
    addFundingSource,
    startEditFundingSource,
    cancelEditFundingSource,
    updateFundingSource,
    deleteFundingSource,
    recalc,
    handleStartingBalanceBlur,
    addIncome,
    addBill,
    addBillPayment,
    markBillPaid,
    updateBillIncomeDate,
    updateDebtIncomeDate,
    updateBillFundingSource,
    updateDebtFundingSource,
    startEditIncome,
    cancelEditIncome,
    saveIncomeEdit,
    startEditBill,
    cancelEditBill,
    saveBillEdit,
    startEditDebt,
    cancelEditDebt,
    saveDebtEdit,
    applyDebtPayment,
    deleteDebt,
    archiveBill,
    resetBillDueDate,
    unarchiveBill,
    archiveDebt,
    resetDebtDueDate,
    unarchiveDebt,
    deleteIncome,
  } = useCashFlow();

  const cycleMonth = getCycleMonth();

  async function applySuggestedAttack() {
    if (isApplyingSuggestedAttack) return;
    if (!recommendedTargetDebt) return;
    if (suggestedMonthlyDebtAttack === null || suggestedMonthlyDebtAttack <= 0) return;

    setIsApplyingSuggestedAttack(true);
    setSuggestedAttackMessage(null);

    try {
      const targetBalance = Number(recommendedTargetDebt.balance || 0);
      const attackAmount = Math.min(suggestedMonthlyDebtAttack, targetBalance);

      if (attackAmount <= 0) {
        setSuggestedAttackMessage("Target debt balance is already paid.");
        setIsApplyingSuggestedAttack(false);
        return;
      }

      await applyDebtPayment(recommendedTargetDebt, attackAmount);
      setSuggestedAttackMessage("Suggested attack recorded.");

      setTimeout(() => {
        setSuggestedAttackMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error applying suggested attack:", error);
      setSuggestedAttackMessage("Error recording attack. Please try again.");
    } finally {
      setIsApplyingSuggestedAttack(false);
    }
  }

  const netPosition = useMemo(() => {
    return Number(startingBalance) + incomeExpected - billsDue;
  }, [startingBalance, incomeExpected, billsDue]);

  const paymentsByBillId = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const payment of billPayments) {
      totals[payment.bill_id] =
        Number(totals[payment.bill_id] || 0) + Number(payment.amount_paid || 0);
    }

    return totals;
  }, [billPayments]);

  const debtPaymentsByDebtAndCycle = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const payment of debtPaymentRows) {
      const key = `${payment.debt_id}||${payment.cycle_due_date}`;
      totals[key] = Number(totals[key] || 0) + Number(payment.amount || 0);
    }

    return totals;
  }, [debtPaymentRows]);

  const billsWithPaymentStatus = useMemo(() => {
    return bills.map((bill) => {
      const amount = Number(bill.amount || 0);
      const paid = Number(paymentsByBillId[bill.id] || 0);
      const currentCycleRemaining = Math.max(amount - paid, 0);
      const dueDay = Number(bill.due_date || 1);
      const frequency = bill.frequency || "monthly";
      const assignedPaycheck = bill.assigned_paycheck || "unassigned";
      const currentCycleDueDate = getCurrentBillCycleDueDate(bill, cycleMonth);
      let nextDueDate = currentCycleDueDate;
      let remaining = currentCycleRemaining;

      if (currentCycleRemaining <= 0) {
        if (frequency === "weekly") nextDueDate = addDays(currentCycleDueDate, 7);
        else if (frequency === "biweekly")
          nextDueDate = addDays(currentCycleDueDate, 14);
        else
          nextDueDate = addMonthsClamped(
            currentCycleDueDate,
            getFrequencyMonthStep(frequency)
          );

        remaining = amount;
      }

      return {
        ...bill,
        amount,
        paid,
        remaining,
        dueDay,
        frequency,
        assigned_paycheck: assignedPaycheck,
        assigned_income_date: bill.assigned_income_date || "",
        funding_source_id: bill.funding_source_id || "",
        nextDueDate,
        nextDueDateDisplay: formatShortDate(nextDueDate),
        status:
          currentCycleRemaining <= 0
            ? "Upcoming"
            : getBillStatus({ amount, paid, nextDueDate }),
        is_archived: Boolean(bill.is_archived),
      };
    });
  }, [bills, paymentsByBillId, cycleMonth]);

  const activeBills = useMemo(() => {
    return billsWithPaymentStatus
      .filter((bill) => !bill.is_archived)
      .sort(
        (a, b) =>
          new Date(a.nextDueDate).getTime() -
          new Date(b.nextDueDate).getTime()
      );
  }, [billsWithPaymentStatus]);

  const archivedBills = useMemo(() => {
    return billsWithPaymentStatus.filter((bill) => bill.is_archived);
  }, [billsWithPaymentStatus]);

  const incomeBuckets = useMemo(() => {
    const assignmentHorizonDays = Number(assignmentHorizonMonths || 6) * 30;
    return buildIncomeBuckets(incomes, assignmentHorizonDays);
  }, [incomes, assignmentHorizonMonths]);

  const firstIncomeBucket = useMemo(() => {
    return incomeBuckets.length > 0 ? incomeBuckets[0] : null;
  }, [incomeBuckets]);

  function getIncomeBucketLabel(value: string) {
    if (!value) return "Unassigned";

    const bucket = incomeBuckets.find((item) => item.date === value);
    return bucket?.label || value;
  }

  function getFundingSourceLabel(value: string) {
    if (!value) return "Unassigned";

    const source = fundingSources.find((item) => item.id === value);
    return source?.name || "Unknown Source";
  }

  function getFundingSourceUtilization(source: FundingSource) {
    const creditLimit = Number(source.credit_limit || 0);

    if (creditLimit <= 0) return null;

    // If this funding source is linked to a debt, get the balance from the debt
    let currentBalance = Number(source.current_balance || 0);
    if (source.linked_debt_id && debts.length > 0) {
      const linkedDebt = debts.find((d) => d.id === source.linked_debt_id);
      if (linkedDebt) {
        currentBalance = Number(linkedDebt.balance || 0);
      }
    }

    // Prefer current_balance for utilization because it directly reflects
    // the outstanding amount owed on the credit line.
    if (!Number.isNaN(currentBalance)) {
      return Math.min(Math.max((currentBalance / creditLimit) * 100, 0), 100);
    }

    const availableCredit = Number(source.available_credit || 0);
    const usedCredit = Math.max(creditLimit - availableCredit, 0);
    return Math.min(Math.max((usedCredit / creditLimit) * 100, 0), 100);
  }

  const activeFundingSources = useMemo(() => {
    return fundingSources.filter((source) => source.is_active);
  }, [fundingSources]);

  const liquidFundingTotal = useMemo(() => {
    return activeFundingSources
      .filter((source) => ["checking", "savings", "cash"].includes(source.type))
      .reduce((sum, source) => {
        const balance = getFundingSourceBalance(source, debts.find((d) => d.id === source.linked_debt_id));
        return sum + balance;
      }, 0);
  }, [activeFundingSources, debts]);

  const creditAvailableTotal = useMemo(() => {
    return activeFundingSources
      .filter((source) => ["credit_card", "heloc", "ploc"].includes(source.type))
      .reduce((sum, source) => sum + Number(source.available_credit || 0), 0);
  }, [activeFundingSources]);

  const creditLimitTotal = useMemo(() => {
    return activeFundingSources
      .filter((source) => ["credit_card", "heloc", "ploc"].includes(source.type))
      .reduce((sum, source) => sum + Number(source.credit_limit || 0), 0);
  }, [activeFundingSources]);

  const creditUsedTotal = Math.max(creditLimitTotal - creditAvailableTotal, 0);

  const creditUtilizationPercent =
    creditLimitTotal > 0 ? (creditUsedTotal / creditLimitTotal) * 100 : 0;

  const paymentSourceCoverage = useMemo(() => {
    const coverage: PaymentSourceCoverageType = {
      checking: 0,
      savings: 0,
      credit_card: 0,
      heloc: 0,
      ploc: 0,
      cash: 0,
      unassigned: 0,
    };

    // Group billPayments by funding source type (current cycle bills only)
    for (const payment of billPayments) {
      if (!payment.funding_source_id) {
        coverage.unassigned += Number(payment.amount_paid || 0);
      } else {
        const source = fundingSources.find((s) => s.id === payment.funding_source_id);
        if (source) {
          const sourceType = source.type as keyof PaymentSourceCoverageType;
          if (sourceType in coverage) {
            coverage[sourceType] += Number(payment.amount_paid || 0);
          } else {
            coverage.unassigned += Number(payment.amount_paid || 0);
          }
        }
      }
    }

    return coverage;
  }, [billPayments, fundingSources]);

  const fundingIntelligence = useMemo(() => {
    const insights: Array<{ type: "warning" | "info"; message: string }> = [];

    const totalCycleBills =
      paymentSourceCoverage.checking +
      paymentSourceCoverage.savings +
      paymentSourceCoverage.credit_card +
      paymentSourceCoverage.heloc +
      paymentSourceCoverage.ploc +
      paymentSourceCoverage.cash +
      paymentSourceCoverage.unassigned;

    if (totalCycleBills === 0) {
      insights.push({
        type: "info",
        message: "No current-cycle bill payments are assigned yet.",
      });
      return insights;
    }

    // Check for unassigned payments
    if (paymentSourceCoverage.unassigned > 0) {
      insights.push({
        type: "warning",
        message: "Some current-cycle bills are not assigned to a funding source.",
      });
    }

    // Calculate credit-funded vs liquid-funded
    const creditFunded =
      paymentSourceCoverage.credit_card +
      paymentSourceCoverage.heloc +
      paymentSourceCoverage.ploc;
    const liquidFunded =
      paymentSourceCoverage.checking +
      paymentSourceCoverage.savings +
      paymentSourceCoverage.cash;

    if (creditFunded > liquidFunded && creditFunded > 0) {
      insights.push({
        type: "warning",
        message: "This cycle relies more on credit than liquid cash.",
      });
    }

    // Check credit utilization
    if (creditUtilizationPercent > 50) {
      insights.push({
        type: "warning",
        message:
          "Credit utilization is elevated. Consider reducing credit-funded bills where possible.",
      });
    }

    // Check if liquid cash can cover the cycle
    if (liquidFundingTotal >= totalCycleBills) {
      insights.push({
        type: "info",
        message: "Liquid cash can cover the current cycle.",
      });
    }

    return insights;
  }, [
    paymentSourceCoverage,
    creditUtilizationPercent,
    liquidFundingTotal,
  ]);

  const fundingRecommendations = useMemo(() => {
    const recommendations: Array<{ type: "primary" | "secondary"; message: string }> = [];

    const totalCycleBills =
      paymentSourceCoverage.checking +
      paymentSourceCoverage.savings +
      paymentSourceCoverage.credit_card +
      paymentSourceCoverage.heloc +
      paymentSourceCoverage.ploc +
      paymentSourceCoverage.cash +
      paymentSourceCoverage.unassigned;

    // Rule 6: No payments
    if (totalCycleBills === 0) {
      recommendations.push({
        type: "primary",
        message: "Assign bill payments to funding sources to unlock stronger recommendations.",
      });
      return recommendations;
    }

    // Rule 1: Unassigned payments
    if (paymentSourceCoverage.unassigned > 0) {
      recommendations.push({
        type: "primary",
        message: "Assign funding sources to all current-cycle bills to improve forecasting accuracy.",
      });
    }

    const creditFunded =
      paymentSourceCoverage.credit_card +
      paymentSourceCoverage.heloc +
      paymentSourceCoverage.ploc;
    const liquidFunded =
      paymentSourceCoverage.checking +
      paymentSourceCoverage.savings +
      paymentSourceCoverage.cash;

    // Rule 2: Liquid cash can cover
    if (liquidFundingTotal >= totalCycleBills) {
      recommendations.push({
        type: "secondary",
        message: "Liquid cash appears sufficient for this cycle. Consider using cash first to preserve credit flexibility.",
      });
    }

    // Rule 3: Credit leans heavily
    if (creditFunded > liquidFunded && creditFunded > 0) {
      recommendations.push({
        type: "primary",
        message: "This cycle leans heavily on credit funding. Review whether any recurring bills can shift to cash.",
      });
    }

    // Rule 4: Check for HELOC/PLOC with low utilization
    const hasRevolvingCredit = fundingSources.some(
      (source) => (source.type === "heloc" || source.type === "ploc") && source.is_active
    );
    if (hasRevolvingCredit && creditUtilizationPercent < 50) {
      recommendations.push({
        type: "secondary",
        message: "Velocity may benefit from strategic revolving credit use, but only when repayment timing is clear.",
      });
    }

    // Rule 5: High utilization
    if (creditUtilizationPercent >= 75) {
      recommendations.push({
        type: "primary",
        message: "High utilization reduces financial flexibility. Prioritize reducing revolving balances before adding more credit-funded bills.",
      });
    }

    return recommendations;
  }, [
    paymentSourceCoverage,
    creditUtilizationPercent,
    liquidFundingTotal,
    fundingSources,
  ]);

  const nextPayDate = useMemo(() => {
    if (nextPaycheckDate) {
      return new Date(nextPaycheckDate);
    }
    if (firstIncomeBucket?.date) {
      return new Date(firstIncomeBucket.date);
    }
    return null;
  }, [nextPaycheckDate, firstIncomeBucket]);

  const upcomingBillsTotal = useMemo(() => {
    if (!nextPayDate) return 0;

    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return activeBills
      .filter((bill) => {
        if (bill.remaining <= 0) return false;
        return bill.nextDueDate >= todayOnly && bill.nextDueDate <= nextPayDate;
      })
      .reduce((sum, bill) => sum + Number(bill.remaining || 0), 0);
  }, [activeBills, nextPayDate]);

  const debtsWithAssignmentStatus = useMemo(() => {
    return debts.map((debt) => {
      const minimumPayment = Number(debt.minimum_payment || 0);
      const assignedPaycheck = debt.assigned_paycheck || "unassigned";
      const dueDay = Number(debt.due_date || 1);
      const currentCycleDueDate = getCurrentDebtCycleDueDate(debt);
      const cycleKey = `${debt.id}||${currentCycleDueDate
        .toISOString()
        .slice(0, 10)}`;
      const currentCyclePaid = Number(
        debtPaymentsByDebtAndCycle[cycleKey] || 0
      );
      
      let nextDueDate: Date;
      if (debt.next_due_date_after_payment) {
        nextDueDate = parseDateOnly(debt.next_due_date_after_payment);
      } else {
        nextDueDate = currentCyclePaid >= minimumPayment
          ? addMonthsClamped(currentCycleDueDate, 1)
          : currentCycleDueDate;
      }

      return {
        ...debt,
        minimum_payment: minimumPayment,
        assigned_paycheck: assignedPaycheck,
        assigned_income_date: debt.assigned_income_date || "",
        funding_source_id: debt.funding_source_id || "",
        dueDay,
        nextDueDate,
        nextDueDateDisplay: formatShortDate(nextDueDate),
        is_archived: Boolean(debt.is_archived),
      };
    });
  }, [debts, debtPaymentsByDebtAndCycle]);

  const activeDebts = useMemo(() => {
    return debtsWithAssignmentStatus.filter((debt) => !debt.is_archived);
  }, [debtsWithAssignmentStatus]);

  const archivedDebts = useMemo(() => {
    return debtsWithAssignmentStatus.filter((debt) => debt.is_archived);
  }, [debtsWithAssignmentStatus]);

  const billsAhead = useMemo(() => {
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const windowEnd = addDays(todayOnly, 30);

    const upcoming = activeBills
      .filter((bill) => {
        if (Number(bill.remaining || 0) <= 0) return false;
        return bill.nextDueDate >= todayOnly && bill.nextDueDate <= windowEnd;
      })
      .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

    return {
      bills: upcoming,
      total: upcoming.reduce(
        (sum, bill) => sum + Number(bill.remaining || 0),
        0
      ),
      unassignedIncomePots: upcoming.filter(
        (bill) => !bill.assigned_income_date
      ).length,
      unassignedFundingSources: upcoming.filter(
        (bill) => !bill.funding_source_id
      ).length,
    };
  }, [activeBills]);

  const billsDueNext7Days = useMemo(() => {
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const windowEnd = addDays(todayOnly, 7);

    const billsDue = activeBills.filter((bill) => {
      if (Number(bill.remaining || 0) <= 0) return false;
      return bill.nextDueDate >= todayOnly && bill.nextDueDate <= windowEnd;
    });

    return {
      bills: billsDue,
      total: billsDue.reduce(
        (sum, bill) => sum + Number(bill.remaining || 0),
        0
      ),
    };
  }, [activeBills]);

  const upcomingDebtMinimums = useMemo(() => {
    if (!nextPayDate) return 0;

    return activeDebts
      .filter((debt) => debt.nextDueDate <= nextPayDate)
      .reduce((sum, debt) => sum + Number(debt.minimum_payment || 0), 0);
  }, [activeDebts, nextPayDate]);

  const effectiveNextPaycheckAmount = useMemo(() => {
    if (nextPaycheckAmount) return Number(nextPaycheckAmount);
    if (firstIncomeBucket?.amount) return Number(firstIncomeBucket.amount);
    return 0;
  }, [nextPaycheckAmount, firstIncomeBucket]);

  const requiredBeforePaycheck = upcomingBillsTotal + upcomingDebtMinimums;

  const projectedAfterObligations =
    Number(startingBalance || 0) +
    effectiveNextPaycheckAmount -
    requiredBeforePaycheck;

  const safeToSpend = projectedAfterObligations - Number(buffer || 0);

  const suggestedMonthlyDebtAttack = useMemo(() => {
    if (!nextPayDate || effectiveNextPaycheckAmount <= 0) return null;
    return Math.max(0, safeToSpend);
  }, [nextPayDate, effectiveNextPaycheckAmount, safeToSpend]);

  const recommendedTargetDebt = useMemo(() => {
    return getTargetDebt(activeDebts, strategy);
  }, [activeDebts, strategy]);

  const planningWindowEnd = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return addDays(start, Number(lookaheadDays || 30));
  }, [lookaheadDays]);

  const unassignedBills = useMemo(() => {
    return activeBills.filter(
      (bill) =>
        !bill.assigned_income_date && bill.nextDueDate <= planningWindowEnd
    );
  }, [activeBills, planningWindowEnd]);

  const unassignedDebts = useMemo(() => {
    return activeDebts.filter(
      (debt) =>
        !debt.assigned_income_date && debt.nextDueDate <= planningWindowEnd
    );
  }, [activeDebts, planningWindowEnd]);

  const unassignedObligationsTotal = useMemo(() => {
    const billTotal = unassignedBills.reduce(
      (sum, bill) => sum + Number(bill.remaining || 0),
      0
    );

    const debtTotal = unassignedDebts.reduce(
      (sum, debt) => sum + Number(debt.minimum_payment || 0),
      0
    );

    return billTotal + debtTotal;
  }, [unassignedBills, unassignedDebts]);

  const unassignedObligationsCount =
    unassignedBills.length + unassignedDebts.length;

  const fundingSourceRiskCount = useMemo(() => {
    return activeFundingSources.filter((source) => {
      const creditLimit = Number(source.credit_limit || 0);

      if (creditLimit <= 0) return false;

      const availableCredit = Number(source.available_credit || 0);
      const usedCredit = Math.max(creditLimit - availableCredit, 0);

      return (usedCredit / creditLimit) * 100 > 70;
    }).length;
  }, [activeFundingSources]);

  const incomeBucketPlans = useMemo(() => {
    const creditFundingSourceTypes = ["credit_card", "heloc", "ploc"];
    
    return incomeBuckets.map((bucket) => {
      const assignedBills = activeBills.filter(
        (bill) => bill.assigned_income_date === bucket.date
      );

      const assignedDebts = activeDebts.filter(
        (debt) => debt.assigned_income_date === bucket.date
      );

      // Only count bills funded by checking/cash/savings accounts toward paycheck balance
      const paycheckFundedBills = assignedBills.filter((bill) => {
        if (!bill.funding_source_id) {
          // Unassigned defaults to paycheck-funded (checking account)
          return true;
        }
        const source = fundingSources.find((s) => s.id === bill.funding_source_id);
        if (!source) return true; // Default to counting if source not found
        return !creditFundingSourceTypes.includes(source.type);
      });

      // Only count debts funded by checking/cash/savings accounts toward paycheck balance
      const paycheckFundedDebts = assignedDebts.filter((debt) => {
        if (!debt.funding_source_id) {
          // Unassigned defaults to paycheck-funded (checking account)
          return true;
        }
        const source = fundingSources.find((s) => s.id === debt.funding_source_id);
        if (!source) return true; // Default to counting if source not found
        return !creditFundingSourceTypes.includes(source.type);
      });

      const billsTotal = paycheckFundedBills.reduce(
        (sum, bill) => sum + Number(bill.remaining || 0),
        0
      );

      const debtMinimumsTotal = paycheckFundedDebts.reduce(
        (sum, debt) => sum + Number(debt.minimum_payment || 0),
        0
      );

      const assignedTotal = billsTotal + debtMinimumsTotal;
      const availableToAssign = Number(bucket.amount || 0) - assignedTotal;
      const safeAfterBuffer = availableToAssign - Number(buffer || 0);
      const dropdownLabel = `${bucket.label} ($${availableToAssign.toFixed(
        2
      )} left)`;

      return {
        ...bucket,
        assignedBills,
        assignedDebts,
        billsTotal,
        debtMinimumsTotal,
        assignedTotal,
        availableToAssign,
        safeAfterBuffer,
        dropdownLabel,
      };
    });
  }, [incomeBuckets, activeBills, activeDebts, fundingSources, buffer]);

  const operationalAlerts = useMemo(() => {
    const alerts: OperationalAlert[] = [];

    if (billsDueNext7Days.bills.length > 0) {
      alerts.push({
        id: "bills-due-soon",
        severity: "warning",
        title: "Bills due soon",
        message: `${billsDueNext7Days.bills.length} bill${
          billsDueNext7Days.bills.length === 1 ? "" : "s"
        } due within 7 days: $${billsDueNext7Days.total.toFixed(2)}.`,
      });
    }

    if (safeToSpend < 0) {
      alerts.push({
        id: "negative-safe-to-spend",
        severity: "critical",
        title: "Safe to spend is negative",
        message: `$${Math.abs(safeToSpend).toFixed(2)} short after buffer.`,
      });
    }

    if (creditUtilizationPercent > 90) {
      alerts.push({
        id: "credit-utilization-critical",
        severity: "critical",
        title: "Credit utilization critical",
        message: `Total utilization is ${creditUtilizationPercent.toFixed(
          1
        )}%.`,
      });
    } else if (creditUtilizationPercent > 70) {
      alerts.push({
        id: "credit-utilization-high",
        severity: "warning",
        title: "Credit utilization high",
        message: `Total utilization is ${creditUtilizationPercent.toFixed(
          1
        )}%.`,
      });
    }

    if (unassignedBills.length > 0) {
      alerts.push({
        id: "unassigned-bills",
        severity: "info",
        title: "Bills need income pots",
        message: `${unassignedBills.length} bill${
          unassignedBills.length === 1 ? "" : "s"
        } unassigned.`,
      });
    }

    if (unassignedDebts.length > 0) {
      alerts.push({
        id: "unassigned-debts",
        severity: "info",
        title: "Debts need income pots",
        message: `${unassignedDebts.length} debt minimum${
          unassignedDebts.length === 1 ? "" : "s"
        } unassigned.`,
      });
    }

    const lowImpactDebtMinimums = activeDebts.flatMap((debt) => {
      const balance = Number(debt.balance || 0);
      const minimumPayment = Number(debt.minimum_payment || 0);
      const monthlyInterest =
        balance * (Number(debt.interest_rate || 0) / 100 / 12);
      const principalReduction = minimumPayment - monthlyInterest;

      if (balance <= 0 || minimumPayment <= 0) return [];

      if (principalReduction >= balance * 0.005) return [];

      return [
        {
          name: debt.name || "Unnamed debt",
          principalReductionPercent: (principalReduction / balance) * 100,
        },
      ];
    });

    if (lowImpactDebtMinimums.length > 0) {
      const lowImpactDebtSummary = lowImpactDebtMinimums
        .map(
          (debt) =>
            `${debt.name}: ${debt.principalReductionPercent.toFixed(2)}% principal reduction`
        )
        .join("; ");

      alerts.push({
        id: "low-impact-debt-minimums",
        severity: "warning",
        title: "Debt minimums barely reduce balance",
        message: lowImpactDebtSummary,
      });
    }

    return alerts;
  }, [
    activeDebts,
    billsDueNext7Days,
    creditUtilizationPercent,
    safeToSpend,
    unassignedBills,
    unassignedDebts,
  ]);

  const recommendedNextSteps = useMemo(() => {
    const steps: string[] = [];

    if (unassignedBills.length + unassignedDebts.length > 0) {
      steps.push(
        `Assign ${unassignedBills.length + unassignedDebts.length} unassigned obligation${
          unassignedBills.length + unassignedDebts.length === 1 ? "" : "s"
        } totaling $${unassignedObligationsTotal.toFixed(2)}.`
      );
    }

    const overloadedPot = incomeBucketPlans.find(
      (bucket) => Number(bucket.safeAfterBuffer || 0) < 0
    );

    if (overloadedPot) {
      steps.push(
        `${overloadedPot.label} is overloaded by $${Math.abs(
          Number(overloadedPot.safeAfterBuffer || 0)
        ).toFixed(2)} after buffer.`
      );
    }

    const unfundedBills = activeBills.filter((bill) => !bill.funding_source_id);
    const unfundedDebts = activeDebts.filter((debt) => !debt.funding_source_id);

    if (activeFundingSources.length > 0 && unfundedBills.length + unfundedDebts.length > 0) {
      steps.push(
        `Assign funding sources to ${unfundedBills.length + unfundedDebts.length} active obligation${
          unfundedBills.length + unfundedDebts.length === 1 ? "" : "s"
        }.`
      );
    }

    const zeroBalanceDebt = activeDebts.find(
      (debt) => Number(debt.balance || 0) <= 0
    );

    if (zeroBalanceDebt) {
      steps.push(
        `${zeroBalanceDebt.name} has a $0 balance. Consider archiving it if it is inactive.`
      );
    }

    const paidBill = activeBills.find(
      (bill) => Number(bill.remaining || 0) <= 0
    );

    if (paidBill) {
      steps.push(
        `${paidBill.name} is paid for this cycle. Archive only if it is no longer active.`
      );
    }

    if (steps.length === 0) {
      steps.push(
        "No urgent cleanup found. Continue assigning obligations to the correct income pots."
      );
    }

    return steps.slice(0, 4);
  }, [
    activeBills,
    activeDebts,
    incomeBucketPlans,
    unassignedBills,
    unassignedDebts,
    unassignedObligationsTotal,
    activeFundingSources,
  ]);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="beast-kicker">The Beast v1.4.6 Beta</p>
              <h1 className="beast-title">Cash Flow</h1>
              <p className="beast-subtitle">
                Manage paychecks, bills, debt minimums, Monthly Extra Attack payments,
                required cash, and buffer risk.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">
              Starting Checking Balance
            </div>
            <input
              type="number"
              value={startingBalance}
              onFocus={() => {
                isStartingBalanceFocusedRef.current = true;
              }}
              onBlur={() => {
                handleStartingBalanceBlur();
              }}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartingBalance(val);
                recalc(val);
              }}
              className="beast-input mt-3"
            />
            <div className="mt-2 text-xs text-slate-400 whitespace-nowrap">
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Saved"
                : ""}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Required Cash</div>
            <div className="mt-2 break-words text-2xl font-bold">
              ${requiredCash.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Bills + Debt Due</div>
            <div className="mt-2 break-words text-2xl font-bold">
              ${billsDue.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Income Expected</div>
            <div className="mt-2 break-words text-2xl font-bold">
              ${incomeExpected.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Net Position</div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                netPosition < buffer ? "text-red-300" : "text-green-300"
              }`}
            >
              ${netPosition.toFixed(2)}
            </div>
          </div>
        </section>

        <section className="beast-card space-y-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-[#c7cfdb]">
              Suggested Monthly Debt Attack
            </div>
            <div className="text-3xl font-bold">
              {suggestedMonthlyDebtAttack !== null
                ? `$${suggestedMonthlyDebtAttack.toFixed(2)}`
                : incomes.length === 0 && !nextPaycheckAmount
                ? "Add income entries or enter paycheck details"
                : "Enter starting balance and buffer to calculate"}
            </div>
            <p className="text-sm text-[#7f8da3]">
              {suggestedMonthlyDebtAttack !== null
                ? "Based on current paycheck input, upcoming bills, debt minimums, and your checking buffer."
                : incomes.length === 0 && !nextPaycheckAmount
                ? "Set up recurring income in the Income section or enter next paycheck manually."
                : "Configure your starting checking balance and buffer in settings."}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
            <div className="text-sm text-[#c7cfdb]">Recommended Target</div>
            {recommendedTargetDebt ? (
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-white">
                  {recommendedTargetDebt.name}
                </div>
                <div className="text-xs text-[#7f8da3]">
                  Based on: {strategy === "avalanche" ? "Avalanche strategy" : "Snowball strategy"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#7f8da3]">
                No active debt target available.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 items-start">
            <button 
              className="beast-button w-fit disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isApplyingSuggestedAttack ||
                suggestedMonthlyDebtAttack === null ||
                suggestedMonthlyDebtAttack <= 0 ||
                !recommendedTargetDebt ||
                Number(recommendedTargetDebt.balance || 0) <= 0
              }
              onClick={applySuggestedAttack}
            >
              {isApplyingSuggestedAttack ? "Applying..." : "Apply Suggested Attack"}
            </button>
            <div className="text-xs text-[#7f8da3]">
              This records the payment inside The Beast only. Complete the real payment through your lender.
            </div>
          </div>

          {suggestedAttackMessage && (
            <div className={`rounded-lg border p-3 text-sm ${
              suggestedAttackMessage.includes("Error") || suggestedAttackMessage.includes("already")
                ? "border-red-400/60 bg-red-950/30 text-red-100"
                : "border-green-400/60 bg-green-950/30 text-green-100"
            }`}>
              {suggestedAttackMessage}
            </div>
          )}

          <p className="text-xs text-slate-500">
            The Beast does not connect to or transact with your financial
            institutions. Applying payments, marking bills paid, or updating
            balances inside The Beast does not move real money. Always verify and
            complete transactions through your actual bank, lender, or payment
            provider.
          </p>
        </section>

        <section className="space-y-2">
          <p className="beast-kicker">Command Zone</p>
          <h2 className="text-2xl font-bold">Daily operating focus</h2>
        </section>

        {operationalAlerts.length > 0 && (
          <section className="beast-card space-y-4">
            <div>
              <h2 className="text-xl font-bold">Operational Alerts</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Current cashflow items that need attention.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {operationalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-3 text-sm ${
                    alert.severity === "critical"
                      ? "border-red-400/60 bg-red-950/30 text-red-100"
                      : alert.severity === "warning"
                      ? "border-yellow-300/60 bg-yellow-950/20 text-yellow-100"
                      : "border-sky-300/60 bg-sky-950/20 text-sky-100"
                  }`}
                >
                  <div className="font-bold">{alert.title}</div>
                  <div className="mt-1 opacity-90">{alert.message}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="beast-card space-y-4">
          <div>
            <h2 className="text-xl font-bold">Daily Command Summary</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Quick operating numbers for today.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="beast-panel p-4">
              <div className="text-sm text-[#c7cfdb]">Safe To Spend</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  safeToSpend < 0
                    ? "text-red-300"
                    : safeToSpend < Number(buffer || 0) * 0.25
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                ${safeToSpend.toFixed(2)}
              </div>
            </div>

            <div className="beast-panel p-4">
              <div className="text-sm text-[#c7cfdb]">
                Required Before Paycheck
              </div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  requiredBeforePaycheck > Number(startingBalance || 0)
                    ? "text-red-300"
                    : requiredBeforePaycheck >
                      Number(startingBalance || 0) * 0.75
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                ${requiredBeforePaycheck.toFixed(2)}
              </div>
            </div>

            <div className="beast-panel p-4">
              <div className="text-sm text-[#c7cfdb]">Bills Due 7 Days</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  billsDueNext7Days.total > Number(startingBalance || 0)
                    ? "text-red-300"
                    : billsDueNext7Days.bills.length > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                ${billsDueNext7Days.total.toFixed(2)}
              </div>
            </div>

            <div className="beast-panel p-4">
              <div className="text-sm text-[#c7cfdb]">Bills Due 30 Days</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  billsAhead.total > Number(startingBalance || 0)
                    ? "text-red-300"
                    : billsAhead.bills.length > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                ${billsAhead.total.toFixed(2)}
              </div>
            </div>

            <div className="beast-panel p-4">
              <div className="text-sm text-[#c7cfdb]">
                Unassigned Obligations
              </div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  unassignedObligationsCount > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                {unassignedObligationsCount}
              </div>
            </div>

            <div className="beast-panel p-4">
              <div className="text-sm text-[#c7cfdb]">Funding Risk Count</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  fundingSourceRiskCount > 0
                    ? "text-red-300"
                    : "text-green-300"
                }`}
              >
                {fundingSourceRiskCount}
              </div>
            </div>
          </div>
        </section>

        <section className="beast-card space-y-4">
          <div>
            <h2 className="text-xl font-bold">Recommended Next Step Today</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Rules-based guidance from current assignments, cash pots, and
              active obligations.
            </p>
          </div>

          <div className="grid gap-3">
            {recommendedNextSteps.map((step, index) => (
              <div
                key={`${step}-${index}`}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-sm text-[#c7cfdb]"
              >
                {step}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="beast-kicker">Execution Zone</p>
          <h2 className="text-2xl font-bold">Active cashflow management</h2>
        </section>


        <section className="beast-card space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Bills Ahead</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Operational view of bills due in the next 30 days, including
                funding source and income pot assignments.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <div className="beast-panel p-4">
                <div className="text-sm text-[#c7cfdb]">Bills Due</div>
                <div className="mt-2 break-words text-2xl font-bold">
                  {billsAhead.bills.length}
                </div>
              </div>

              <div className="beast-panel p-4">
                <div className="text-sm text-[#c7cfdb]">
                  Upcoming Bill Amount
                </div>
                <div className="mt-2 break-words text-2xl font-bold text-yellow-300">
                  ${billsAhead.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="beast-panel p-3">
              <div className="text-xs text-[#7f8da3]">
                Total Upcoming Bills
              </div>
              <div className="mt-1 text-lg font-bold">
                {billsAhead.bills.length}
              </div>
            </div>

            <div className="beast-panel p-3">
              <div className="text-xs text-[#7f8da3]">Total Due Amount</div>
              <div className="mt-1 text-lg font-bold">
                ${billsAhead.total.toFixed(2)}
              </div>
            </div>

            <div className="beast-panel p-3">
              <div className="text-xs text-[#7f8da3]">
                Unassigned Income Pots
              </div>
              <div
                className={`mt-1 text-lg font-bold ${
                  billsAhead.unassignedIncomePots > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                {billsAhead.unassignedIncomePots}
              </div>
            </div>

            <div className="beast-panel p-3">
              <div className="text-xs text-[#7f8da3]">
                Unassigned Funding Sources
              </div>
              <div
                className={`mt-1 text-lg font-bold ${
                  billsAhead.unassignedFundingSources > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                {billsAhead.unassignedFundingSources}
              </div>
            </div>
          </div>

          <div className="beast-table-wrap">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className="text-left">Bill</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-center">Due Date</th>
                  <th className="text-center">Income Pot</th>
                  <th className="text-center">Funding Source</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {billsAhead.bills.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No bills due in the next 30 days.</td>
                  </tr>
                ) : (
                  billsAhead.bills.map((bill) => (
                    <tr
                      key={`ahead-${bill.id}`}
                      className={
                        bill.status === "Late"
                          ? "border-l-4 border-l-red-400"
                          : bill.status === "Due Soon"
                          ? "border-l-4 border-l-yellow-300"
                          : undefined
                      }
                    >
                      <td className="text-left">
                        <div className="font-semibold">{bill.name}</div>
                        <div className="mt-1 text-xs text-[#7f8da3]">
                          {getFrequencyLabel(bill.frequency)}
                        </div>
                      </td>
                      <td className="text-right font-semibold">
                        ${Number(bill.remaining || 0).toFixed(2)}
                      </td>
                      <td className="text-center">
                        {bill.nextDueDateDisplay}
                      </td>
                      <td className="text-center">
                        {getIncomeBucketLabel(bill.assigned_income_date)}
                      </td>
                      <td className="text-center">
                        {getFundingSourceLabel(bill.funding_source_id)}
                      </td>
                      <td className="text-center">
                        <span
                          className={
                            bill.status === "Paid"
                              ? "text-green-300"
                              : bill.status === "Partial" ||
                                bill.status === "Due Soon"
                              ? "text-yellow-300"
                              : bill.status === "Late"
                              ? "text-red-300"
                              : "text-[#c7cfdb]"
                          }
                        >
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>


        <section className="beast-card space-y-5">
          <div>
            <h2 className="text-xl font-bold">Income Date Planning</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Assign bills and debt minimums to the real income date that should
              cover them.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">
                Upcoming Income Buckets
              </div>
              <div className="mt-2 break-words text-2xl font-bold">
                {incomeBucketPlans.length}
              </div>
              <p className="mt-2 text-sm text-[#7f8da3]">
                Generated from your income schedule.
              </p>
            </div>

            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Unassigned Items</div>
              <div className="mt-2 break-words text-2xl font-bold">
                {unassignedBills.length + unassignedDebts.length}
              </div>
              <p className="mt-2 text-sm text-[#7f8da3]">
                Assign these in the Bills and Debt Minimums tables below.
              </p>
            </div>

            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">
                Unassigned Obligations
              </div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  unassignedObligationsTotal > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                ${unassignedObligationsTotal.toFixed(2)}
              </div>
              <p className="mt-2 text-sm text-[#7f8da3]">
                Money not assigned to an income pot yet.
              </p>
            </div>

            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Planning Window</div>
              <div className="mt-2 break-words text-2xl font-bold">
                {Number(lookaheadDays || 30)} Days
              </div>
              <p className="mt-2 text-sm text-[#7f8da3]">
                Income buckets are generated from today forward.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {incomeBucketPlans.length === 0 ? (
              <div className="beast-panel p-4 text-sm text-[#c7cfdb]">
                No upcoming income buckets found. Add income events or update
                next pay dates.
              </div>
            ) : (
              incomeBucketPlans.slice(0, 8).map((bucket) => (
                <div key={bucket.id} className="beast-panel overflow-hidden">
                  <div className="border-b border-[#2a3242] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold">{bucket.label}</h3>
                        <p className="text-sm text-[#7f8da3]">
                          Income pot: ${Number(bucket.amount || 0).toFixed(2)}
                        </p>
                      </div>

                      <div
                        className={`text-sm font-semibold ${
                          bucket.safeAfterBuffer < 0
                            ? "text-red-300"
                            : "text-green-300"
                        }`}
                      >
                        {bucket.safeAfterBuffer < 0
                          ? `$${Math.abs(bucket.safeAfterBuffer).toFixed(
                              2
                            )} short after buffer`
                          : `$${bucket.safeAfterBuffer.toFixed(
                              2
                            )} safe after buffer`}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 text-sm text-[#c7cfdb]">
                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <div className="text-[#7f8da3]">Assigned</div>
                        <div className="font-bold">
                          ${bucket.assignedTotal.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7f8da3]">Available</div>
                        <div className="font-bold">
                          ${bucket.availableToAssign.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7f8da3]">Debt Minimums</div>
                        <div className="font-bold">
                          ${bucket.debtMinimumsTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {bucket.assignedBills.length === 0 &&
                    bucket.assignedDebts.length === 0 ? (
                      <p>No obligations assigned yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {bucket.assignedBills.map((bill: any) => (
                          <li
                            key={`bill-${bucket.id}-${bill.id}`}
                            className="flex justify-between gap-4"
                          >
                            <span>{bill.name}</span>
                            <span>
                              ${Number(bill.remaining || 0).toFixed(2)}
                            </span>
                          </li>
                        ))}

                        {bucket.assignedDebts.map((debt: any) => (
                          <li
                            key={`debt-${bucket.id}-${debt.id}`}
                            className="flex justify-between gap-4"
                          >
                            <span>{debt.name} minimum</span>
                            <span>
                              ${Number(debt.minimum_payment || 0).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>


        <section className="beast-panel overflow-hidden">
          <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-xl font-bold">Funding Sources</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Accounts and liquidity sources used to fund bills, debt payments,
                and future HELOC/PLOC planning.
              </p>
              <p className="mt-2 text-xs text-[#5a6577]">
                Funding Sources are accounts or credit lines money can come from. Some sources, like credit cards or HELOCs, may also appear below as debts if you owe a balance.
              </p>
            </div>

            <button
              onClick={() => setShowFundingSources(!showFundingSources)}
              className="beast-button-secondary"
            >
              {showFundingSources
                ? "Hide"
                : `Show (${fundingSources.length})`}
            </button>
          </div>

          {showFundingSources && (
            <div className="space-y-5 p-5">
              <FundingSourcesSummaryCards
                activeSourceCount={activeFundingSources.length}
                liquidFundingTotal={liquidFundingTotal}
                creditAvailableTotal={creditAvailableTotal}
                creditLimitTotal={creditLimitTotal}
                creditUtilizationPercent={creditUtilizationPercent}
              />

              <PaymentSourceCoverage coverage={paymentSourceCoverage} />

              {fundingIntelligence.length > 0 && (
                <FundingIntelligence insights={fundingIntelligence} />
              )}

              {fundingRecommendations.length > 0 && (
                <FundingRecommendations
                  recommendations={fundingRecommendations}
                />
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mt-6">
                <input
                  value={newFundingSource.name}
                  onChange={(e) =>
                    setNewFundingSource({
                      ...newFundingSource,
                      name: e.target.value,
                    })
                  }
                  placeholder="Funding source name"
                  className="beast-input"
                />

                <select
                  value={newFundingSource.type}
                  onChange={(e) =>
                    setNewFundingSource({
                      ...newFundingSource,
                      type: e.target.value,
                    })
                  }
                  className="beast-input"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="heloc">HELOC</option>
                  <option value="ploc">PLOC</option>
                  <option value="cash">Cash</option>
                </select>

                <input
                  type="number"
                  value={newFundingSource.current_balance}
                  onChange={(e) =>
                    setNewFundingSource({
                      ...newFundingSource,
                      current_balance: e.target.value,
                    })
                  }
                  placeholder="Current balance"
                  className="beast-input"
                />

                <input
                  type="number"
                  value={newFundingSource.credit_limit}
                  onChange={(e) =>
                    setNewFundingSource({
                      ...newFundingSource,
                      credit_limit: e.target.value,
                    })
                  }
                  placeholder="Credit limit"
                  className="beast-input"
                />

                <input
                  type="text"
                  readOnly
                  value={
                    Number.isFinite(Number(newFundingSource.credit_limit)) &&
                    Number.isFinite(Number(newFundingSource.current_balance))
                      ? `$${(
                          Number(newFundingSource.credit_limit) -
                          Number(newFundingSource.current_balance)
                        ).toFixed(2)}`
                      : newFundingSource.available_credit || ""
                  }
                  placeholder="Available credit"
                  className="beast-input"
                />

                <input
                  type="number"
                  value={newFundingSource.interest_rate}
                  onChange={(e) =>
                    setNewFundingSource({
                      ...newFundingSource,
                      interest_rate: e.target.value,
                    })
                  }
                  placeholder="Interest rate %"
                  className="beast-input"
                />
              </div>

              <button onClick={addFundingSource} className="beast-button">
                Add Funding Source
              </button>

              <div className="beast-table-wrap">
                <table className="w-full min-w-[840px] text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Name</th>
                      <th className="text-center">Type</th>
                      <th className="text-right">Balance</th>
                      <th className="text-right">Credit Limit</th>
                      <th className="text-right">Available Credit</th>
                      <th className="text-right">Utilization</th>
                      <th className="text-right">APR</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
  {fundingSources.length === 0 ? (
    <tr>
      <td colSpan={8}>No funding sources added yet.</td>
    </tr>
  ) : (
    fundingSources.map((source) => {
      const utilization = getFundingSourceUtilization(source);
      const isEditing = editingFundingSourceId === source.id;

      return (
        <tr key={source.id}>
          <td className="text-left font-semibold">
            {isEditing ? (
              <input
                value={editingFundingSource.name}
                onChange={(e) =>
                  setEditingFundingSource({
                    ...editingFundingSource,
                    name: e.target.value,
                  })
                }
                className="beast-input"
              />
            ) : (
              source.name
            )}
          </td>

          <td className="text-center capitalize">
            {isEditing ? (
              <select
                value={editingFundingSource.type}
                onChange={(e) =>
                  setEditingFundingSource({
                    ...editingFundingSource,
                    type: e.target.value,
                  })
                }
                className="beast-input"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit_card">Credit Card</option>
                <option value="heloc">HELOC</option>
                <option value="ploc">PLOC</option>
                <option value="cash">Cash</option>
              </select>
            ) : (
              source.type.replace("_", " ")
            )}
          </td>

          <td className="text-right">
            {isEditing ? (
              <input
                type="number"
                value={editingFundingSource.current_balance}
                onChange={(e) =>
                  setEditingFundingSource({
                    ...editingFundingSource,
                    current_balance: e.target.value,
                  })
                }
                className="beast-input text-right"
              />
            ) : (
              `$${Number(source.current_balance || 0).toFixed(2)}`
            )}
          </td>

          <td className="text-right">
            {isEditing ? (
              <input
                type="number"
                value={editingFundingSource.credit_limit}
                onChange={(e) =>
                  setEditingFundingSource({
                    ...editingFundingSource,
                    credit_limit: e.target.value,
                  })
                }
                className="beast-input text-right"
              />
            ) : source.credit_limit === null ? (
              "—"
            ) : (
              `$${Number(source.credit_limit || 0).toFixed(2)}`
            )}
          </td>

          <td className="text-right">
            {isEditing ? (
              <input
                type="text"
                readOnly
                value={
                  Number.isFinite(Number(editingFundingSource.credit_limit)) &&
                  Number.isFinite(Number(editingFundingSource.current_balance))
                    ? `$${(
                        Number(editingFundingSource.credit_limit) -
                        Number(editingFundingSource.current_balance)
                      ).toFixed(2)}`
                    : editingFundingSource.available_credit || ""
                }
                className="beast-input text-right"
              />
            ) : source.available_credit === null ? (
              "—"
            ) : (
              `$${Number(source.available_credit || 0).toFixed(2)}`
            )}
          </td>

          <td
            className={`text-right font-semibold ${
              utilization === null
                ? "text-[#c7cfdb]"
                : utilization > 90
                ? "text-red-300"
                : utilization > 70
                ? "text-yellow-300"
                : "text-green-300"
            }`}
          >
            {utilization === null ? "—" : `${utilization.toFixed(1)}%`}
          </td>

          <td className="text-right">
            {isEditing ? (
              <input
                type="number"
                value={editingFundingSource.interest_rate}
                onChange={(e) =>
                  setEditingFundingSource({
                    ...editingFundingSource,
                    interest_rate: e.target.value,
                  })
                }
                className="beast-input text-right"
              />
            ) : (
              `${Number(source.interest_rate || 0).toFixed(2)}%`
            )}
          </td>

          <td className="text-center">
            {isEditing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFundingSource(source.id)}
                    className="beast-button"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditFundingSource}
                    className="beast-button-secondary"
                  >
                    Cancel
                  </button>
                </div>
                {saveError && (
                  <div className="text-red-400 text-xs text-center max-w-xs">
                    {saveError}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => startEditFundingSource(source)}
                  className="beast-button-secondary"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteFundingSource(source.id)}
                  className="beast-button-secondary"
                >
                  Remove
                </button>
              </div>
            )}
          </td>
        </tr>
      );
    })
  )}
</tbody>
                </table>
              </div>
            </div>
          )}
        </section>
        <section className="space-y-2">
          <p className="beast-kicker">Reference / Management Zone</p>
          <h2 className="text-2xl font-bold">
            Configuration and detailed records
          </h2>
        </section>

        <section className="beast-card space-y-5">
          <div>
            <h2 className="text-xl font-bold">Paycheck Planning</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Determine what must be covered before your next paycheck.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-[#c7cfdb]">
                Next Paycheck Amount
              </label>
              <input
                type="number"
                value={nextPaycheckAmount}
                onChange={(e) => setNextPaycheckAmount(e.target.value)}
                placeholder="0"
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Next Paycheck Date
              </label>
              <input
                type="date"
                value={nextPaycheckDate}
                onChange={(e) => setNextPaycheckDate(e.target.value)}
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Following Paycheck Amount
              </label>
              <input
                type="number"
                value={secondPaycheckAmount}
                onChange={(e) => setSecondPaycheckAmount(e.target.value)}
                placeholder="0"
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Following Paycheck Date
              </label>
              <input
                type="date"
                value={secondPaycheckDate}
                onChange={(e) => setSecondPaycheckDate(e.target.value)}
                className="beast-input mt-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">
                Required Before Paycheck
              </div>
              <div className="mt-2 break-words text-2xl font-bold">
                ${requiredBeforePaycheck.toFixed(2)}
              </div>
            </div>

            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">
                Projected After Obligations
              </div>
              <div className="mt-2 break-words text-2xl font-bold">
                ${projectedAfterObligations.toFixed(2)}
              </div>
            </div>

            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Safe To Spend</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  safeToSpend < 0 ? "text-red-300" : "text-green-300"
                }`}
              >
                ${safeToSpend.toFixed(2)}
              </div>
            </div>

            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Status</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  safeToSpend < 0 ? "text-red-300" : "text-green-300"
                }`}
              >
                {safeToSpend < 0 ? "Shortfall Risk" : "On Track"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Strategy</div>
            <div className="mt-2 text-2xl font-bold capitalize">
              {strategy}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">
              Planned Extra Debt Payment
            </div>
            <div className="mt-2 text-2xl font-bold">
              ${extraPayment.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Attack Target</div>
            <div className="mt-2 text-2xl font-bold">{targetDebtName}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Active Debt Count</div>
            <div className="mt-2 text-2xl font-bold">{activeDebts.length}</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="beast-card">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Add Income</h2>
                <p className="mt-1 text-sm text-[#7f8da3]">
                  Add or schedule a recurring income source.
                </p>
              </div>

              <button
                onClick={() => setShowAddIncome(!showAddIncome)}
                className="beast-button-secondary"
              >
                {showAddIncome ? "Hide" : "Show"}
              </button>
            </div>

            {showAddIncome && (
              <div className="mt-4 grid gap-3">
                <input
                  value={incomeName}
                  onChange={(e) => setIncomeName(e.target.value)}
                  placeholder="Income name"
                  className="beast-input"
                />

                <input
                  type="number"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="Amount"
                  className="beast-input"
                />

                <select
                  value={incomeFrequency}
                  onChange={(e) => setIncomeFrequency(e.target.value)}
                  className="beast-input"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <input
                  type="date"
                  value={incomeNextDate}
                  onChange={(e) => setIncomeNextDate(e.target.value)}
                  className="beast-input"
                />

                <button onClick={addIncome} className="beast-button">
                  Add Income
                </button>
              </div>
            )}
          </div>

          <div className="beast-card">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Add Bill</h2>
                <p className="mt-1 text-sm text-[#7f8da3]">
                  Add a recurring bill or service-based obligation.
                </p>
              </div>

              <button
                onClick={() => setShowAddBill(!showAddBill)}
                className="beast-button-secondary"
              >
                {showAddBill ? "Hide" : "Show"}
              </button>
            </div>

            {showAddBill && (
              <div className="mt-4 grid gap-3">
                <input
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="Bill name"
                  className="beast-input"
                />

                <input
                  type="number"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="Amount"
                  className="beast-input"
                />

                <input
                  type="number"
                  min="1"
                  max="31"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  placeholder="Due day"
                  className="beast-input"
                />

                <select
                  value={billFrequency}
                  onChange={(e) =>
                    setBillFrequency(e.target.value as BillFrequency)
                  }
                  className="beast-input"
                >
                  {billFrequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button onClick={addBill} className="beast-button">
                  Add Bill
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-xl font-bold">Cash Timeline</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Detailed projected cashflow events and running balance.
              </p>
            </div>

            <button
              onClick={() => setShowCashTimeline(!showCashTimeline)}
              className="beast-button-secondary"
            >
              {showCashTimeline ? "Hide" : `Show (${data.length})`}
            </button>
          </div>

          {showCashTimeline && (
            <div className="beast-table-wrap">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Running Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6}>Loading cashflow...</td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No cashflow events found.</td>
                    </tr>
                  ) : (
                    data.map((row, index) => {
                      const runningBalance = Number(
                        row.runningBalance || row.running_balance || 0
                      );

                      return (
                        <tr key={`${formatDate(row.date)}-${row.name}-${index}`}>
                          <td>{formatDate(row.date)}</td>
                          <td>{row.type}</td>
                          <td>{row.name}</td>
                          <td className="text-right">
                            ${Number(row.amount || 0).toFixed(2)}
                          </td>
                          <td className="text-right">
                            ${runningBalance.toFixed(2)}
                          </td>
                          <td>
                            {runningBalance < buffer ? (
                              <span className="text-red-300">Risk</span>
                            ) : (
                              <span className="text-green-300">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <BillsSection
          showBills={showBills}
          setShowBills={() => setShowBills(!showBills)}
          activeBills={activeBills}
          editingBillId={editingBillId}
          editBillName={editBillName}
          editBillAmount={editBillAmount}
          editBillDueDate={editBillDueDate}
          editBillFrequency={editBillFrequency}
          setEditBillName={setEditBillName}
          setEditBillAmount={setEditBillAmount}
          setEditBillDueDate={setEditBillDueDate}
          setEditBillFrequency={setEditBillFrequency}
          billFrequencyOptions={billFrequencyOptions}
          getFrequencyLabel={getFrequencyLabel}
          incomeBucketPlans={incomeBucketPlans}
          activeFundingSources={activeFundingSources}
          updateBillIncomeDate={updateBillIncomeDate}
          updateBillFundingSource={updateBillFundingSource}
          partialPayments={partialPayments}
          setPartialPayments={setPartialPayments}
          addBillPayment={addBillPayment}
          markBillPaid={markBillPaid}
          startEditBill={startEditBill}
          saveBillEdit={saveBillEdit}
          cancelEditBill={cancelEditBill}
          archiveBill={archiveBill}
          resetBillDueDate={resetBillDueDate}
        />

        <DebtsSection
          showDebts={showDebts}
          setShowDebts={() => setShowDebts(!showDebts)}
          activeDebts={activeDebts}
          editingDebtId={editingDebtId}
          editDebtName={editDebtName}
          editDebtBalance={editDebtBalance}
          editDebtMinimumPayment={editDebtMinimumPayment}
          editDebtPaymentBehavior={editDebtPaymentBehavior}
          editDebtInterestRate={editDebtInterestRate}
          editDebtDueDate={editDebtDueDate}
          editDebtMinimumPaymentRate={editDebtMinimumPaymentRate}
          editDebtMinimumPaymentFloor={editDebtMinimumPaymentFloor}
          setEditDebtName={setEditDebtName}
          setEditDebtBalance={setEditDebtBalance}
          setEditDebtMinimumPayment={setEditDebtMinimumPayment}
          setEditDebtPaymentBehavior={setEditDebtPaymentBehavior}
          setEditDebtInterestRate={setEditDebtInterestRate}
          setEditDebtDueDate={setEditDebtDueDate}
          setEditDebtMinimumPaymentRate={setEditDebtMinimumPaymentRate}
          setEditDebtMinimumPaymentFloor={setEditDebtMinimumPaymentFloor}
          incomeBucketPlans={incomeBucketPlans}
          activeFundingSources={activeFundingSources}
          updateDebtIncomeDate={updateDebtIncomeDate}
          updateDebtFundingSource={updateDebtFundingSource}
          debtPayments={debtPayments}
          setDebtPayments={setDebtPayments}
          applyDebtPayment={applyDebtPayment}
          applyingDebtPaymentId={applyingDebtPaymentId}
          debtPaymentStatus={debtPaymentStatus}
          startEditDebt={startEditDebt}
          saveDebtEdit={saveDebtEdit}
          cancelEditDebt={cancelEditDebt}
          archiveDebt={archiveDebt}
          resetDebtDueDate={resetDebtDueDate}
          deleteDebt={deleteDebt}
        />
        <section className="beast-panel overflow-hidden">
          <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-xl font-bold">Income Sources / Schedule</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Manage recurring income sources. Future income pots are
                generated in the Income Date Planning section above.
              </p>
            </div>

            <button
              onClick={() => setShowIncomeEvents(!showIncomeEvents)}
              className="beast-button-secondary"
            >
              {showIncomeEvents ? "Hide" : `Show (${incomes.length})`}
            </button>
          </div>

          {showIncomeEvents && (
            <div className="beast-table-wrap">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Frequency</th>
                    <th className="text-center">Next Pay Date</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>

                <tbody>
                  {incomes.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No income events added yet.</td>
                    </tr>
                  ) : (
                    incomes.map((income) => (
                      <tr key={income.id}>
                        <td className="text-left">
                          {editingIncomeId === income.id ? (
                            <input
                              value={editIncomeName}
                              onChange={(e) =>
                                setEditIncomeName(e.target.value)
                              }
                              className="beast-input"
                            />
                          ) : (
                            income.name
                          )}
                        </td>

                        <td className="text-right">
                          {editingIncomeId === income.id ? (
                            <input
                              type="number"
                              value={editIncomeAmount}
                              onChange={(e) =>
                                setEditIncomeAmount(e.target.value)
                              }
                              className="beast-input"
                            />
                          ) : (
                            `$${Number(income.amount || 0).toFixed(2)}`
                          )}
                        </td>

                        <td className="text-center">
                          {editingIncomeId === income.id ? (
                            <select
                              value={editIncomeFrequency}
                              onChange={(e) =>
                                setEditIncomeFrequency(e.target.value)
                              }
                              className="beast-input"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Biweekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          ) : (
                            income.frequency
                          )}
                        </td>

                        <td className="text-center">
                          {editingIncomeId === income.id ? (
                            <input
                              type="date"
                              value={editIncomeNextDate}
                              onChange={(e) =>
                                setEditIncomeNextDate(e.target.value)
                              }
                              className="beast-input"
                            />
                          ) : (
                            getNextIncomeDateDisplay(
                              income.next_date,
                              income.frequency
                            )
                          )}
                        </td>

                        <td className="text-right">
                          {editingIncomeId === income.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveIncomeEdit(income.id)}
                                className="beast-button"
                              >
                                Save
                              </button>

                              <button
                                onClick={cancelEditIncome}
                                className="beast-button-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditIncome(income)}
                                className="beast-button-secondary"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => deleteIncome(income.id)}
                                className="beast-button"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>


        <section className="beast-panel overflow-hidden">
          <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-xl font-bold">Archived Bills</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Hidden from planning and income-date calculations.
              </p>
            </div>

            <button
              onClick={() => setShowArchivedBills(!showArchivedBills)}
              className="beast-button-secondary"
            >
              {showArchivedBills ? "Hide" : `Show (${archivedBills.length})`}
            </button>
          </div>

          {showArchivedBills && (
            <div className="beast-table-wrap">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Frequency</th>
                    <th className="text-center">Income Date</th>
                    <th className="text-center">Funding Source</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {archivedBills.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No archived bills.</td>
                    </tr>
                  ) : (
                    archivedBills.map((bill) => (
                      <tr key={bill.id}>
                        <td className="text-left">{bill.name}</td>
                        <td className="text-right">
                          ${Number(bill.remaining || 0).toFixed(2)}
                        </td>
                        <td className="text-center">
                          {getFrequencyLabel(bill.frequency)}
                        </td>
                        <td className="text-center">
                          {getIncomeBucketLabel(bill.assigned_income_date)}
                        </td>
                        <td className="text-center">
                          {getFundingSourceLabel(bill.funding_source_id)}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => unarchiveBill(bill.id)}
                            className="beast-button"
                          >
                            Unarchive
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-xl font-bold">Archived Debts</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Hidden from planning and income-date calculations.
              </p>
            </div>

            <button
              onClick={() => setShowArchivedDebts(!showArchivedDebts)}
              className="beast-button-secondary"
            >
              {showArchivedDebts ? "Hide" : `Show (${archivedDebts.length})`}
            </button>
          </div>

          {showArchivedDebts && (
            <div className="beast-table-wrap">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Debt</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">Minimum</th>
                    <th className="text-center">Income Date</th>
                    <th className="text-center">Funding Source</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {archivedDebts.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No archived debts.</td>
                    </tr>
                  ) : (
                    archivedDebts.map((debt) => (
                      <tr key={debt.id}>
                        <td className="text-left">{debt.name}</td>
                        <td className="text-right">
                          ${Number(debt.balance || 0).toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${Number(debt.minimum_payment || 0).toFixed(2)}
                        </td>
                        <td className="text-center">
                          {getIncomeBucketLabel(debt.assigned_income_date)}
                        </td>
                        <td className="text-center">
                          {getFundingSourceLabel(debt.funding_source_id)}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => unarchiveDebt(debt.id)}
                            className="beast-button"
                          >
                            Unarchive
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
