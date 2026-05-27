"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildCashTimeline,
  simulateCashFlow,
  calculateRequiredCash,
  calculateBillsDue,
  calculateIncomeExpected,
} from "@/lib/cashflow";
import { createClient } from "@/lib/supabase/client";

type PayoffStrategy = "snowball" | "avalanche";

type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "every_2_months"
  | "every_3_months"
  | "every_6_months"
  | "yearly";

type PaycheckAssignment = "unassigned" | "paycheck_1" | "paycheck_2";

type FundingSource = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  current_balance: number;
  credit_limit: number | null;
  available_credit: number | null;
  interest_rate: number | null;
  is_active: boolean;
  created_at: string;
};

type OperationalAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

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

function getFrequencyLabel(value: string) {
  return (
    billFrequencyOptions.find((option) => option.value === value)?.label ||
    "Monthly"
  );
}

function getAssignmentLabel(value: string) {
  return (
    paycheckAssignmentOptions.find((option) => option.value === value)?.label ||
    "Unassigned"
  );
}

function getTargetDebt(debts: any[], strategy: PayoffStrategy) {
  const active = debts.filter((d) => Number(d.balance || 0) > 0);

  if (active.length === 0) return null;

  if (strategy === "avalanche") {
    return [...active].sort(
      (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
    )[0];
  }

  return [...active].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
  )[0];
}

function formatDate(value: any) {
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value || "");
}

function getCycleMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function getFrequencyMonthStep(frequency: string) {
  if (frequency === "every_2_months") return 2;
  if (frequency === "every_3_months") return 3;
  if (frequency === "every_6_months") return 6;
  if (frequency === "yearly") return 12;
  return 1;
}

function getNextDueDate(dueDay: number, frequency = "monthly") {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let dueDate = new Date(year, month, dueDay);

  if (dueDate < new Date(year, month, today.getDate())) {
    dueDate = new Date(year, month + getFrequencyMonthStep(frequency), dueDay);
  }

  return dueDate;
}

function getDebtCycleDueDate(dueDay: number) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const safeDueDay = Math.min(
    Math.max(Number(dueDay || 1), 1),
    new Date(year, month + 1, 0).getDate()
  );

  return new Date(year, month, safeDueDay);
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date: Date, months: number) {
  const originalDay = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

function advanceIncomeDate(date: Date, frequency: string) {
  if (frequency === "weekly") return addDays(date, 7);
  if (frequency === "biweekly") return addDays(date, 14);
  if (frequency === "monthly") return addMonthsClamped(date, 1);
  return addMonthsClamped(date, 1);
}

function getNextIncomeDateDisplay(nextDate: string, frequency: string) {
  if (!nextDate) return "—";

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  let date = parseDateOnly(nextDate);
  let safety = 0;

  while (date < todayOnly && safety < 120) {
    date = advanceIncomeDate(date, frequency || "monthly");
    safety += 1;
  }

  return formatShortDate(date);
}

function buildIncomeBuckets(incomes: any[], days: number) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = addDays(start, Math.max(Number(days || 30), 1));
  const rawBuckets: any[] = [];

  for (const income of incomes) {
    if (!income?.next_date) continue;

    let payDate = parseDateOnly(income.next_date);
    const frequency = income.frequency || "monthly";
    let safety = 0;

    while (payDate < start && safety < 120) {
      payDate = advanceIncomeDate(payDate, frequency);
      safety += 1;
    }

    while (payDate <= end && safety < 240) {
      const dateValue = toDateInputValue(payDate);

      rawBuckets.push({
        id: `${income.id}-${dateValue}`,
        income_id: income.id,
        sourceName: income.name || "Income",
        amount: Number(income.amount || 0),
        frequency,
        date: dateValue,
      });

      payDate = advanceIncomeDate(payDate, frequency);
      safety += 1;
    }
  }

  const groupedByDate: Record<string, any> = {};

  for (const bucket of rawBuckets) {
    if (!groupedByDate[bucket.date]) {
      groupedByDate[bucket.date] = {
        id: `income-pot-${bucket.date}`,
        date: bucket.date,
        amount: 0,
        sources: [],
        sourceName: "Income Pot",
        frequency: "mixed",
      };
    }

    groupedByDate[bucket.date].amount += Number(bucket.amount || 0);
    groupedByDate[bucket.date].sources.push(bucket.sourceName || "Income");
  }

  return Object.values(groupedByDate)
    .map((bucket: any) => {
      const payDate = parseDateOnly(bucket.date);
      const sources = Array.from(new Set(bucket.sources || []));
      const sourceLabel =
        sources.length === 0
          ? "Income Pot"
          : sources.length === 1
          ? String(sources[0])
          : sources.map(String).join(" + ");

      return {
        ...bucket,
        sourceName: sourceLabel,
        label: `${formatShortDate(payDate)} - ${sourceLabel}`,
      };
    })
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
}

function getBillStatus({
  amount,
  paid,
  nextDueDate,
}: {
  amount: number;
  paid: number;
  nextDueDate: Date;
}) {
  const remaining = Math.max(amount - paid, 0);
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const daysUntilDue = Math.ceil(
    (nextDueDate.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (remaining <= 0) return "Paid";
  if (daysUntilDue < 0) return "Late";
  if (paid > 0) return "Partial";
  if (daysUntilDue <= 5) return "Due Soon";

  return "Upcoming";
}

export default function CashFlowPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [billPayments, setBillPayments] = useState<any[]>([]);
  const [debtPaymentRows, setDebtPaymentRows] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);

  const [editingFundingSourceId, setEditingFundingSourceId] = useState<string | null>(null);

  const [editingFundingSource, setEditingFundingSource] = useState({
  name: "",
  type: "checking",
  current_balance: "",
  credit_limit: "",
  available_credit: "",
  interest_rate: "",
});

  const [newFundingSource, setNewFundingSource] = useState({
    name: "",
    type: "checking",
    current_balance: "",
    credit_limit: "",
    available_credit: "",
    interest_rate: "",
  });

  const [requiredCash, setRequiredCash] = useState(0);
  const [billsDue, setBillsDue] = useState(0);
  const [incomeExpected, setIncomeExpected] = useState(0);

  const [lookaheadDays, setLookaheadDays] = useState(30);
  const [buffer, setBuffer] = useState(500);
  // TODO: `startingBalance` comes from `cash_settings.starting_balance` and
  // may overlap with `funding_sources` entries of type 'checking' (their
  // `current_balance`). Consider consolidating the single source-of-truth
  // for displayed checking balance in a future cleanup.
  const [startingBalance, setStartingBalance] = useState(500);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const autosaveTimerRef = useRef<number | null>(null);
  const saveStatusTimerRef = useRef<number | null>(null);
  const isStartingBalanceInitialRender = useRef(true);
  const pendingSaveRef = useRef(false);
  const isStartingBalanceFocusedRef = useRef(false);
  const AUTOSAVE_DEBOUNCE_MS = 1700;

  const [strategy, setStrategy] = useState<PayoffStrategy>("snowball");
  const [extraPayment, setExtraPayment] = useState(0);
  const [targetDebtName, setTargetDebtName] = useState("—");

  const [incomeName, setIncomeName] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeFrequency, setIncomeFrequency] = useState("biweekly");
  const [incomeNextDate, setIncomeNextDate] = useState("");

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billFrequency, setBillFrequency] = useState<BillFrequency>("monthly");

  const [nextPaycheckAmount, setNextPaycheckAmount] = useState("");
  const [nextPaycheckDate, setNextPaycheckDate] = useState("");
  const [secondPaycheckAmount, setSecondPaycheckAmount] = useState("");
  const [secondPaycheckDate, setSecondPaycheckDate] = useState("");

  const [loading, setLoading] = useState(true);

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  const [editIncomeName, setEditIncomeName] = useState("");
  const [editIncomeAmount, setEditIncomeAmount] = useState("");
  const [editIncomeFrequency, setEditIncomeFrequency] = useState("biweekly");
  const [editIncomeNextDate, setEditIncomeNextDate] = useState("");

  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDate, setEditBillDueDate] = useState("");
  const [editBillFrequency, setEditBillFrequency] =
    useState<BillFrequency>("monthly");

  const [editDebtName, setEditDebtName] = useState("");
  const [editDebtBalance, setEditDebtBalance] = useState("");
  const [editDebtMinimumPayment, setEditDebtMinimumPayment] = useState("");
  const [editDebtInterestRate, setEditDebtInterestRate] = useState("");
  const [editDebtDueDate, setEditDebtDueDate] = useState("");
  const [editDebtPaymentBehavior, setEditDebtPaymentBehavior] = useState<"fixed" | "revolving">("fixed");
  const [editDebtMinimumPaymentRate, setEditDebtMinimumPaymentRate] = useState("2");
  const [editDebtMinimumPaymentFloor, setEditDebtMinimumPaymentFloor] = useState("25");

  const [debtPayments, setDebtPayments] = useState<Record<string, string>>({});
  const [partialPayments, setPartialPayments] = useState<Record<string, string>>(
    {}
  );

  const [isApplyingSuggestedAttack, setIsApplyingSuggestedAttack] = useState(false);
  const [suggestedAttackMessage, setSuggestedAttackMessage] = useState<string | null>(null);

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showBills, setShowBills] = useState(true);
  const [showDebts, setShowDebts] = useState(true);
  const [showIncomeEvents, setShowIncomeEvents] = useState(true);
  const [showFundingSources, setShowFundingSources] = useState(true);
  const [showCashTimeline, setShowCashTimeline] = useState(false);
  const [showArchivedBills, setShowArchivedBills] = useState(false);
  const [showArchivedDebts, setShowArchivedDebts] = useState(false);

  const cycleMonth = getCycleMonth();

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
      let nextDueDate = getNextDueDate(dueDay, frequency);
      let remaining = currentCycleRemaining;

      if (currentCycleRemaining <= 0) {
        if (frequency === "weekly") nextDueDate = addDays(nextDueDate, 7);
        else if (frequency === "biweekly")
          nextDueDate = addDays(nextDueDate, 14);
        else
          nextDueDate = addMonthsClamped(
            nextDueDate,
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
  }, [bills, paymentsByBillId]);

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
    return buildIncomeBuckets(incomes, Number(lookaheadDays || 30));
  }, [incomes, lookaheadDays]);

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

    const availableCredit = Number(source.available_credit || 0);
    const usedCredit = Math.max(creditLimit - availableCredit, 0);

    return (usedCredit / creditLimit) * 100;
  }

  const activeFundingSources = useMemo(() => {
    return fundingSources.filter((source) => source.is_active);
  }, [fundingSources]);

  const liquidFundingTotal = useMemo(() => {
    return activeFundingSources
      .filter((source) => ["checking", "savings", "cash"].includes(source.type))
      .reduce((sum, source) => sum + Number(source.current_balance || 0), 0);
  }, [activeFundingSources]);

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
      const currentCycleDueDate = getDebtCycleDueDate(dueDay);
      const cycleKey = `${debt.id}||${currentCycleDueDate
        .toISOString()
        .slice(0, 10)}`;
      const currentCyclePaid = Number(
        debtPaymentsByDebtAndCycle[cycleKey] || 0
      );
      const nextDueDate = currentCyclePaid >= minimumPayment
        ? addMonthsClamped(currentCycleDueDate, 1)
        : currentCycleDueDate;

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
    return incomeBuckets.map((bucket) => {
      const assignedBills = activeBills.filter(
        (bill) => bill.assigned_income_date === bucket.date
      );

      const assignedDebts = activeDebts.filter(
        (debt) => debt.assigned_income_date === bucket.date
      );

      const billsTotal = assignedBills.reduce(
        (sum, bill) => sum + Number(bill.remaining || 0),
        0
      );

      const debtMinimumsTotal = assignedDebts.reduce(
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
  }, [incomeBuckets, activeBills, activeDebts, buffer]);

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

    const lowImpactDebtMinimums = activeDebts.filter((debt) => {
      const balance = Number(debt.balance || 0);
      const minimumPayment = Number(debt.minimum_payment || 0);
      const monthlyInterest =
        balance * (Number(debt.interest_rate || 0) / 100 / 12);
      const principalReduction = minimumPayment - monthlyInterest;

      if (balance <= 0 || minimumPayment <= 0) return false;

      return principalReduction < balance * 0.005;
    });

    if (lowImpactDebtMinimums.length > 0) {
      alerts.push({
        id: "low-impact-debt-minimums",
        severity: "warning",
        title: "Debt minimums barely reduce balance",
        message: `${lowImpactDebtMinimums.length} debt${
          lowImpactDebtMinimums.length === 1 ? "" : "s"
        } below 0.5% principal reduction.`,
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

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }, []);

  const loadFundingSources = useCallback(async () => {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    const { data } = await supabase
      .from("funding_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    setFundingSources(data || []);
  }, [getUserId]);

  async function addFundingSource() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!newFundingSource.name) return;

    await supabase.from("funding_sources").insert({
      user_id: userId,
      name: newFundingSource.name,
      type: newFundingSource.type,
      current_balance: Number(newFundingSource.current_balance || 0),
      credit_limit:
        newFundingSource.credit_limit === ""
          ? null
          : Number(newFundingSource.credit_limit),
      available_credit:
        newFundingSource.available_credit === ""
          ? null
          : Number(newFundingSource.available_credit),
      interest_rate:
        newFundingSource.interest_rate === ""
          ? 0
          : Number(newFundingSource.interest_rate),
      is_active: true,
    });

    setNewFundingSource({
      name: "",
      type: "checking",
      current_balance: "",
      credit_limit: "",
      available_credit: "",
      interest_rate: "",
    });

    await loadFundingSources();
  }

  function startEditFundingSource(source: any) {
    setEditingFundingSourceId(source.id);
    setEditingFundingSource({
      name: source.name || "",
      type: source.type || "checking",
      current_balance: String(source.current_balance ?? ""),
      credit_limit: String(source.credit_limit ?? ""),
      available_credit: String(source.available_credit ?? ""),
      interest_rate: String(source.interest_rate ?? ""),
    });
  }
  
  function cancelEditFundingSource() {
    setEditingFundingSourceId(null);
    setEditingFundingSource({
      name: "",
      type: "checking",
      current_balance: "",
      credit_limit: "",
      available_credit: "",
      interest_rate: "",
    });
  }
  
  async function updateFundingSource(id: string) {
    const supabase = createClient();
  
    await supabase
      .from("funding_sources")
      .update({
        name: editingFundingSource.name,
        type: editingFundingSource.type,
        current_balance: Number(editingFundingSource.current_balance || 0),
        credit_limit:
          editingFundingSource.credit_limit === ""
            ? null
            : Number(editingFundingSource.credit_limit),
        available_credit:
          editingFundingSource.available_credit === ""
            ? null
            : Number(editingFundingSource.available_credit),
        interest_rate:
          editingFundingSource.interest_rate === ""
            ? 0
            : Number(editingFundingSource.interest_rate),
      })
      .eq("id", id);
  
    cancelEditFundingSource();
    await loadFundingSources();
  }

  async function deleteFundingSource(id: string) {
    const supabase = createClient();

    await supabase
      .from("funding_sources")
      .update({
        is_active: false,
      })
      .eq("id", id);

    await loadFundingSources();
  }

  const load = useCallback(async () => {
    setLoading(true);

    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: incomeRows } = await supabase
      .from("income_events")
      .select("*")
      .eq("user_id", userId)
      .order("next_date", { ascending: true });

    const { data: billRows } = await supabase
      .from("bill_events")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    const { data: paymentRows } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("user_id", userId)
      .eq("cycle_month", cycleMonth);

    const { data: debtPaymentRows } = await supabase
      .from("debt_payments")
      .select("*")
      .eq("user_id", userId);

    const { data: debtRows } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    const { data: cashSettings } = await supabase
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: debtSettings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const activeLookahead = Number(cashSettings?.lookahead_days ?? 30);
    const activeBuffer = Number(cashSettings?.checking_buffer ?? 500);
    const activeStartingBalance = Number(cashSettings?.starting_balance ?? 500);

    const activeStrategy = (debtSettings?.strategy ||
      "snowball") as PayoffStrategy;
    const activeExtraPayment = Number(debtSettings?.extra_payment || 0);

    const activeDebtRows = (debtRows || []).filter(
      (debt) => !Boolean(debt.is_archived)
    );
    const targetDebt = getTargetDebt(activeDebtRows, activeStrategy);

    const activePayments = paymentRows || [];
    const activeDebtPayments = debtPaymentRows || [];

    const paymentTotals: Record<string, number> = {};
    for (const payment of activePayments) {
      paymentTotals[payment.bill_id] =
        Number(paymentTotals[payment.bill_id] || 0) +
        Number(payment.amount_paid || 0);
    }

    const debtPaymentTotals: Record<string, number> = {};
    for (const payment of activeDebtPayments) {
      const key = `${payment.debt_id}||${payment.cycle_due_date}`;
      debtPaymentTotals[key] =
        Number(debtPaymentTotals[key] || 0) + Number(payment.amount || 0);
    }

    const debtsForTimeline = (activeDebtRows || []).map((debt) => {
      const minimumPayment = Number(debt.minimum_payment || 0);
      const dueDay = Number(debt.due_date || 1);
      const currentCycleDueDate = getDebtCycleDueDate(dueDay);
      const cycleKey = `${debt.id}||${currentCycleDueDate
        .toISOString()
        .slice(0, 10)}`;
      const isCurrentCyclePaid =
        Number(debtPaymentTotals[cycleKey] || 0) >= minimumPayment;

      return {
        ...debt,
        minimum_payment: minimumPayment,
        due_date: Number(debt.due_date || 1),
        frequency: "monthly",
        nextDueDateOverride: isCurrentCyclePaid
          ? addMonthsClamped(currentCycleDueDate, 1)
          : currentCycleDueDate,
      };
    });

    const billsForTimeline = (billRows || [])
      .filter((bill) => !Boolean(bill.is_archived))
      .map((bill) => {
        const amount = Number(bill.amount || 0);
        const paid = Number(paymentTotals[bill.id] || 0);
        const remaining = Math.max(amount - paid, 0);

        return {
          ...bill,
          amount: remaining,
          frequency: bill.frequency || "monthly",
        };
      })
      .filter((bill) => Number(bill.amount || 0) > 0);

    const extraAttackBill =
      targetDebt && activeExtraPayment > 0
        ? [
            {
              id: "extra-debt-attack",
              user_id: userId,
              name: `Planned Extra Debt Payment ${targetDebt.name}`,
              amount: activeExtraPayment,
              due_date: Number(targetDebt.due_date || 1),
              frequency: "monthly",
              is_debt: true,
            },
          ]
        : [];

    const combinedBills = [...billsForTimeline, ...extraAttackBill];

    const builtTimeline = buildCashTimeline({
      incomes: incomeRows || [],
      bills: combinedBills,
      debts: debtsForTimeline,
      startDate: new Date(),
      days: activeLookahead,
    });

    const simulated = simulateCashFlow({
      timeline: builtTimeline,
      startingBalance: activeStartingBalance,
      buffer: activeBuffer,
    });

    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setBillPayments(activePayments);
    setDebtPaymentRows(activeDebtPayments);
    setDebts(debtRows || []);
    setTimeline(builtTimeline);
    setData(simulated);

    setLookaheadDays(activeLookahead);
    setBuffer(activeBuffer);
    setStartingBalance(activeStartingBalance);

    setStrategy(activeStrategy);
    setExtraPayment(activeExtraPayment);
    setTargetDebtName(targetDebt?.name || "—");

    setRequiredCash(calculateRequiredCash(builtTimeline));
    setBillsDue(calculateBillsDue(builtTimeline));
    setIncomeExpected(calculateIncomeExpected(builtTimeline));

    setLoading(false);
  }, [cycleMonth, getUserId]);

  useEffect(() => {
    load();
    loadFundingSources();
  }, [load, loadFundingSources]);

  function recalc(balance: number) {
    const simulated = simulateCashFlow({
      timeline,
      startingBalance: balance,
      buffer,
    });

    setData(simulated);
  }

  const saveSettings = useCallback(async () => {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    await supabase.from("cash_settings").upsert({
      user_id: userId,
      checking_buffer: Number(buffer),
      lookahead_days: Number(lookaheadDays),
      starting_balance: Number(startingBalance),
    });

    await load();
  }, [buffer, getUserId, lookaheadDays, load, startingBalance]);

  useEffect(() => {
    if (isStartingBalanceInitialRender.current) {
      isStartingBalanceInitialRender.current = false;
      return;
    }

    setSaveStatus("saving");
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      // If the input is currently focused, defer saving until blur
      if (isStartingBalanceFocusedRef.current) {
        pendingSaveRef.current = true;
        setSaveStatus("idle");
        return;
      }

      await saveSettings();
      setSaveStatus("saved");

      if (saveStatusTimerRef.current) {
        window.clearTimeout(saveStatusTimerRef.current);
      }
      saveStatusTimerRef.current = window.setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [startingBalance, saveSettings]);

  async function handleStartingBalanceBlur() {
    isStartingBalanceFocusedRef.current = false;

    if (!pendingSaveRef.current) return;

    pendingSaveRef.current = false;
    setSaveStatus("saving");
    await saveSettings();
    setSaveStatus("saved");

    if (saveStatusTimerRef.current) {
      window.clearTimeout(saveStatusTimerRef.current);
    }
    saveStatusTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  }

  async function addIncome() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!incomeName || !incomeAmount || !incomeNextDate) return;

    await supabase.from("income_events").insert({
      user_id: userId,
      name: incomeName,
      amount: Number(incomeAmount),
      frequency: incomeFrequency,
      next_date: incomeNextDate,
    });

    setIncomeName("");
    setIncomeAmount("");
    setIncomeFrequency("biweekly");
    setIncomeNextDate("");

    await load();
  }

  async function addBill() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!billName || !billAmount || !billDueDate) return;

    await supabase.from("bill_events").insert({
      user_id: userId,
      name: billName,
      amount: Number(billAmount),
      due_date: Number(billDueDate),
      frequency: billFrequency,
      assigned_paycheck: "unassigned",
      assigned_income_date: null,
      funding_source_id: null,
      is_debt: false,
    });

    setBillName("");
    setBillAmount("");
    setBillDueDate("");
    setBillFrequency("monthly");

    await load();
  }

  async function addBillPayment(bill: any, amount: number) {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!bill?.id) return;
    if (amount <= 0) return;

    await supabase.from("bill_payments").insert({
      user_id: userId,
      bill_id: bill.id,
      amount_paid: amount,
      payment_date: new Date().toISOString().slice(0, 10),
      cycle_month: cycleMonth,
    });

    setPartialPayments((prev) => ({
      ...prev,
      [bill.id]: "",
    }));

    await load();
  }

  async function markBillPaid(bill: any) {
    const remaining = Number(bill.remaining || 0);
    if (remaining <= 0) return;

    await addBillPayment(bill, remaining);
  }

  async function updateBillIncomeDate(
    billId: string,
    assignedIncomeDate: string
  ) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        assigned_income_date: assignedIncomeDate || null,
      })
      .eq("id", billId);

    await load();
  }

  async function updateDebtIncomeDate(
    debtId: string,
    assignedIncomeDate: string
  ) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        assigned_income_date: assignedIncomeDate || null,
      })
      .eq("id", debtId);

    await load();
  }

  async function updateBillFundingSource(
    billId: string,
    fundingSourceId: string
  ) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        funding_source_id: fundingSourceId || null,
      })
      .eq("id", billId);

    await load();
  }

  async function updateDebtFundingSource(
    debtId: string,
    fundingSourceId: string
  ) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        funding_source_id: fundingSourceId || null,
      })
      .eq("id", debtId);

    await load();
  }

  function startEditIncome(income: any) {
    setEditingIncomeId(income.id);
    setEditIncomeName(income.name || "");
    setEditIncomeAmount(String(income.amount || ""));
    setEditIncomeFrequency(income.frequency || "biweekly");
    setEditIncomeNextDate(income.next_date || "");
  }

  function cancelEditIncome() {
    setEditingIncomeId(null);
    setEditIncomeName("");
    setEditIncomeAmount("");
    setEditIncomeFrequency("biweekly");
    setEditIncomeNextDate("");
  }

  async function saveIncomeEdit(id: string) {
    const supabase = createClient();

    await supabase
      .from("income_events")
      .update({
        name: editIncomeName,
        amount: Number(editIncomeAmount || 0),
        frequency: editIncomeFrequency,
        next_date: editIncomeNextDate,
      })
      .eq("id", id);

    cancelEditIncome();
    await load();
  }

  function startEditBill(bill: any) {
    setEditingBillId(bill.id);
    setEditBillName(bill.name || "");
    setEditBillAmount(String(bill.amount || ""));
    setEditBillDueDate(String(bill.due_date || 1));
    setEditBillFrequency((bill.frequency || "monthly") as BillFrequency);
  }

  function cancelEditBill() {
    setEditingBillId(null);
    setEditBillName("");
    setEditBillAmount("");
    setEditBillDueDate("");
    setEditBillFrequency("monthly");
  }

  async function saveBillEdit(id: string) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        name: editBillName,
        amount: Number(editBillAmount || 0),
        due_date: Number(editBillDueDate || 1),
        frequency: editBillFrequency,
      })
      .eq("id", id);

    cancelEditBill();
    await load();
  }

  function startEditDebt(debt: any) {
    setEditingDebtId(debt.id);
    setEditDebtName(debt.name || "");
    setEditDebtBalance(String(debt.balance || ""));
    setEditDebtMinimumPayment(String(debt.minimum_payment || ""));
    setEditDebtInterestRate(String(debt.interest_rate || ""));
    setEditDebtDueDate(String(debt.due_date || 1));
    setEditDebtPaymentBehavior(debt.payment_behavior || "fixed");
    setEditDebtMinimumPaymentRate(
      String(debt.minimum_payment_rate ?? 2)
    );
    setEditDebtMinimumPaymentFloor(
      String(debt.minimum_payment_floor ?? 25)
    );
  }

  function cancelEditDebt() {
    setEditingDebtId(null);
    setEditDebtName("");
    setEditDebtBalance("");
    setEditDebtMinimumPayment("");
    setEditDebtInterestRate("");
    setEditDebtDueDate("");
    setEditDebtPaymentBehavior("fixed");
    setEditDebtMinimumPaymentRate("2");
    setEditDebtMinimumPaymentFloor("25");
  }

  async function saveDebtEdit(id: string) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        name: editDebtName,
        balance: Number(editDebtBalance || 0),
        minimum_payment: Number(editDebtMinimumPayment || 0),
        interest_rate: Number(editDebtInterestRate || 0),
        due_date: Number(editDebtDueDate || 1),
        payment_behavior: editDebtPaymentBehavior,
        minimum_payment_rate: Number(editDebtMinimumPaymentRate || 2),
        minimum_payment_floor: Number(editDebtMinimumPaymentFloor || 25),
      })
      .eq("id", id);

    cancelEditDebt();
    await load();
  }

  async function applyDebtPayment(debt: any, amount: number) {
    const supabase = createClient();

    if (!debt?.id) return;
    if (amount <= 0) return;

    const currentBalance = Number(debt.balance || 0);
    const newBalance = Math.max(currentBalance - amount, 0);
    const userId = await getUserId();

    if (!userId) return;

    const cycleDueDate = getDebtCycleDueDate(Number(debt.due_date || 1))
      .toISOString()
      .slice(0, 10);

    await supabase.from("debt_payments").insert({
      user_id: userId,
      debt_id: debt.id,
      amount,
      payment_date: new Date().toISOString().slice(0, 10),
      cycle_due_date: cycleDueDate,
    });

    await supabase
      .from("debts")
      .update({
        balance: newBalance,
      })
      .eq("id", debt.id);

    setDebtPayments((prev) => ({
      ...prev,
      [debt.id]: "",
    }));

    await load();
  }

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

  async function deleteDebt(id: string) {
    const supabase = createClient();
    await supabase.from("debts").delete().eq("id", id);
    await load();
  }

  async function archiveBill(id: string) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        is_archived: true,
      })
      .eq("id", id);

    await load();
  }

  async function unarchiveBill(id: string) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        is_archived: false,
      })
      .eq("id", id);

    await load();
  }

  async function archiveDebt(id: string) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        is_archived: true,
      })
      .eq("id", id);

    await load();
  }

  async function unarchiveDebt(id: string) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        is_archived: false,
      })
      .eq("id", id);

    await load();
  }

  async function deleteIncome(id: string) {
    const supabase = createClient();
    await supabase.from("income_events").delete().eq("id", id);
    await load();
  }

  async function deleteBill(id: string) {
    const supabase = createClient();
    await supabase.from("bill_events").delete().eq("id", id);
    await load();
  }

  async function saveAll() {
    await saveSettings();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="beast-card">
                  <div className="text-sm text-[#c7cfdb]">Active Sources</div>
                  <div className="mt-2 break-words text-2xl font-bold">
                    {activeFundingSources.length}
                  </div>
                </div>

                <div className="beast-card">
                  <div className="text-sm text-[#c7cfdb]">Liquid Cash</div>
                  <div className="mt-2 break-words text-2xl font-bold text-green-300">
                    ${liquidFundingTotal.toFixed(2)}
                  </div>
                </div>

                <div className="beast-card">
                  <div className="text-sm text-[#c7cfdb]">
                    Available Credit
                  </div>
                  <div className="mt-2 break-words text-2xl font-bold text-yellow-300">
                    ${creditAvailableTotal.toFixed(2)}
                  </div>
                </div>

                <div className="beast-card">
                  <div className="text-sm text-[#c7cfdb]">Credit Limit</div>
                  <div className="mt-2 break-words text-2xl font-bold">
                    ${creditLimitTotal.toFixed(2)}
                  </div>
                </div>

                <div className="beast-card">
                  <div className="text-sm text-[#c7cfdb]">
                    Credit Utilization
                  </div>
                  <div
                    className={`mt-2 break-words text-2xl font-bold ${
                      creditUtilizationPercent > 90
                        ? "text-red-300"
                        : creditUtilizationPercent > 70
                        ? "text-yellow-300"
                        : "text-green-300"
                    }`}
                  >
                    {creditUtilizationPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  type="number"
                  value={newFundingSource.available_credit}
                  onChange={(e) =>
                    setNewFundingSource({
                      ...newFundingSource,
                      available_credit: e.target.value,
                    })
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
                type="number"
                value={editingFundingSource.available_credit}
                onChange={(e) =>
                  setEditingFundingSource({
                    ...editingFundingSource,
                    available_credit: e.target.value,
                  })
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
              <div className="flex justify-center gap-2">
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

        <section className="beast-panel overflow-hidden">
          <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-xl font-bold">Bills</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Compact operating view. Edit a bill to change amount, due day,
                or frequency.
              </p>
            </div>

            <button
              onClick={() => setShowBills(!showBills)}
              className="beast-button-secondary"
            >
              {showBills ? "Hide" : `Show (${activeBills.length})`}
            </button>
          </div>

          {showBills && (
            <div className="beast-table-wrap">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Bill</th>
                    <th className="text-right">Remaining</th>
                    <th className="text-center">Next Due</th>
                    <th className="text-center">Income Pot</th>
                    <th className="text-center">Funding Source</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {activeBills.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No bills added yet.</td>
                    </tr>
                  ) : (
                    activeBills.map((bill) => (
                      <tr key={bill.id}>
                        <td className="min-w-[220px] text-left align-top">
                          {editingBillId === bill.id ? (
                            <div className="grid gap-2">
                              <input
                                value={editBillName}
                                onChange={(e) =>
                                  setEditBillName(e.target.value)
                                }
                                placeholder="Bill name"
                                className="beast-input"
                              />

                              <div className="grid gap-2 sm:grid-cols-3">
                                <input
                                  type="number"
                                  value={editBillAmount}
                                  onChange={(e) =>
                                    setEditBillAmount(e.target.value)
                                  }
                                  placeholder="Amount"
                                  className="beast-input"
                                />

                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={editBillDueDate}
                                  onChange={(e) =>
                                    setEditBillDueDate(e.target.value)
                                  }
                                  placeholder="Due day"
                                  className="beast-input"
                                />

                                <select
                                  value={editBillFrequency}
                                  onChange={(e) =>
                                    setEditBillFrequency(
                                      e.target.value as BillFrequency
                                    )
                                  }
                                  className="beast-input"
                                >
                                  {billFrequencyOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold">{bill.name}</div>
                              <div className="mt-1 text-xs text-[#7f8da3]">
                                Due: ${Number(bill.amount || 0).toFixed(2)} |
                                Paid: ${Number(bill.paid || 0).toFixed(2)} |{" "}
                                {getFrequencyLabel(bill.frequency)}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="text-right align-top font-semibold">
                          ${Number(bill.remaining || 0).toFixed(2)}
                        </td>

                        <td className="text-center align-top">
                          {bill.nextDueDateDisplay}
                        </td>

                        <td className="min-w-[300px] text-center align-top">
                          <select
                            value={bill.assigned_income_date || ""}
                            onChange={(e) =>
                              updateBillIncomeDate(bill.id, e.target.value)
                            }
                            className="beast-input"
                          >
                            <option value="">Unassigned</option>
                            {incomeBucketPlans.map((bucket) => (
                              <option key={bucket.id} value={bucket.date}>
                                {bucket.dropdownLabel}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="min-w-[240px] text-center align-top">
                          <select
                            value={bill.funding_source_id || ""}
                            onChange={(e) =>
                              updateBillFundingSource(bill.id, e.target.value)
                            }
                            className="beast-input"
                          >
                            <option value="">Unassigned</option>
                            {activeFundingSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="text-center align-top">
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

                        <td className="min-w-[240px] align-top">
                          {editingBillId === bill.id ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                onClick={() => saveBillEdit(bill.id)}
                                className="beast-button"
                              >
                                Save
                              </button>

                              <button
                                onClick={cancelEditBill}
                                className="beast-button-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <input
                                  type="number"
                                  value={partialPayments[bill.id] || ""}
                                  onChange={(e) =>
                                    setPartialPayments((prev) => ({
                                      ...prev,
                                      [bill.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Partial"
                                  className="beast-input h-9 px-2 text-sm"
                                />

                                <button
                                  onClick={() =>
                                    addBillPayment(
                                      bill,
                                      Number(partialPayments[bill.id] || 0)
                                    )
                                  }
                                  className="beast-button-secondary"
                                >
                                  Add
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={() => markBillPaid(bill)}
                                  className="beast-button"
                                >
                                  Paid
                                </button>

                                <button
                                  onClick={() => startEditBill(bill)}
                                  className="beast-button-secondary"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => archiveBill(bill.id)}
                                  className="beast-button-secondary"
                                >
                                  Archive
                                </button>
                              </div>
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
              <h2 className="text-xl font-bold">Debts</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Assign each debt minimum payment to the income pot that should
                cover it. Edit debts when APRs, balances, due days, or minimums
                change.
              </p>
              <p className="mt-2 text-xs text-[#5a6577]">
                Debts are balances you owe and plan to pay down. A debt may be linked to a funding source for tracking credit limits, available credit, or payment routing.
              </p>
            </div>

            <button
              onClick={() => setShowDebts(!showDebts)}
              className="beast-button-secondary"
            >
              {showDebts ? "Hide" : `Show (${activeDebts.length})`}
            </button>
          </div>

          {showDebts && (
            <div className="beast-table-wrap">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Debt</th>
                    <th className="text-right">Minimum</th>
                    <th className="text-center">Next Due</th>
                    <th className="text-center">Income Pot</th>
                    <th className="text-center">Funding Source</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {activeDebts.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No debts added yet.</td>
                    </tr>
                  ) : (
                    activeDebts.map((debt) => (
                      <tr key={debt.id}>
                        <td className="min-w-[260px] text-left align-top">
                          {editingDebtId === debt.id ? (
                            <div className="grid gap-2">
                              <input
                                value={editDebtName}
                                onChange={(e) =>
                                  setEditDebtName(e.target.value)
                                }
                                placeholder="Debt name"
                                className="beast-input"
                              />

                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  type="number"
                                  value={editDebtBalance}
                                  onChange={(e) =>
                                    setEditDebtBalance(e.target.value)
                                  }
                                  placeholder="Balance"
                                  className="beast-input"
                                />

                                <input
                                  type="number"
                                  value={editDebtMinimumPayment}
                                  onChange={(e) =>
                                    setEditDebtMinimumPayment(e.target.value)
                                  }
                                  placeholder="Minimum"
                                  className="beast-input"
                                />

                                <select
                                  value={editDebtPaymentBehavior}
                                  onChange={(e) =>
                                    setEditDebtPaymentBehavior(
                                      e.target.value as "fixed" | "revolving"
                                    )
                                  }
                                  className="beast-input"
                                >
                                  <option value="fixed">Fixed Minimum</option>
                                  <option value="revolving">
                                    Revolving / Credit Minimum
                                  </option>
                                </select>

                                <input
                                  type="number"
                                  value={editDebtInterestRate}
                                  onChange={(e) =>
                                    setEditDebtInterestRate(e.target.value)
                                  }
                                  placeholder="APR"
                                  className="beast-input"
                                />

                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={editDebtDueDate}
                                  onChange={(e) =>
                                    setEditDebtDueDate(e.target.value)
                                  }
                                  placeholder="Due day"
                                  className="beast-input"
                                />
                              </div>

                              {editDebtPaymentBehavior === "revolving" ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input
                                    type="number"
                                    value={editDebtMinimumPaymentRate}
                                    onChange={(e) =>
                                      setEditDebtMinimumPaymentRate(
                                        e.target.value
                                      )
                                    }
                                    placeholder="Min %"
                                    className="beast-input"
                                  />

                                  <input
                                    type="number"
                                    value={editDebtMinimumPaymentFloor}
                                    onChange={(e) =>
                                      setEditDebtMinimumPaymentFloor(
                                        e.target.value
                                      )
                                    }
                                    placeholder="Floor"
                                    className="beast-input"
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold">{debt.name}</div>
                              <div className="mt-1 text-xs text-[#7f8da3]">
                                Balance: ${Number(debt.balance || 0).toFixed(2)}{" "}
                                | APR:{" "}
                                {Number(debt.interest_rate || 0).toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="text-right align-top font-semibold">
                          ${Number(debt.minimum_payment || 0).toFixed(2)}
                        </td>

                        <td className="text-center align-top">
                          {debt.nextDueDateDisplay}
                        </td>

                        <td className="min-w-[300px] text-center align-top">
                          <select
                            value={debt.assigned_income_date || ""}
                            onChange={(e) =>
                              updateDebtIncomeDate(debt.id, e.target.value)
                            }
                            className="beast-input"
                          >
                            <option value="">Unassigned</option>
                            {incomeBucketPlans.map((bucket) => (
                              <option key={bucket.id} value={bucket.date}>
                                {bucket.dropdownLabel}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="min-w-[240px] text-center align-top">
                          <select
                            value={debt.funding_source_id || ""}
                            onChange={(e) =>
                              updateDebtFundingSource(debt.id, e.target.value)
                            }
                            className="beast-input"
                          >
                            <option value="">Unassigned</option>
                            {activeFundingSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="min-w-[220px] align-top">
                          {editingDebtId === debt.id ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                onClick={() => saveDebtEdit(debt.id)}
                                className="beast-button"
                              >
                                Save
                              </button>

                              <button
                                onClick={cancelEditDebt}
                                className="beast-button-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                <input
                                  type="number"
                                  value={debtPayments[debt.id] || ""}
                                  onChange={(e) =>
                                    setDebtPayments((prev) => ({
                                      ...prev,
                                      [debt.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Payment"
                                  className="beast-input h-9 px-2 text-sm"
                                />

                                <button
                                  onClick={() =>
                                    applyDebtPayment(
                                      debt,
                                      Number(debtPayments[debt.id] || 0)
                                    )
                                  }
                                  className="beast-button-secondary"
                                >
                                  Apply
                                </button>

                                <button
                                  onClick={() =>
                                    applyDebtPayment(
                                      debt,
                                      Number(debt.minimum_payment || 0)
                                    )
                                  }
                                  className="beast-button"
                                >
                                  Min Paid
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={() => startEditDebt(debt)}
                                  className="beast-button-secondary"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => archiveDebt(debt.id)}
                                  className="beast-button-secondary"
                                >
                                  Archive
                                </button>

                                <button
                                  onClick={() => deleteDebt(debt.id)}
                                  className="beast-button"
                                >
                                  Delete
                                </button>
                              </div>
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
