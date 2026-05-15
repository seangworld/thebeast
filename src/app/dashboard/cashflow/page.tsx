"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

function buildIncomeBuckets(incomes: any[], days: number) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = addDays(start, Math.max(days, 60));
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

  const [requiredCash, setRequiredCash] = useState(0);
  const [billsDue, setBillsDue] = useState(0);
  const [incomeExpected, setIncomeExpected] = useState(0);

  const [lookaheadDays, setLookaheadDays] = useState(30);
  const [buffer, setBuffer] = useState(500);
  const [startingBalance, setStartingBalance] = useState(500);

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

  const [editIncomeName, setEditIncomeName] = useState("");
  const [editIncomeAmount, setEditIncomeAmount] = useState("");
  const [editIncomeFrequency, setEditIncomeFrequency] = useState("biweekly");
  const [editIncomeNextDate, setEditIncomeNextDate] = useState("");

  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDate, setEditBillDueDate] = useState("");
  const [editBillFrequency, setEditBillFrequency] =
    useState<BillFrequency>("monthly");

  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editDebtName, setEditDebtName] = useState("");
  const [editDebtBalance, setEditDebtBalance] = useState("");
  const [editDebtMinimumPayment, setEditDebtMinimumPayment] = useState("");
  const [editDebtInterestRate, setEditDebtInterestRate] = useState("");
  const [editDebtDueDate, setEditDebtDueDate] = useState("");

  const [partialPayments, setPartialPayments] = useState<Record<string, string>>(
    {}
  );
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showBills, setShowBills] = useState(true);
  const [showDebts, setShowDebts] = useState(true);
  const [showIncomeEvents, setShowIncomeEvents] = useState(true);
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

  const billsWithPaymentStatus = useMemo(() => {
    return bills.map((bill) => {
      const amount = Number(bill.amount || 0);
      const paid = Number(paymentsByBillId[bill.id] || 0);
      const remaining = Math.max(amount - paid, 0);
      const dueDay = Number(bill.due_date || 1);
      const frequency = bill.frequency || "monthly";
      const assignedPaycheck = bill.assigned_paycheck || "unassigned";
      const nextDueDate = getNextDueDate(dueDay, frequency);

      return {
        ...bill,
        amount,
        paid,
        remaining,
        dueDay,
        frequency,
        assigned_paycheck: assignedPaycheck,
        assigned_income_date: bill.assigned_income_date || "",
        nextDueDate,
        nextDueDateDisplay: formatShortDate(nextDueDate),
        status: getBillStatus({ amount, paid, nextDueDate }),
        is_archived: Boolean(bill.is_archived),
      };
    });
  }, [bills, paymentsByBillId]);

  const activeBills = useMemo(() => {
    return billsWithPaymentStatus.filter((bill) => !bill.is_archived);
  }, [billsWithPaymentStatus]);

  const archivedBills = useMemo(() => {
    return billsWithPaymentStatus.filter((bill) => bill.is_archived);
  }, [billsWithPaymentStatus]);

  const incomeBuckets = useMemo(() => {
    return buildIncomeBuckets(incomes, Math.max(Number(lookaheadDays || 60), 60));
  }, [incomes, lookaheadDays]);

  function getIncomeBucketLabel(value: string) {
    if (!value) return "Unassigned";

    const bucket = incomeBuckets.find((item) => item.date === value);
    return bucket?.label || value;
  }

  const nextPayDate = nextPaycheckDate ? new Date(nextPaycheckDate) : null;

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
      const nextDueDate = getNextDueDate(dueDay, "monthly");

      return {
        ...debt,
        minimum_payment: minimumPayment,
        assigned_paycheck: assignedPaycheck,
        assigned_income_date: debt.assigned_income_date || "",
        dueDay,
        nextDueDate,
        nextDueDateDisplay: formatShortDate(nextDueDate),
        is_archived: Boolean(debt.is_archived),
      };
    });
  }, [debts]);

  const activeDebts = useMemo(() => {
    return debtsWithAssignmentStatus.filter((debt) => !debt.is_archived);
  }, [debtsWithAssignmentStatus]);

  const archivedDebts = useMemo(() => {
    return debtsWithAssignmentStatus.filter((debt) => debt.is_archived);
  }, [debtsWithAssignmentStatus]);

  const upcomingDebtMinimums = useMemo(() => {
    if (!nextPayDate) return 0;

    return activeDebts
      .filter((debt) => debt.nextDueDate <= nextPayDate)
      .reduce((sum, debt) => sum + Number(debt.minimum_payment || 0), 0);
  }, [activeDebts, nextPayDate]);

  const requiredBeforePaycheck = upcomingBillsTotal + upcomingDebtMinimums;

  const projectedAfterObligations =
    Number(startingBalance || 0) +
    Number(nextPaycheckAmount || 0) -
    requiredBeforePaycheck;

  const safeToSpend = projectedAfterObligations - Number(buffer || 0);

  const unassignedBills = useMemo(() => {
    return activeBills.filter((bill) => !bill.assigned_income_date);
  }, [activeBills]);

  const unassignedDebts = useMemo(() => {
    return activeDebts.filter((debt) => !debt.assigned_income_date);
  }, [activeDebts]);

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
      const dropdownLabel = `${bucket.label} ($${availableToAssign.toFixed(2)} left)`;

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

  const activeDebtCount = activeDebts.length;

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

    const zeroBalanceDebt = activeDebts.find(
      (debt) => Number(debt.balance || 0) <= 0
    );

    if (zeroBalanceDebt) {
      steps.push(`${zeroBalanceDebt.name} has a $0 balance. Consider archiving it if it is inactive.`);
    }

    const paidBill = activeBills.find(
      (bill) => Number(bill.remaining || 0) <= 0
    );

    if (paidBill) {
      steps.push(`${paidBill.name} is paid for this cycle. Archive only if it is no longer active.`);
    }

    if (steps.length === 0) {
      steps.push("No urgent cleanup found. Continue assigning obligations to the correct income pots.");
    }

    return steps.slice(0, 4);
  }, [
    activeBills,
    activeDebts,
    incomeBucketPlans,
    unassignedBills,
    unassignedDebts,
    unassignedObligationsTotal,
  ]);

  async function getUserId() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }

  async function load() {
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

    const activeStrategy = (debtSettings?.strategy || "snowball") as PayoffStrategy;
    const activeExtraPayment = Number(debtSettings?.extra_payment || 0);

    const activeDebtRows = (debtRows || []).filter(
      (debt) => !Boolean(debt.is_archived)
    );
    const targetDebt = getTargetDebt(activeDebtRows, activeStrategy);

    const activePayments = paymentRows || [];

    const paymentTotals: Record<string, number> = {};
    for (const payment of activePayments) {
      paymentTotals[payment.bill_id] =
        Number(paymentTotals[payment.bill_id] || 0) + Number(payment.amount_paid || 0);
    }

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
      debts: activeDebtRows,
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
  }

  useEffect(() => {
    load();
  }, []);

  function recalc(balance: number) {
    const simulated = simulateCashFlow({
      timeline,
      startingBalance: balance,
      buffer,
    });

    setData(simulated);
  }

  async function saveSettings() {
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
  }

  function cancelEditDebt() {
    setEditingDebtId(null);
    setEditDebtName("");
    setEditDebtBalance("");
    setEditDebtMinimumPayment("");
    setEditDebtInterestRate("");
    setEditDebtDueDate("");
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
      })
      .eq("id", id);

    cancelEditDebt();
    await load();
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
                Manage paychecks, bills, debt minimums, extra attack payments,
                required cash, and buffer risk.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[260px]">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={saveAll} className="beast-button">
                  Save All
                </button>

                <button onClick={logout} className="beast-button-secondary">
                  Logout
                </button>
              </div>

              <Link href="/dashboard" className="beast-button-secondary text-center">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">
              Current Checking Balance
            </div>
            <input
              type="number"
              value={startingBalance}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartingBalance(val);
                recalc(val);
              }}
              className="beast-input mt-3"
            />
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
          <div>
            <h2 className="text-xl font-bold">Recommended Next Step Today</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Rules-based guidance from current assignments, cash pots, and active obligations.
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

        <section className="beast-card space-y-5">
          <div>
            <h2 className="text-xl font-bold">Income Date Planning</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Assign bills and debt minimums to the real income date that should cover them.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Upcoming Income Buckets</div>
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
              <div className="text-sm text-[#c7cfdb]">Unassigned Obligations</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  unassignedObligationsTotal > 0 ? "text-yellow-300" : "text-green-300"
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
                {Math.max(Number(lookaheadDays || 60), 60)} Days
              </div>
              <p className="mt-2 text-sm text-[#7f8da3]">
                Income buckets are generated from today forward.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {incomeBucketPlans.length === 0 ? (
              <div className="beast-panel p-4 text-sm text-[#c7cfdb]">
                No upcoming income buckets found. Add income events or update next pay dates.
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
                          ? `$${Math.abs(bucket.safeAfterBuffer).toFixed(2)} short after buffer`
                          : `$${bucket.safeAfterBuffer.toFixed(2)} safe after buffer`}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 text-sm text-[#c7cfdb]">
                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <div className="text-[#7f8da3]">Assigned</div>
                        <div className="font-bold">${bucket.assignedTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[#7f8da3]">Available</div>
                        <div className="font-bold">${bucket.availableToAssign.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[#7f8da3]">Debt Minimums</div>
                        <div className="font-bold">${bucket.debtMinimumsTotal.toFixed(2)}</div>
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
                            <span>${Number(bill.remaining || 0).toFixed(2)}</span>
                          </li>
                        ))}

                        {bucket.assignedDebts.map((debt: any) => (
                          <li
                            key={`debt-${bucket.id}-${debt.id}`}
                            className="flex justify-between gap-4"
                          >
                            <span>{debt.name} minimum</span>
                            <span>${Number(debt.minimum_payment || 0).toFixed(2)}</span>
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

        <section className="beast-card">
          <h2 className="text-xl font-bold">Cash Settings</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm text-[#c7cfdb]">
                Current Checking Balance
              </label>
              <input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Minimum Checking Buffer
              </label>
              <input
                type="number"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">Lookahead Days</label>
              <input
                type="number"
                value={lookaheadDays}
                onChange={(e) => setLookaheadDays(Number(e.target.value))}
                className="beast-input mt-2"
              />
            </div>

            <div className="flex items-end">
              <button onClick={saveSettings} className="beast-button w-full">
                Save Settings
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
        <div className="beast-card">
  <div className="flex items-center justify-between gap-4">
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
  <div className="flex items-center justify-between gap-4">
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
        onChange={(e) => setBillFrequency(e.target.value as BillFrequency)}
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
  <div className="flex items-center justify-between gap-4 border-b border-[#2a3242] p-5">
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
      <table className="w-full min-w-[900px] text-sm">
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
  <div className="flex items-center justify-between gap-4 border-b border-[#2a3242] p-5">
    <div>
      <h2 className="text-xl font-bold">Bills</h2>
      <p className="mt-1 text-sm text-[#7f8da3]">
        Compact operating view. Edit a bill to change amount, due day, or frequency.
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
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr>
            <th className="text-left">Bill</th>
            <th className="text-right">Remaining</th>
            <th className="text-center">Next Due</th>
            <th className="text-center">Income Pot</th>
            <th className="text-center">Status</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {activeBills.length === 0 ? (
            <tr>
              <td colSpan={6}>No bills added yet.</td>
            </tr>
          ) : (
            activeBills.map((bill) => (
              <tr key={bill.id}>
                <td className="min-w-[220px] text-left align-top">
                  {editingBillId === bill.id ? (
                    <div className="grid gap-2">
                      <input
                        value={editBillName}
                        onChange={(e) => setEditBillName(e.target.value)}
                        placeholder="Bill name"
                        className="beast-input"
                      />

                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="number"
                          value={editBillAmount}
                          onChange={(e) => setEditBillAmount(e.target.value)}
                          placeholder="Amount"
                          className="beast-input"
                        />

                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={editBillDueDate}
                          onChange={(e) => setEditBillDueDate(e.target.value)}
                          placeholder="Due day"
                          className="beast-input"
                        />

                        <select
                          value={editBillFrequency}
                          onChange={(e) =>
                            setEditBillFrequency(e.target.value as BillFrequency)
                          }
                          className="beast-input"
                        >
                          {billFrequencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
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
                        Due: ${Number(bill.amount || 0).toFixed(2)} | Paid: $
                        {Number(bill.paid || 0).toFixed(2)} |{" "}
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
                          className="beast-input"
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
  <div className="flex items-center justify-between gap-4 border-b border-[#2a3242] p-5">
    <div>
      <h2 className="text-xl font-bold">Debts</h2>
      <p className="mt-1 text-sm text-[#7f8da3]">
        Assign each debt minimum payment to the income pot that should cover it. Edit debts when APRs, balances, due days, or minimums change.
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
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr>
            <th className="text-left">Debt</th>
            <th className="text-right">Minimum</th>
            <th className="text-center">Next Due</th>
            <th className="text-center">Income Pot</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {activeDebts.length === 0 ? (
            <tr>
              <td colSpan={5}>No debts added yet.</td>
            </tr>
          ) : (
            activeDebts.map((debt) => (
              <tr key={debt.id}>
                <td className="min-w-[260px] text-left align-top">
                  {editingDebtId === debt.id ? (
                    <div className="grid gap-2">
                      <input
                        value={editDebtName}
                        onChange={(e) => setEditDebtName(e.target.value)}
                        placeholder="Debt name"
                        className="beast-input"
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="number"
                          value={editDebtBalance}
                          onChange={(e) => setEditDebtBalance(e.target.value)}
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
                          onChange={(e) => setEditDebtDueDate(e.target.value)}
                          placeholder="Due day"
                          className="beast-input"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold">{debt.name}</div>
                      <div className="mt-1 text-xs text-[#7f8da3]">
                        Balance: ${Number(debt.balance || 0).toFixed(2)} | APR:{" "}
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
  <div className="flex items-center justify-between gap-4 border-b border-[#2a3242] p-5">
    <div>
      <h2 className="text-xl font-bold">Income Events</h2>
      <p className="mt-1 text-sm text-[#7f8da3]">
        Manage income sources that generate future cash pots.
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
      <table className="w-full min-w-[850px] text-sm">
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
                      onChange={(e) => setEditIncomeName(e.target.value)}
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
                      onChange={(e) => setEditIncomeAmount(e.target.value)}
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
                      onChange={(e) => setEditIncomeFrequency(e.target.value)}
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
                      onChange={(e) => setEditIncomeNextDate(e.target.value)}
                      className="beast-input"
                    />
                  ) : (
                    income.next_date
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
          <div className="flex items-center justify-between gap-4 border-b border-[#2a3242] p-5">
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Frequency</th>
                    <th className="text-center">Income Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {archivedBills.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No archived bills.</td>
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
          <div className="flex items-center justify-between gap-4 border-b border-[#2a3242] p-5">
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Debt</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">Minimum</th>
                    <th className="text-center">Income Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {archivedDebts.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No archived debts.</td>
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