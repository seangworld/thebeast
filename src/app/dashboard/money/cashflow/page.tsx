"use client";

import { useMemo } from "react";
import BillsSection from "./components/BillsSection";
import DebtsSection from "./components/DebtsSection";
import CashFlowOverview from "./components/CashFlowOverview";
import DebtAttackRecommendation from "./components/DebtAttackRecommendation";
import DailyOperatingFocus from "./components/DailyOperatingFocus";
import BillsAheadSection from "./components/BillsAheadSection";
import IncomeDatePlanningSection from "./components/IncomeDatePlanningSection";
import PaycheckPlanningSection from "./components/PaycheckPlanningSection";
import StrategySnapshot from "./components/StrategySnapshot";
import AddIncomeBillSection from "./components/AddIncomeBillSection";
import CashTimelineSection from "./components/CashTimelineSection";
import FundingSourcesSection from "./components/FundingSourcesSection";
import IncomeSourcesSection from "./components/IncomeSourcesSection";
import ArchivedItemsSection from "./components/ArchivedItemsSection";
import { useCashFlow } from "./useCashFlow";
import {
  FundingSource,
  OperationalAlert,
  PayoffStrategy,
  PaymentSourceCoverageType,
  billFrequencyOptions,
  getBillStatus,
  getCycleMonth,
  getCurrentBillCycleDueDate,
  getCurrentDebtCycleDueDate,
  getFrequencyLabel,
  getFrequencyMonthStep,
  getTargetDebt,
  addDays,
  addMonthsClamped,
  advanceIncomeDate,
  buildIncomeBuckets,
  formatDate,
  formatShortDate,
  getNextIncomeDateDisplay,
  parseDateOnly,
  getFundingSourceBalance,
  getFundingSourceAvailableCredit,
  sortObligationsByNextDueDate,
} from "./cashflowUtils";

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
    cashIntelligence,
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
        if (!bill.next_due_date_after_payment) {
          if (frequency === "weekly") nextDueDate = addDays(currentCycleDueDate, 7);
          else if (frequency === "biweekly")
            nextDueDate = addDays(currentCycleDueDate, 14);
          else
            nextDueDate = addMonthsClamped(
              currentCycleDueDate,
              getFrequencyMonthStep(frequency)
            );
        }

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
    return sortObligationsByNextDueDate(
      billsWithPaymentStatus.filter((bill) => !bill.is_archived)
    );
  }, [billsWithPaymentStatus]);

  const archivedBills = useMemo(() => {
    return sortObligationsByNextDueDate(
      billsWithPaymentStatus.filter((bill) => bill.is_archived)
    );
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

    const linkedDebt = debts.find((d) => d.id === source.linked_debt_id);
    const usedCredit = getFundingSourceBalance(source, linkedDebt);
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
      .reduce((sum, source) => {
        const availableCredit = getFundingSourceAvailableCredit(
          source,
          debts.find((d) => d.id === source.linked_debt_id)
        );
        return sum + Number(availableCredit || 0);
      }, 0);
  }, [activeFundingSources, debts]);

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

    function addCoverageAmount(fundingSourceId: string | null, amount: number) {
      if (!fundingSourceId) {
        coverage.unassigned += amount;
        return;
      }

      const source = fundingSources.find((s) => s.id === fundingSourceId);
      if (!source) {
        coverage.unassigned += amount;
        return;
      }

      const sourceType = source.type as keyof PaymentSourceCoverageType;
      if (sourceType in coverage) {
        coverage[sourceType] += amount;
      } else {
        coverage.unassigned += amount;
      }
    }

    for (const payment of billPayments) {
      addCoverageAmount(
        payment.funding_source_id || null,
        Number(payment.amount_paid || 0)
      );
    }

    for (const payment of debtPaymentRows) {
      if (!String(payment.cycle_due_date || "").startsWith(cycleMonth)) {
        continue;
      }

      if (!payment.funding_source_id) {
        continue;
      }

      addCoverageAmount(
        payment.funding_source_id,
        Number(payment.amount || 0)
      );
    }

    return coverage;
  }, [billPayments, cycleMonth, debtPaymentRows, fundingSources]);

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
    return sortObligationsByNextDueDate(
      debtsWithAssignmentStatus.filter((debt) => !debt.is_archived)
    );
  }, [debtsWithAssignmentStatus]);

  const archivedDebts = useMemo(() => {
    return sortObligationsByNextDueDate(
      debtsWithAssignmentStatus.filter((debt) => debt.is_archived)
    );
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
      });

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

  const safeToSpend =
    cashIntelligence?.nextPaydayCash ?? projectedAfterObligations - Number(buffer || 0);

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
    return sortObligationsByNextDueDate(
      activeBills.filter(
        (bill) =>
          !bill.assigned_income_date && bill.nextDueDate <= planningWindowEnd
      )
    );
  }, [activeBills, planningWindowEnd]);

  const unassignedDebts = useMemo(() => {
    return sortObligationsByNextDueDate(
      activeDebts.filter(
        (debt) =>
          !debt.assigned_income_date && debt.nextDueDate <= planningWindowEnd
      )
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

      const usedCredit = getFundingSourceBalance(
        source,
        debts.find((d) => d.id === source.linked_debt_id)
      );

      return (usedCredit / creditLimit) * 100 > 70;
    }).length;
  }, [activeFundingSources, debts]);

  const incomeBucketPlans = useMemo(() => {
    const creditFundingSourceTypes = ["credit_card", "heloc", "ploc"];
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const bucketsByDate: Record<string, any> = {};

    for (const bucket of incomeBuckets) {
      bucketsByDate[bucket.date] = { ...bucket };
    }

    const activeAssignedIncomeDates = new Set<string>();

    for (const bill of activeBills) {
      if (
        bill.assigned_income_date &&
        Number(bill.remaining || 0) > 0 &&
        bill.nextDueDate >= todayOnly
      ) {
        activeAssignedIncomeDates.add(bill.assigned_income_date);
      }
    }

    for (const debt of activeDebts) {
      if (
        debt.assigned_income_date &&
        Number(debt.minimum_payment || 0) > 0 &&
        debt.nextDueDate >= todayOnly
      ) {
        activeAssignedIncomeDates.add(debt.assigned_income_date);
      }
    }

    for (const assignedDate of Array.from(activeAssignedIncomeDates)) {
      if (bucketsByDate[assignedDate]) continue;

      const assignedDateOnly = parseDateOnly(assignedDate);
      const sources: string[] = [];
      let amount = 0;

      for (const income of incomes) {
        if (!income?.next_date) continue;

        let payDate = parseDateOnly(income.next_date);
        const frequency = income.frequency || "monthly";
        let safety = 0;

        while (payDate > assignedDateOnly && safety < 120) {
          if (frequency === "weekly") payDate = addDays(payDate, -7);
          else if (frequency === "biweekly") payDate = addDays(payDate, -14);
          else
            payDate = addMonthsClamped(
              payDate,
              -getFrequencyMonthStep(frequency)
            );
          safety += 1;
        }

        while (payDate < assignedDateOnly && safety < 240) {
          payDate = advanceIncomeDate(payDate, frequency);
          safety += 1;
        }

        if (payDate.getTime() === assignedDateOnly.getTime()) {
          amount += Number(income.amount || 0);
          sources.push(income.name || "Income");
        }
      }

      const sourceLabel =
        sources.length === 0
          ? "Assigned Income Pot"
          : Array.from(new Set(sources)).join(" + ");

      bucketsByDate[assignedDate] = {
        id: `assigned-income-pot-${assignedDate}`,
        date: assignedDate,
        amount,
        sources,
        sourceName: sourceLabel,
        frequency: "assigned",
        label: `${formatShortDate(assignedDateOnly)} - ${sourceLabel}`,
      };
    }
    
    return Object.values(bucketsByDate)
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
      .map((bucket) => {
      const assignedBills = sortObligationsByNextDueDate(
        activeBills.filter((bill) => bill.assigned_income_date === bucket.date)
      );

      const assignedDebts = sortObligationsByNextDueDate(
        activeDebts.filter((debt) => debt.assigned_income_date === bucket.date)
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
  }, [incomeBuckets, activeBills, activeDebts, incomes, fundingSources, buffer]);

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
        <CashFlowOverview
          startingBalance={startingBalance}
          setStartingBalance={setStartingBalance}
          recalc={recalc}
          handleStartingBalanceBlur={handleStartingBalanceBlur}
          isStartingBalanceFocusedRef={isStartingBalanceFocusedRef}
          saveStatus={saveStatus}
          requiredCash={requiredCash}
          billsDue={billsDue}
          incomeExpected={incomeExpected}
          netPosition={netPosition}
          buffer={buffer}
        />

        <DebtAttackRecommendation
          suggestedMonthlyDebtAttack={suggestedMonthlyDebtAttack}
          incomes={incomes}
          nextPaycheckAmount={nextPaycheckAmount}
          recommendedTargetDebt={recommendedTargetDebt}
          strategy={strategy}
          isApplyingSuggestedAttack={isApplyingSuggestedAttack}
          applySuggestedAttack={applySuggestedAttack}
          suggestedAttackMessage={suggestedAttackMessage}
        />

        <DailyOperatingFocus
          operationalAlerts={operationalAlerts}
          safeToSpend={safeToSpend}
          requiredBeforePaycheck={requiredBeforePaycheck}
          startingBalance={startingBalance}
          billsDueNext7Days={billsDueNext7Days}
          billsAhead={billsAhead}
          unassignedObligationsCount={unassignedObligationsCount}
          fundingSourceRiskCount={fundingSourceRiskCount}
          recommendedNextSteps={recommendedNextSteps}
          buffer={buffer}
        />

        <BillsAheadSection
          billsAhead={billsAhead}
          getFrequencyLabel={getFrequencyLabel}
          getIncomeBucketLabel={getIncomeBucketLabel}
          getFundingSourceLabel={getFundingSourceLabel}
        />

        <IncomeDatePlanningSection
          incomeBucketPlans={incomeBucketPlans}
          unassignedBills={unassignedBills}
          unassignedDebts={unassignedDebts}
          unassignedObligationsTotal={unassignedObligationsTotal}
          lookaheadDays={lookaheadDays}
        />


        <FundingSourcesSection
          showFundingSources={showFundingSources}
          setShowFundingSources={setShowFundingSources}
          fundingSources={fundingSources}
          debts={debts}
          activeFundingSources={activeFundingSources}
          summary={{
            activeSourceCount: activeFundingSources.length,
            liquidFundingTotal,
            creditAvailableTotal,
            creditLimitTotal,
            creditUtilizationPercent,
          }}
          paymentSourceCoverage={paymentSourceCoverage}
          fundingIntelligence={fundingIntelligence}
          fundingRecommendations={fundingRecommendations}
          newFundingSource={newFundingSource}
          setNewFundingSource={setNewFundingSource}
          addFundingSource={addFundingSource}
          editingFundingSourceId={editingFundingSourceId}
          editingFundingSource={editingFundingSource}
          setEditingFundingSource={setEditingFundingSource}
          saveError={saveError}
          getFundingSourceBalance={getFundingSourceBalance}
          getFundingSourceAvailableCredit={getFundingSourceAvailableCredit}
          getFundingSourceUtilization={getFundingSourceUtilization}
          startEditFundingSource={startEditFundingSource}
          cancelEditFundingSource={cancelEditFundingSource}
          updateFundingSource={updateFundingSource}
          deleteFundingSource={deleteFundingSource}
        />
        <section className="space-y-2">
          <p className="beast-kicker">Reference / Management Zone</p>
          <h2 className="text-2xl font-bold">
            Configuration and detailed records
          </h2>
        </section>

        <div id="paycheck-planning">
        <PaycheckPlanningSection
          nextPaycheckAmount={nextPaycheckAmount}
          setNextPaycheckAmount={setNextPaycheckAmount}
          nextPaycheckDate={nextPaycheckDate}
          setNextPaycheckDate={setNextPaycheckDate}
          secondPaycheckAmount={secondPaycheckAmount}
          setSecondPaycheckAmount={setSecondPaycheckAmount}
          secondPaycheckDate={secondPaycheckDate}
          setSecondPaycheckDate={setSecondPaycheckDate}
          requiredBeforePaycheck={requiredBeforePaycheck}
          projectedAfterObligations={projectedAfterObligations}
          safeToSpend={safeToSpend}
        />
        </div>

        <StrategySnapshot
          strategy={strategy}
          extraPayment={extraPayment}
          targetDebtName={targetDebtName}
          activeDebtCount={activeDebts.length}
        />

        <AddIncomeBillSection
          showAddIncome={showAddIncome}
          setShowAddIncome={setShowAddIncome}
          incomeName={incomeName}
          setIncomeName={setIncomeName}
          incomeAmount={incomeAmount}
          setIncomeAmount={setIncomeAmount}
          incomeFrequency={incomeFrequency}
          setIncomeFrequency={setIncomeFrequency}
          incomeNextDate={incomeNextDate}
          setIncomeNextDate={setIncomeNextDate}
          addIncome={addIncome}
          showAddBill={showAddBill}
          setShowAddBill={setShowAddBill}
          billName={billName}
          setBillName={setBillName}
          billAmount={billAmount}
          setBillAmount={setBillAmount}
          billDueDate={billDueDate}
          setBillDueDate={setBillDueDate}
          billFrequency={billFrequency}
          setBillFrequency={setBillFrequency}
          billFrequencyOptions={billFrequencyOptions}
          addBill={addBill}
        />

        <CashTimelineSection
          showCashTimeline={showCashTimeline}
          setShowCashTimeline={setShowCashTimeline}
          data={data}
          loading={loading}
          formatDate={formatDate}
          buffer={buffer}
        />

        <div id="bills">
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
        </div>

        <div id="debts">
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
        </div>
        <IncomeSourcesSection
          showIncomeEvents={showIncomeEvents}
          setShowIncomeEvents={setShowIncomeEvents}
          incomes={incomes}
          editingIncomeId={editingIncomeId}
          editIncomeName={editIncomeName}
          editIncomeAmount={editIncomeAmount}
          editIncomeFrequency={editIncomeFrequency}
          editIncomeNextDate={editIncomeNextDate}
          setEditIncomeName={setEditIncomeName}
          setEditIncomeAmount={setEditIncomeAmount}
          setEditIncomeFrequency={setEditIncomeFrequency}
          setEditIncomeNextDate={setEditIncomeNextDate}
          getNextIncomeDateDisplay={getNextIncomeDateDisplay}
          startEditIncome={startEditIncome}
          saveIncomeEdit={saveIncomeEdit}
          cancelEditIncome={cancelEditIncome}
          deleteIncome={deleteIncome}
        />

        <ArchivedItemsSection
          showArchivedBills={showArchivedBills}
          setShowArchivedBills={setShowArchivedBills}
          archivedBills={archivedBills}
          showArchivedDebts={showArchivedDebts}
          setShowArchivedDebts={setShowArchivedDebts}
          archivedDebts={archivedDebts}
          getFrequencyLabel={getFrequencyLabel}
          getIncomeBucketLabel={getIncomeBucketLabel}
          getFundingSourceLabel={getFundingSourceLabel}
          unarchiveBill={unarchiveBill}
          unarchiveDebt={unarchiveDebt}
        />
      </div>
    </main>
  );
}
