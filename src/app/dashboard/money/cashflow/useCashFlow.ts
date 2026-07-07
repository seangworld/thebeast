"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { simulateCashFlow } from "@/lib/cashflow";
import type { CashIntelligenceResult } from "@/lib/cashIntelligence";
import { createClient } from "@/lib/supabase/client";
import {
  getCycleMonth,
  PayoffStrategy,
  FundingSource,
} from "./cashflowUtils";
import { useCashFlowDisclosureState } from "./hooks/useCashFlowDisclosureState";
import { useCashFlowPaymentState } from "./hooks/useCashFlowPaymentState";
import { useCashFlowProjection } from "./hooks/useCashFlowProjection";
import { useCashFlowDataLoader } from "./hooks/useCashFlowDataLoader";
import { useCashFlowPaymentActions } from "./hooks/useCashFlowPaymentActions";
import { buildResetDueDatePayload } from "./dueDateReset";

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
  const [cashIntelligence, setCashIntelligence] =
    useState<CashIntelligenceResult | null>(null);

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

  const {
    debtPayments,
    setDebtPayments,
    partialPayments,
    setPartialPayments,
    debtPaymentStatus,
    setDebtPaymentStatus,
    applyingDebtPaymentId,
    setApplyingDebtPaymentId,
    isApplyingSuggestedAttack,
    setIsApplyingSuggestedAttack,
    suggestedAttackMessage,
    setSuggestedAttackMessage,
  } = useCashFlowPaymentState();

  const {
    showAddIncome,
    setShowAddIncome,
    showAddBill,
    setShowAddBill,
    showBills,
    setShowBills,
    showDebts,
    setShowDebts,
    showIncomeEvents,
    setShowIncomeEvents,
    showFundingSources,
    setShowFundingSources,
    showCashTimeline,
    setShowCashTimeline,
    showArchivedBills,
    setShowArchivedBills,
    showArchivedDebts,
    setShowArchivedDebts,
  } = useCashFlowDisclosureState();

  const cycleMonth = getCycleMonth();
  const { buildProjection } = useCashFlowProjection();
  const {
    getUserId,
    load,
    loadFundingSources,
  } = useCashFlowDataLoader({
    cycleMonth,
    buildProjection,
    setLoading,
    setFundingSources,
    setIncomes,
    setBills,
    setBillPayments,
    setDebtPaymentRows,
    setDebts,
    setTimeline,
    setData,
    setLookaheadDays,
    setAssignmentHorizonMonths,
    setBuffer,
    setStartingBalance,
    setStrategy,
    setExtraPayment,
    setTargetDebtName,
    setRequiredCash,
    setBillsDue,
    setIncomeExpected,
    setCashIntelligence,
  });
  const {
    addBillPayment,
    markBillPaid,
    updateBillIncomeDate,
    updateDebtIncomeDate,
    updateBillFundingSource,
    updateDebtFundingSource,
    applyDebtPayment,
  } = useCashFlowPaymentActions({
    cycleMonth,
    debtPaymentRows,
    getUserId,
    load,
    setPartialPayments,
    setDebtPayments,
    setDebtPaymentStatus,
    setApplyingDebtPaymentId,
  });

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
    await supabase.from("debts").update(buildResetDueDatePayload()).eq("id", id);
    await load();
  }

  async function resetBillDueDate(id: string) {
    const supabase = createClient();
    await supabase.from("bill_events").update(buildResetDueDatePayload()).eq("id", id);
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
  };
}
