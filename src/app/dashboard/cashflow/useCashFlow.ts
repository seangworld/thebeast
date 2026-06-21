"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildCashTimeline,
  simulateCashFlow,
  calculateRequiredCash,
  calculateBillsDue,
  calculateIncomeExpected,
} from "@/lib/cashflow";
import { createClient } from "@/lib/supabase/client";
import {
  addDays,
  addMonthsClamped,
  getCycleMonth,
  getCurrentBillCycleDueDate,
  getCurrentDebtCycleDueDate,
  getFrequencyMonthStep,
  getTargetDebt,
  toDateInputValue,
  PayoffStrategy,
  FundingSource,
} from "./cashflowUtils";

export function useCashFlow() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [billPayments, setBillPayments] = useState<any[]>([]);
  const [debtPaymentRows, setDebtPaymentRows] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);

  const [editingFundingSourceId, setEditingFundingSourceId] = useState<
    string | null
  >(null);

  const [editingFundingSource, setEditingFundingSource] = useState({
    name: "",
    type: "checking",
    current_balance: "",
    credit_limit: "",
    available_credit: "",
    linked_debt_id: "",
    interest_rate: "",
  });

  const [newFundingSource, setNewFundingSource] = useState({
    name: "",
    type: "checking",
    current_balance: "",
    credit_limit: "",
    available_credit: "",
    linked_debt_id: "",
    interest_rate: "",
  });

  const [requiredCash, setRequiredCash] = useState(0);
  const [billsDue, setBillsDue] = useState(0);
  const [incomeExpected, setIncomeExpected] = useState(0);

  const [lookaheadDays, setLookaheadDays] = useState(30);
  const [assignmentHorizonMonths, setAssignmentHorizonMonths] = useState(6);
  const [buffer, setBuffer] = useState(500);
  const [startingBalance, setStartingBalance] = useState(500);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const autosaveTimerRef = useRef<number | null>(null);
  const saveStatusTimerRef = useRef<number | null>(null);
  const isStartingBalanceInitialRender = useRef(true);
  const pendingSaveRef = useRef(false);
  const isStartingBalanceFocusedRef = useRef(false);
  const focusReloadInFlightRef = useRef(false);
  const lastFocusReloadAtRef = useRef(0);
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
  const [billFrequency, setBillFrequency] = useState<
    "weekly" | "biweekly" | "monthly" | "every_2_months" | "every_3_months" | "every_6_months" | "yearly"
  >("monthly");

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
  const [editBillFrequency, setEditBillFrequency] = useState<
    "weekly" | "biweekly" | "monthly" | "every_2_months" | "every_3_months" | "every_6_months" | "yearly"
  >("monthly");

  const [editDebtName, setEditDebtName] = useState("");
  const [editDebtBalance, setEditDebtBalance] = useState("");
  const [editDebtMinimumPayment, setEditDebtMinimumPayment] = useState("");
  const [editDebtInterestRate, setEditDebtInterestRate] = useState("");
  const [editDebtDueDate, setEditDebtDueDate] = useState("");
  const [editDebtPaymentBehavior, setEditDebtPaymentBehavior] = useState<
    "fixed" | "revolving"
  >("fixed");
  const [editDebtMinimumPaymentRate, setEditDebtMinimumPaymentRate] = useState(
    "2"
  );
  const [editDebtMinimumPaymentFloor, setEditDebtMinimumPaymentFloor] =
    useState("25");

  const [debtPayments, setDebtPayments] = useState<Record<string, string>>({});
  const [partialPayments, setPartialPayments] = useState<Record<string, string>>(
    {}
  );

  const [debtPaymentStatus, setDebtPaymentStatus] = useState<
    Record<string, { type: "error" | "success" | null; message: string }>
  >({});
  const [applyingDebtPaymentId, setApplyingDebtPaymentId] = useState<
    string | null
  >(null);

  const [isApplyingSuggestedAttack, setIsApplyingSuggestedAttack] =
    useState(false);
  const [suggestedAttackMessage, setSuggestedAttackMessage] = useState<
    string | null
  >(null);

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

    // Pre-calculate available_credit from credit_limit - current_balance
    const creditLimit = newFundingSource.credit_limit === ""
      ? null
      : Number(newFundingSource.credit_limit);
    const currentBalance = Number(newFundingSource.current_balance || 0);
    const calculatedAvailableCredit = creditLimit != null && creditLimit > 0
      ? Math.max(creditLimit - currentBalance, 0)
      : null;

    const { error } = await supabase.from("funding_sources").insert({
      user_id: userId,
      name: newFundingSource.name,
      type: newFundingSource.type,
      current_balance: currentBalance,
      credit_limit: creditLimit,
      available_credit: calculatedAvailableCredit,
      interest_rate:
        newFundingSource.interest_rate === ""
          ? 0
          : Number(newFundingSource.interest_rate),
      is_active: true,
    });

    if (error) {
      setSaveError(`Failed to add funding source: ${error.message}`);
      console.error("Failed to add funding source:", error);
      return;
    }

    setSaveError(null);
    setNewFundingSource({
      name: "",
      type: "checking",
      current_balance: "",
      credit_limit: "",
      available_credit: "",
      linked_debt_id: "",
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
      linked_debt_id: source.linked_debt_id || "",
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
      linked_debt_id: "",
      interest_rate: "",
    });
  }

  async function updateFundingSource(id: string) {
    const supabase = createClient();

    const linkedDebtId =
      editingFundingSource.linked_debt_id === ""
        ? null
        : editingFundingSource.linked_debt_id;

    const creditLimit = editingFundingSource.credit_limit === ""
      ? null
      : Number(editingFundingSource.credit_limit);
    let currentBalance = Number(editingFundingSource.current_balance || 0);

    if (linkedDebtId) {
      const { data: linkedDebt } = await supabase
        .from("debts")
        .select("balance")
        .eq("id", linkedDebtId)
        .maybeSingle();

      currentBalance = Number(linkedDebt?.balance || 0);
    }

    const calculatedAvailableCredit = creditLimit != null && creditLimit > 0
      ? Math.max(creditLimit - currentBalance, 0)
      : null;

    const updatePayload: Record<string, any> = {
      name: editingFundingSource.name,
      type: editingFundingSource.type,
      credit_limit: creditLimit,
      available_credit: calculatedAvailableCredit,
      interest_rate:
        editingFundingSource.interest_rate === ""
          ? 0
          : Number(editingFundingSource.interest_rate),
      linked_debt_id: linkedDebtId,
    };

    if (!linkedDebtId) {
      updatePayload.current_balance = currentBalance;
    }

    // DIAGNOSTIC: Log the exact payload being sent
    console.log("=== FUNDING SOURCE SAVE DIAGNOSTICS ===");
    console.log("Funding Source ID:", id);
    console.log("Payload being sent to Supabase:", updatePayload);

    // Update funding source with recalculated available_credit
    const { data: updateData, error: updateError } = await supabase
      .from("funding_sources")
      .update(updatePayload)
      .eq("id", id);

    // DIAGNOSTIC: Log the Supabase response
    console.log("Supabase response data:", updateData);
    console.log("Supabase response error:", updateError);

    if (updateError) {
      setSaveError(`Failed to save funding source: ${updateError.message}`);
      console.error("Failed to save funding source:", updateError);
      console.log("=== END DIAGNOSTICS (ERROR CASE) ===");
      return;
    }

    console.log("=== END DIAGNOSTICS (SUCCESS) ===");
    setSaveError(null);

    cancelEditFundingSource();
    await loadFundingSources();
  }

  async function deleteFundingSource(id: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("funding_sources")
      .update({
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      setSaveError(`Failed to delete funding source: ${error.message}`);
      console.error("Failed to delete funding source:", error);
      return;
    }

    setSaveError(null);
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
    const activeAssignmentHorizon = Number(cashSettings?.assignment_horizon_months ?? 6);
    const activeBuffer = Number(cashSettings?.checking_buffer ?? 500);
    const activeStartingBalance = Number(cashSettings?.starting_balance ?? 500);

    const activeStrategy = (debtSettings?.strategy || "snowball") as PayoffStrategy;
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

    setLookaheadDays(activeLookahead);
    setAssignmentHorizonMonths(activeAssignmentHorizon);

    const debtPaymentTotals: Record<string, number> = {};
    for (const payment of activeDebtPayments) {
      const key = `${payment.debt_id}||${payment.cycle_due_date}`;
      debtPaymentTotals[key] =
        Number(debtPaymentTotals[key] || 0) + Number(payment.amount || 0);
    }

    const debtsForTimeline = (activeDebtRows || []).map((debt) => {
      const minimumPayment = Number(debt.minimum_payment || 0);
      const currentCycleDueDate = getCurrentDebtCycleDueDate(debt);
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
        const frequency = bill.frequency || "monthly";
        const currentCycleDueDate = getCurrentBillCycleDueDate(
          bill,
          cycleMonth
        );
        let nextDueDateOverride = currentCycleDueDate;

        if (remaining <= 0 && !bill.next_due_date_after_payment) {
          nextDueDateOverride =
            frequency === "weekly"
              ? addDays(currentCycleDueDate, 7)
              : frequency === "biweekly"
              ? addDays(currentCycleDueDate, 14)
              : addMonthsClamped(
                  currentCycleDueDate,
                  getFrequencyMonthStep(frequency)
                );
        }

        return {
          ...bill,
          amount: remaining > 0 ? remaining : amount,
          frequency,
          nextDueDateOverride,
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

  const reloadCashFlowOnFocus = useCallback(async () => {
    if (focusReloadInFlightRef.current) return;
    if (document.visibilityState === "hidden") return;

    const now = Date.now();
    if (now - lastFocusReloadAtRef.current < 1000) return;

    focusReloadInFlightRef.current = true;
    lastFocusReloadAtRef.current = now;

    try {
      await load();
    } finally {
      focusReloadInFlightRef.current = false;
    }
  }, [load]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void reloadCashFlowOnFocus();
      }
    }

    function handleFocus() {
      void reloadCashFlowOnFocus();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [reloadCashFlowOnFocus]);

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

    const { data, error } = await supabase.from("cash_settings").upsert(
      {
        user_id: userId,
        checking_buffer: Number(buffer),
        lookahead_days: Number(lookaheadDays),
        assignment_horizon_months: Number(assignmentHorizonMonths),
        starting_balance: Number(startingBalance),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Failed to save cash settings:", error);
      throw error;
    }

    await load();
    return data;
  }, [buffer, getUserId, lookaheadDays, assignmentHorizonMonths, load, startingBalance]);

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
      if (isStartingBalanceFocusedRef.current) {
        pendingSaveRef.current = true;
        setSaveStatus("idle");
        return;
      }

      try {
        await saveSettings();
        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveStatus("error");
      }

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
  }, [startingBalance, buffer, lookaheadDays, assignmentHorizonMonths, saveSettings]);

  async function handleStartingBalanceBlur() {
    isStartingBalanceFocusedRef.current = false;

    if (!pendingSaveRef.current) return;

    pendingSaveRef.current = false;
    setSaveStatus("saving");
    try {
      await saveSettings();
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to save starting balance on blur:", err);
      setSaveStatus("error");
    }

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
      funding_source_id: bill.funding_source_id || null,
    });

    const currentCycleDueDate = getCurrentBillCycleDueDate(bill, cycleMonth);
    const frequency = bill.frequency || "monthly";
    const currentCycleRemaining = Math.max(
      Number(bill.remaining ?? 0),
      Math.max(Number(bill.amount || 0) - Number(bill.paid || 0), 0)
    );
    const remainingAfterPayment = Math.max(currentCycleRemaining - amount, 0);
    const shouldAdvanceNextDue = remainingAfterPayment <= 0;
    let nextDueDateAfterPayment: string | null = null;

    if (shouldAdvanceNextDue) {
      const nextDueDate =
        frequency === "weekly"
          ? addDays(currentCycleDueDate, 7)
          : frequency === "biweekly"
          ? addDays(currentCycleDueDate, 14)
          : addMonthsClamped(
              currentCycleDueDate,
              getFrequencyMonthStep(frequency)
            );
      nextDueDateAfterPayment = toDateInputValue(nextDueDate);
    }

    const updatePayload: Record<string, any> = {};
    if (nextDueDateAfterPayment) {
      updatePayload.assigned_income_date = null;
      updatePayload.next_due_date_after_payment = nextDueDateAfterPayment;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("bill_events")
        .update(updatePayload)
        .eq("id", bill.id);
      if (updateError) {
        console.warn("Warning: Could not persist bill next due date:", updateError);
      }
    }

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
    setEditBillFrequency((bill.frequency || "monthly") as any);
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

    if (!debt?.id) {
      console.error("Invalid debt: missing id");
      return;
    }

    if (amount <= 0) {
      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "error",
          message: "Payment amount must be greater than 0.",
        },
      }));
      return;
    }

    setApplyingDebtPaymentId(debt.id);

    try {
      const currentBalance = Number(debt.balance || 0);
      const newBalance = Math.max(currentBalance - amount, 0);
      const userId = await getUserId();

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const currentCycleDueDate = getCurrentDebtCycleDueDate(debt);
      const cycleDueDate = toDateInputValue(currentCycleDueDate);
      const minimumPayment = Number(debt.minimum_payment || 0);
      const cycleKey = `${debt.id}||${cycleDueDate}`;

      const debtPaymentsByDebtAndCycle: Record<string, number> = {};
      for (const payment of debtPaymentRows) {
        const key = `${payment.debt_id}||${payment.cycle_due_date}`;
        debtPaymentsByDebtAndCycle[key] =
          Number(debtPaymentsByDebtAndCycle[key] || 0) + Number(payment.amount || 0);
      }

      const currentCyclePaid = Number(debtPaymentsByDebtAndCycle[cycleKey] || 0);
      const totalCyclePaid = currentCyclePaid + amount;
      const shouldAdvanceDueDate =
        newBalance === 0 || totalCyclePaid >= minimumPayment;
      let nextDueDateAfterPayment: string | null = null;

      if (shouldAdvanceDueDate) {
        const nextCycleDueDate = addMonthsClamped(currentCycleDueDate, 1);
        nextDueDateAfterPayment = toDateInputValue(nextCycleDueDate);
      }

      const { error: insertError } = await supabase
        .from("debt_payments")
        .insert({
          user_id: userId,
          debt_id: debt.id,
          amount,
          payment_date: new Date().toISOString().slice(0, 10),
          cycle_due_date: cycleDueDate,
          funding_source_id: debt.funding_source_id || null,
        });

      if (insertError) {
        throw new Error(`Failed to insert payment: ${insertError.message}`);
      }

      const updatePayload: Record<string, any> = {
        balance: newBalance,
      };
      if (nextDueDateAfterPayment) {
        updatePayload.assigned_income_date = null;
        updatePayload.next_due_date_after_payment = nextDueDateAfterPayment;
      }

      const { error: updateError } = await supabase
        .from("debts")
        .update(updatePayload)
        .eq("id", debt.id);

      if (updateError) {
        throw new Error(`Failed to update debt: ${updateError.message}`);
      }

      setDebtPayments((prev) => ({
        ...prev,
        [debt.id]: "",
      }));

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "success",
          message: `Payment of $${amount.toFixed(2)} applied successfully.`,
        },
      }));

      setTimeout(() => {
        setDebtPaymentStatus((prev) => ({
          ...prev,
          [debt.id]: { type: null, message: "" },
        }));
      }, 3000);

      await load();
    } catch (error) {
      console.error("Error applying debt payment:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to apply payment. Please try again.";

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "error",
          message: errorMessage,
        },
      }));
    } finally {
      setApplyingDebtPaymentId(null);
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

  async function resetDebtDueDate(id: string) {
    const supabase = createClient();
    await supabase.from("debts").update({ next_due_date_after_payment: null }).eq("id", id);
    await load();
  }

  async function resetBillDueDate(id: string) {
    const supabase = createClient();
    await supabase.from("bill_events").update({ next_due_date_after_payment: null }).eq("id", id);
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

  return {
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
  };
}
