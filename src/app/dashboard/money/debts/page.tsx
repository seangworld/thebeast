"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  formatShortDate,
  getCurrentDebtCycleDueDate,
  parseDateOnly,
  sortObligationsByNextDueDate,
} from "../cashflow/cashflowUtils";
import {
  buildVelocityInputSnapshot,
  runVelocityEngine,
} from "@/lib/velocity";
import {
  simulatePayoffPlan,
} from "@/lib/payoffPlan";
import { buildCashIntelligence } from "@/lib/cashIntelligence";
import { buildFinancialDecision } from "@/lib/financialDecisionEngine";
import {
  DEBT_STRATEGIES,
  getDebtStrategyDescription,
  normalizeDebtStrategy,
  type DebtStrategy,
} from "@/lib/debtStrategies";
import {
  addMonthsClamped,
  formatMonthYear,
  roundMoney,
} from "@/lib/formatters";
import {
  DEFAULT_VELOCITY_SETTINGS,
  mapVelocitySettingsRow,
  type VelocitySettings,
} from "@/lib/velocity/settings";
import { BeastMoneyShell } from "@/app/dashboard/money/BeastMoneyShell";

type Debt = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
  due_date?: number;
  is_archived?: boolean;
  payment_behavior?: "fixed" | "revolving";
  minimum_payment_rate?: number;
  minimum_payment_floor?: number;
  credit_limit?: number;
  available_credit?: number;
  next_due_date_after_payment?: string | null;
  nextDueDate?: Date;
  nextDueDateDisplay?: string;
};

function money(value: number) {
  return roundMoney(value);
}

type StrategyComparisonRow = {
  strategy: "Minimum" | "Snowball" | "Avalanche" | "Velocity";
  debtFreeDate: string;
  monthsToDebtFree: string;
  monthsValue: number | null;
  totalInterest: number;
  totalPaid: number;
  status: "Projected" | "Needs attention";
  notes: string;
  isBestInterest: boolean;
  isFastest: boolean;
};

function summarizePayoffProjection({
  strategy,
  result,
  activeDebtCount,
  notes,
}: {
  strategy: "Snowball" | "Avalanche" | "Velocity";
  result: {
    months_to_payoff: number;
    total_interest: number;
    total_paid: number;
    payoff_months: any[];
  };
  activeDebtCount: number;
  notes: string;
}): StrategyComparisonRow {
  if (activeDebtCount === 0) {
    return {
      strategy,
      debtFreeDate: "Already debt-free",
      monthsToDebtFree: "0",
      monthsValue: 0,
      totalInterest: 0,
      totalPaid: 0,
      status: "Projected",
      notes: "No active debt balance.",
      isBestInterest: false,
      isFastest: false,
    };
  }

  const lastMonth = result.payoff_months[result.payoff_months.length - 1];
  const remainingDebt = Number(lastMonth?.remaining_debt ?? Number.POSITIVE_INFINITY);
  const projected =
    result.payoff_months.length > 0 &&
    remainingDebt <= 0 &&
    Number(result.months_to_payoff || 0) < 600;
  const monthsValue = projected ? Number(result.months_to_payoff || 0) : null;

  return {
    strategy,
    debtFreeDate:
      monthsValue === null
        ? "—"
        : formatMonthYear(addMonthsClamped(new Date(), monthsValue)),
    monthsToDebtFree: monthsValue === null ? "—" : String(monthsValue),
    monthsValue,
    totalInterest: money(Number(result.total_interest || 0)),
    totalPaid: money(Number(result.total_paid || 0)),
    status: projected ? "Projected" : "Needs attention",
    notes: projected
      ? notes
      : lastMonth?.warning || "Projection did not reach debt-free within the guard limit.",
    isBestInterest: false,
    isFastest: false,
  };
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [strategy, setStrategy] = useState<DebtStrategy>("snowball");
  const [extraPayment, setExtraPayment] = useState("");
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<number | null>(null);
  const [velocitySettings, setVelocitySettings] =
    useState<VelocitySettings>(DEFAULT_VELOCITY_SETTINGS);

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("1");
  const [paymentBehavior, setPaymentBehavior] = useState<"fixed" | "revolving">("fixed");
  const [minimumPaymentRate, setMinimumPaymentRate] = useState("2");
  const [minimumPaymentFloor, setMinimumPaymentFloor] = useState("25");
  const [creditLimit, setCreditLimit] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editMinimumPayment, setEditMinimumPayment] = useState("");
  const [editInterestRate, setEditInterestRate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaymentBehavior, setEditPaymentBehavior] = useState<"fixed" | "revolving">("fixed");
  const [editMinimumPaymentRate, setEditMinimumPaymentRate] = useState("2");
  const [editMinimumPaymentFloor, setEditMinimumPaymentFloor] = useState("25");
  const [editCreditLimit, setEditCreditLimit] = useState("");
  const [projectionMonths, setProjectionMonths] = useState(24);
  const [showArchivedDebts, setShowArchivedDebts] = useState(false);
  const focusReloadInFlightRef = useRef(false);
  const lastFocusReloadAtRef = useRef(0);

  const debtsWithNextDueDate = useMemo(() => {
    return debts.map((debt) => {
      let nextDueDate = getCurrentDebtCycleDueDate(debt);

      if (debt.next_due_date_after_payment) {
        const parsed = parseDateOnly(debt.next_due_date_after_payment);

        if (!Number.isNaN(parsed.getTime())) {
          nextDueDate = parsed;
        }
      }

      return {
        ...debt,
        nextDueDate,
        nextDueDateDisplay: formatShortDate(nextDueDate),
      };
    });
  }, [debts]);

  const activeDebts = useMemo(() => {
    return sortObligationsByNextDueDate(
      debtsWithNextDueDate.filter(
        (debt) => !Boolean(debt.is_archived) && Number(debt.balance || 0) > 0
      )
    );
  }, [debtsWithNextDueDate]);

  // Debts that are archived or already paid off still contribute their
  // minimum payments as recovered attack capacity instead of vanishing.
  const recoveredMinimums = useMemo(() => {
    return debtsWithNextDueDate
      .filter(
        (debt) => Boolean(debt.is_archived) || Number(debt.balance || 0) <= 0
      )
      .reduce((sum, debt) => sum + Number(debt.minimum_payment || 0), 0);
  }, [debtsWithNextDueDate]);

  const archivedDebts = useMemo(() => {
    return sortObligationsByNextDueDate(
      debtsWithNextDueDate.filter(
        (debt) => Boolean(debt.is_archived) || Number(debt.balance || 0) <= 0
      )
    );
  }, [debtsWithNextDueDate]);

  const velocityInputSnapshot = useMemo(() => {
    return buildVelocityInputSnapshot({
      as_of_date: new Date().toISOString(),
      debts: activeDebts,
      incomes,
      bills,
      velocity_settings: velocitySettings,
      starting_balance: startingBalance,
      cash_buffer: buffer,
      extra_attack: extraPayment,
    });
  }, [
    activeDebts,
    bills,
    buffer,
    extraPayment,
    incomes,
    startingBalance,
    velocitySettings,
  ]);

  const velocityEngineResult = useMemo(() => {
    return runVelocityEngine(velocityInputSnapshot);
  }, [velocityInputSnapshot]);

  const velocityPayoffTargetDebtId =
    velocityEngineResult.recommendation?.debt_id ||
    velocityEngineResult.target_debt?.id;

  const cashIntelligence = useMemo(() => {
    return buildCashIntelligence({
      income: incomes,
      bills,
      debtMinimums: activeDebts,
      fundingSources,
      settings: {
        currentCash: startingBalance ?? 0,
        cashBuffer: buffer ?? 0,
        lookaheadDays: 30,
      },
    });
  }, [activeDebts, bills, buffer, fundingSources, incomes, startingBalance]);

  const financialDecision = useMemo(() => {
    return buildFinancialDecision({
      cashIntelligence,
      debts: activeDebts,
      income: incomes,
      bills,
      fundingSources,
      strategy,
    });
  }, [activeDebts, bills, cashIntelligence, fundingSources, incomes, strategy]);

  const minimumProjection = useMemo(() => {
    const result = simulatePayoffPlan({
      debts: activeDebts,
      recoveredMinimums: 0,
      strategy: "minimum",
      extraPayment: 0,
      cashIntelligence,
      financialDecision,
      fundingSources,
    });
    const lastMonth = result.payoff_months[result.payoff_months.length - 1];
    const projected =
      activeDebts.length === 0 ||
      (result.payoff_months.length > 0 &&
        Number(lastMonth?.remaining_debt || 0) <= 0 &&
        Number(result.months_to_payoff || 0) < 600);

    return {
      ...result,
      months_to_payoff: projected ? result.months_to_payoff : null,
      debt_free_date:
        activeDebts.length === 0
          ? "Already debt-free"
          : projected
          ? formatMonthYear(addMonthsClamped(new Date(), result.months_to_payoff))
          : "—",
      status: projected ? "projected" : "blocked",
      notes:
        activeDebts.length === 0
          ? "No active debt balance."
          : projected
          ? "Minimum payments only. No extra attack or rollover."
          : lastMonth?.warning || "Projection did not reach debt-free within the guard limit.",
    };
  }, [activeDebts, cashIntelligence, financialDecision, fundingSources]);

  const snowballProjection = useMemo(() => {
    return simulatePayoffPlan({
      debts: activeDebts,
      recoveredMinimums,
      strategy: "snowball",
      extraPayment: Number(extraPayment || 0),
      cashIntelligence,
      financialDecision,
      fundingSources,
    });
  }, [activeDebts, recoveredMinimums, extraPayment, cashIntelligence, financialDecision, fundingSources]);

  const avalancheProjection = useMemo(() => {
    return simulatePayoffPlan({
      debts: activeDebts,
      recoveredMinimums,
      strategy: "avalanche",
      extraPayment: Number(extraPayment || 0),
      cashIntelligence,
      financialDecision,
      fundingSources,
    });
  }, [activeDebts, recoveredMinimums, extraPayment, cashIntelligence, financialDecision, fundingSources]);

  const velocityProjection = useMemo(() => {
    return simulatePayoffPlan({
      debts: activeDebts,
      recoveredMinimums,
      strategy: "velocity",
      extraPayment: Number(extraPayment || 0),
      cashIntelligence,
      financialDecision,
      fundingSources,
      velocityTargetDebtId: velocityPayoffTargetDebtId,
      velocityEngineResult,
    });
  }, [
    activeDebts,
    cashIntelligence,
    extraPayment,
    financialDecision,
    fundingSources,
    recoveredMinimums,
    velocityEngineResult,
    velocityPayoffTargetDebtId,
  ]);

  const payoffPlan = useMemo(() => {
    if (strategy === "minimum") {
      return minimumProjection;
    }

    if (strategy === "velocity") {
      return velocityProjection;
    }

    if (strategy === "avalanche") {
      return avalancheProjection;
    }

    return snowballProjection;
  }, [
    avalancheProjection,
    minimumProjection,
    snowballProjection,
    strategy,
    velocityProjection,
  ]);

  const strategyComparisonRows = useMemo(() => {
    const rows: StrategyComparisonRow[] = [
      {
        strategy: "Minimum",
        debtFreeDate: minimumProjection.debt_free_date,
        monthsToDebtFree:
          minimumProjection.months_to_payoff === null
            ? "—"
            : String(minimumProjection.months_to_payoff),
        totalInterest: minimumProjection.total_interest,
        totalPaid: minimumProjection.total_paid,
        notes: minimumProjection.notes,
        monthsValue: minimumProjection.months_to_payoff,
        status:
          minimumProjection.status === "projected"
            ? "Projected"
            : "Needs attention",
        isBestInterest: false,
        isFastest: false,
      },
      summarizePayoffProjection({
        strategy: "Snowball",
        result: snowballProjection,
        activeDebtCount: activeDebts.length,
        notes: "Smallest balance first. Freed minimums and extra attack roll forward.",
      }),
      summarizePayoffProjection({
        strategy: "Avalanche",
        result: avalancheProjection,
        activeDebtCount: activeDebts.length,
        notes: "Highest APR first. Freed minimums and extra attack roll forward.",
      }),
      summarizePayoffProjection({
        strategy: "Velocity",
        result: velocityProjection,
        activeDebtCount: activeDebts.length,
        notes:
          "Uses the Velocity engine chunk, target, estimated source APR cost, and recovery repayment timing.",
      }),
    ];

    const projectedRows = rows.filter(
      (row) => row.status === "Projected" && row.monthsValue !== null
    );
    const bestInterest =
      projectedRows.length > 0
        ? Math.min(...projectedRows.map((row) => row.totalInterest))
        : null;
    const fastestMonths =
      projectedRows.length > 0
        ? Math.min(...projectedRows.map((row) => Number(row.monthsValue)))
        : null;
    const minimumRow = rows.find(
      (row) => row.strategy === "Minimum" && row.status === "Projected"
    );

    return rows.map((row) => {
      const interestSavings =
        minimumRow && row.strategy !== "Minimum" && row.status === "Projected"
          ? money(minimumRow.totalInterest - row.totalInterest)
          : null;
      const monthSavings =
        minimumRow &&
        row.strategy !== "Minimum" &&
        row.status === "Projected" &&
        minimumRow.monthsValue !== null &&
        row.monthsValue !== null
          ? minimumRow.monthsValue - row.monthsValue
          : null;
      const comparisonNote =
        interestSavings !== null && monthSavings !== null
          ? ` ${
              interestSavings >= 0
                ? `Saves $${interestSavings.toFixed(2)} interest`
                : `Costs $${Math.abs(interestSavings).toFixed(2)} more interest`
            } and ${
              monthSavings === 0
                ? "matches Minimum payoff timing"
                : `${Math.abs(monthSavings)} month${
                    Math.abs(monthSavings) === 1 ? "" : "s"
                  } ${monthSavings > 0 ? "faster" : "slower"}`
            } vs Minimum.`
          : "";

      return {
        ...row,
        isBestInterest:
          bestInterest !== null &&
          row.status === "Projected" &&
          row.totalInterest === bestInterest,
        isFastest:
          fastestMonths !== null &&
          row.status === "Projected" &&
          row.monthsValue === fastestMonths,
        notes: `${row.notes}${comparisonNote}`,
      };
    });
  }, [
    activeDebts.length,
    avalancheProjection,
    minimumProjection,
    snowballProjection,
    velocityProjection,
  ]);

  const orderedDebts = useMemo(() => {
    return activeDebts;
  }, [activeDebts]);

  const totalDebt = activeDebts.reduce(
    (sum, d) => sum + Number(d.balance || 0),
    0
  );

  const totalMinimums = activeDebts.reduce(
    (sum, d) => sum + Number(d.minimum_payment || 0),
    0
  );

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: debtRows } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId);

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

    const { data: cashSettings } = await supabase
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: fundingSourceRows } = await supabase
      .from("funding_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: settings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: velocitySettingsRow } = await supabase
      .from("velocity_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setDebts(debtRows || []);
    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setFundingSources(fundingSourceRows || []);
    setStrategy(normalizeDebtStrategy(settings?.strategy));
    setExtraPayment(
      settings?.extra_payment != null ? String(settings.extra_payment) : ""
    );
    setStartingBalance(
      cashSettings?.starting_balance != null
        ? Number(cashSettings.starting_balance)
        : null
    );
    setBuffer(
      cashSettings?.checking_buffer != null
        ? Number(cashSettings.checking_buffer)
        : null
    );
    setVelocitySettings(
      velocitySettingsRow
        ? mapVelocitySettingsRow(velocitySettingsRow)
        : DEFAULT_VELOCITY_SETTINGS
    );

    setLoading(false);
    }, [getUserId]);
  useEffect(() => {
    load();
  }, [load]);

  const reloadDebtsOnFocus = useCallback(async () => {
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
        void reloadDebtsOnFocus();
      }
    }

    function handleFocus() {
      void reloadDebtsOnFocus();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [reloadDebtsOnFocus]);

  async function saveSettings() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    const { error } = await supabase.from("debt_settings").upsert(
      {
        user_id: userId,
        strategy,
        extra_payment: strategy === "minimum" ? 0 : Number(extraPayment || 0),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setMessage(`Settings error: ${error.message}`);
      return;
    }

    setMessage("Debt settings saved.");
    await load();
  }

  async function addDebt() {
    setMessage("");

    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    if (!name || !balance) {
      setMessage("Debt name and balance are required.");
      return;
    }

    // Debt available credit is derived, not user-entered.
    const creditLimitNum = creditLimit === "" ? null : Number(creditLimit);
    const balanceNum = Number(balance);
    const availableCredit = creditLimitNum !== null
      ? money(creditLimitNum - balanceNum)
      : null;

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name,
      balance: balanceNum,
      minimum_payment: Number(minimumPayment || 0),
      interest_rate: Number(interestRate || 0),
      due_date: Number(dueDate || 1),
      payment_behavior: paymentBehavior,
      minimum_payment_rate: Number(minimumPaymentRate || 2),
      minimum_payment_floor: Number(minimumPaymentFloor || 25),
      credit_limit: creditLimitNum,
      available_credit: availableCredit,
      is_archived: false,
    });

    if (error) {
      setMessage(`Add debt error: ${error.message}`);
      return;
    }

    setName("");
    setBalance("");
    setMinimumPayment("");
    setInterestRate("");
    setDueDate("1");
    setPaymentBehavior("fixed");
    setMinimumPaymentRate("2");
    setMinimumPaymentFloor("25");
    setCreditLimit("");

    await load();
  }

  function startEditDebt(debt: Debt) {
    setEditingDebtId(debt.id);
  
    setEditName(debt.name || "");
    setEditBalance(String(debt.balance || ""));
    setEditMinimumPayment(String(debt.minimum_payment || ""));
    setEditInterestRate(String(debt.interest_rate || ""));
    setEditDueDate(String(debt.due_date || 1));
    setEditPaymentBehavior(debt.payment_behavior || "fixed");
    setEditMinimumPaymentRate(
      String(debt.minimum_payment_rate ?? 2)
    );
    setEditMinimumPaymentFloor(
      String(debt.minimum_payment_floor ?? 25)
    );
    setEditCreditLimit(String(debt.credit_limit ?? ""));
  }
  
  function cancelEditDebt() {
    setEditingDebtId(null);
  
    setEditName("");
    setEditBalance("");
    setEditMinimumPayment("");
    setEditInterestRate("");
    setEditDueDate("");
    setEditPaymentBehavior("fixed");
    setEditMinimumPaymentRate("2");
    setEditMinimumPaymentFloor("25");
    setEditCreditLimit("");
  }
  
  async function saveEditDebt(id: string) {
    const supabase = createClient();
  
    // Debt available credit is derived, not user-entered.
    const creditLimitNum = editCreditLimit === "" ? null : Number(editCreditLimit);
    const balanceNum = Number(editBalance || 0);
    const availableCredit = creditLimitNum !== null
      ? money(creditLimitNum - balanceNum)
      : null;
  
    const { error } = await supabase
      .from("debts")
      .update({
        name: editName,
        balance: balanceNum,
        minimum_payment: Number(editMinimumPayment || 0),
        interest_rate: Number(editInterestRate || 0),
        due_date: Number(editDueDate || 1),
        payment_behavior: editPaymentBehavior,
        minimum_payment_rate: Number(editMinimumPaymentRate || 2),
        minimum_payment_floor: Number(editMinimumPaymentFloor || 25),
        credit_limit: creditLimitNum,
        available_credit: availableCredit,
      })
      .eq("id", id);
  
    if (error) {
      setMessage(`Update error: ${error.message}`);
      return;
    }
  
    setMessage("Debt updated.");
  
    cancelEditDebt();
  
    await load();
  }
  async function archiveDebt(id: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("debts")
      .update({ is_archived: true })
      .eq("id", id);

    if (error) {
      setMessage(`Archive error: ${error.message}`);
      return;
    }

    setMessage("Debt archived.");
    await load();
  }

  async function unarchiveDebt(id: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("debts")
      .update({ is_archived: false })
      .eq("id", id);

    if (error) {
      setMessage(`Unarchive error: ${error.message}`);
      return;
    }

    setMessage("Debt restored.");
    await load();
  }

  async function deleteDebt(id: string) {
    const supabase = createClient();

    const { error } = await supabase.from("debts").delete().eq("id", id);

    if (error) {
      setMessage(`Delete error: ${error.message}`);
      return;
    }

    await load();
  }

  return (
    <BeastMoneyShell
      title="Debt Strategy"
      description="Add debts, choose a payoff strategy, and generate your payoff plan."
    >
      <div className="money-page-stack">

        <section className="money-section-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="money-section-title">Data Status</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Click Refresh to reload debts from the database.
              </p>
            </div>
            <button onClick={() => load()} className="beast-button-secondary">
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section className="money-section-card">
            <p className="text-sm text-yellow-300">{message}</p>
          </section>
        )}

        <section className="money-summary-grid">
          <div className="money-section-card">
            <div className="money-metric-label">Total Debt</div>
            <div className="money-metric-value">
              ${totalDebt.toFixed(2)}
            </div>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Monthly Minimums</div>
            <div className="money-metric-value">
              ${totalMinimums.toFixed(2)}
            </div>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Payoff Time</div>
            <div className="money-metric-value">
              {payoffPlan.months_to_payoff === null
                ? "Unable to project"
                : `${payoffPlan.months_to_payoff} months`}
            </div>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">First Target</div>
            <div className="money-metric-value">
              {payoffPlan.first_target}
            </div>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Total Interest</div>
            <div className="money-metric-value">
              ${payoffPlan.total_interest.toFixed(2)}
            </div>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Recommended</div>
            <div className="money-metric-value capitalize">{strategy}</div>
            <p className="money-muted-text mt-2">
              {getDebtStrategyDescription(strategy)}
            </p>
            {strategy === "velocity" ? (
              <Link
                href="/dashboard/money/velocity"
                className="mt-3 inline-block text-sm text-[#38bdf8] underline"
              >
                Open Velocity Planner
              </Link>
            ) : null}
          </div>
        </section>

        <section id="add-debt" className="money-section-card">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="money-field-label">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(normalizeDebtStrategy(e.target.value))}
                className="beast-input mt-2"
              >
                {DEBT_STRATEGIES.map((strategyOption) => (
                  <option key={strategyOption.value} value={strategyOption.value}>
                    {strategyOption.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[#7f8da3]">
                This value is shared in debt settings and is the source of truth for the payoff strategy.
              </p>
              {strategy === "velocity" ? (
                <p className="mt-2 text-xs text-[#7f8da3]">
                  Configure targets, chunks, risk, and savings in the{" "}
                  <Link href="/dashboard/money/velocity" className="text-[#38bdf8] underline">
                    Velocity Planner
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div>
              <label className="money-field-label">Monthly Extra Attack</label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="0"
                disabled={strategy === "minimum"}
                className="beast-input mt-2"
              />
              {strategy === "minimum" ? (
                <p className="mt-2 text-xs text-[#7f8da3]">
                  Minimum strategy ignores extra attack payments.
                </p>
              ) : null}
            </div>

            <div className="flex items-end">
              <button onClick={saveSettings} className="beast-button w-full">
                Update Strategy / Monthly Extra Attack
              </button>
            </div>
          </div>
        </section>

        <section className="money-section-card">
          <h2 className="money-section-title">Add Debt</h2>

          <div className="money-field-grid md:grid-cols-3">
  <div>
    <label className="text-sm text-[#c7cfdb]">
      Debt Name
    </label>

    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Debt name"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Balance
    </label>

    <input
      type="number"
      value={balance}
      onChange={(e) => setBalance(e.target.value)}
      placeholder="0"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Minimum Payment
    </label>

    <input
      type="number"
      value={minimumPayment}
      onChange={(e) => setMinimumPayment(e.target.value)}
      placeholder="0"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      APR %
    </label>

    <input
      type="number"
      value={interestRate}
      onChange={(e) => setInterestRate(e.target.value)}
      placeholder="0"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Payment Due Day
    </label>

    <input
      type="number"
      min="1"
      max="31"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      placeholder="Example: 15"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Payment Behavior
    </label>

    <select
      value={paymentBehavior}
      onChange={(e) =>
        setPaymentBehavior(e.target.value as "fixed" | "revolving")
      }
      className="beast-input mt-2"
    >
      <option value="fixed">Fixed Minimum</option>
      <option value="revolving">Revolving / Credit Minimum</option>
    </select>
  </div>

  {paymentBehavior === "revolving" ? (
    <>
      <div>
        <label className="text-sm text-[#c7cfdb]">
          Credit Limit
        </label>

        <input
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="0"
          className="beast-input mt-2"
        />
      </div>

      <div>
        <label className="text-sm text-[#c7cfdb]">
          Minimum % of Balance
        </label>

        <input
          type="number"
          value={minimumPaymentRate}
          onChange={(e) => setMinimumPaymentRate(e.target.value)}
          placeholder="2"
          className="beast-input mt-2"
        />
      </div>

      <div>
        <label className="text-sm text-[#c7cfdb]">
          Minimum Floor
        </label>

        <input
          type="number"
          value={minimumPaymentFloor}
          onChange={(e) => setMinimumPaymentFloor(e.target.value)}
          placeholder="25"
          className="beast-input mt-2"
        />
      </div>
    </>
  ) : null}
</div>

<button onClick={addDebt} className="beast-button mt-4 w-full">
            Add Debt
          </button>
        </section>

        <section className="money-section-panel">
          <div className="money-section-header">
            <h2 className="money-section-title">Debt List</h2>
          </div>

          <div className="beast-table-wrap">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Name</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Minimum</th>
                  <th className="text-right">APR</th>
                  <th className="text-right">Next Due</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>Loading debts...</td>
                  </tr>
                ) : orderedDebts.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No debts added yet.</td>
                  </tr>
                ) : (
                  orderedDebts.map((debt, index) => (
                    <tr key={debt.id}>
                      <td>#{index + 1}</td>
                  
                      <td>
                        {editingDebtId === debt.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          debt.name
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="number"
                              value={editBalance}
                              onChange={(e) => setEditBalance(e.target.value)}
                              className="beast-input"
                              placeholder="Balance"
                            />
                            <input
                              type="number"
                              value={editCreditLimit}
                              onChange={(e) => setEditCreditLimit(e.target.value)}
                              className="beast-input"
                              placeholder="Credit Limit"
                            />
                            <input
                              type="text"
                              readOnly
                              value={
                                editCreditLimit !== "" &&
                                Number.isFinite(Number(editCreditLimit)) &&
                                Number.isFinite(Number(editBalance))
                                  ? `$${(
                                      Number(editCreditLimit) - Number(editBalance)
                                    ).toFixed(2)}`
                                  : ""
                              }
                              className="beast-input text-[#7f8da3]"
                              placeholder="Available Credit"
                            />
                          </div>
                        ) : (
                          `$${Number(debt.balance || 0).toFixed(2)}`
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="number"
                              value={editMinimumPayment}
                              onChange={(e) => setEditMinimumPayment(e.target.value)}
                              className="beast-input"
                              placeholder="Min Payment"
                            />
                            <select
                              value={editPaymentBehavior}
                              onChange={(e) =>
                                setEditPaymentBehavior(
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
                            {editPaymentBehavior === "revolving" && (
                              <>
                                <input
                                  type="number"
                                  value={editMinimumPaymentRate}
                                  onChange={(e) => setEditMinimumPaymentRate(e.target.value)}
                                  className="beast-input"
                                  placeholder="Min %"
                                />
                                <input
                                  type="number"
                                  value={editMinimumPaymentFloor}
                                  onChange={(e) => setEditMinimumPaymentFloor(e.target.value)}
                                  className="beast-input"
                                  placeholder="Min Floor"
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          `$${Number(debt.minimum_payment || 0).toFixed(2)}`
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <input
                            type="number"
                            value={editInterestRate}
                            onChange={(e) => setEditInterestRate(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          `${Number(debt.interest_rate || 0).toFixed(2)}%`
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <input
                            type="number"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          debt.nextDueDateDisplay || debt.due_date || 1
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEditDebt(debt.id)}
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
                          <div className="flex justify-end gap-2">
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
        </section>

        <section className="money-section-panel">
          <div className="money-section-header">
            <div>
              <h2 className="money-section-title">Paid Off / Archived Debts</h2>
              <p className="money-section-description">
                Debts with a $0 balance or archived status are removed from active payoff strategy calculations.
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
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">Minimum</th>
                    <th className="text-right">APR</th>
                    <th className="text-right">Next Due</th>
                    <th className="text-right">Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {archivedDebts.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No paid off or archived debts.</td>
                    </tr>
                  ) : (
                    archivedDebts.map((debt) => (
                      <tr key={debt.id}>
                        <td>
                          {editingDebtId === debt.id ? (
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="beast-input"
                            />
                          ) : (
                            debt.name
                          )}
                        </td>

                        <td className="text-right">
                          {editingDebtId === debt.id ? (
                            <input
                              type="number"
                              value={editBalance}
                              onChange={(e) => setEditBalance(e.target.value)}
                              className="beast-input"
                            />
                          ) : (
                            `$${Number(debt.balance || 0).toFixed(2)}`
                          )}
                        </td>

                        <td className="text-right">
                          {editingDebtId === debt.id ? (
                            <input
                              type="number"
                              value={editMinimumPayment}
                              onChange={(e) => setEditMinimumPayment(e.target.value)}
                              className="beast-input"
                            />
                          ) : (
                            `$${Number(debt.minimum_payment || 0).toFixed(2)}`
                          )}
                        </td>

                        <td className="text-right">
                          {editingDebtId === debt.id ? (
                            <input
                              type="number"
                              value={editInterestRate}
                              onChange={(e) => setEditInterestRate(e.target.value)}
                              className="beast-input"
                            />
                          ) : (
                            `${Number(debt.interest_rate || 0).toFixed(2)}%`
                          )}
                        </td>

                        <td className="text-right">
                          {editingDebtId === debt.id ? (
                            <input
                              type="number"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="beast-input"
                            />
                          ) : (
                            debt.nextDueDateDisplay || debt.due_date || 1
                          )}
                        </td>

                        <td className="text-right">
                          {Boolean(debt.is_archived) ? (
                            <span className="text-[#7f8da3]">Archived</span>
                          ) : Number(debt.balance || 0) <= 0 ? (
                            <span className="font-semibold text-green-300">Paid Off</span>
                          ) : (
                            <span className="text-[#7f8da3]">Inactive</span>
                          )}
                        </td>

                        <td className="text-right">
                          {editingDebtId === debt.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEditDebt(debt.id)}
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
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditDebt(debt)}
                                className="beast-button-secondary"
                              >
                                Edit
                              </button>

                              {Boolean(debt.is_archived) ? (
                                <button
                                  onClick={() => unarchiveDebt(debt.id)}
                                  className="beast-button-secondary"
                                >
                                  Unarchive
                                </button>
                              ) : (
                                <button
                                  onClick={() => archiveDebt(debt.id)}
                                  className="beast-button-secondary"
                                >
                                  Archive
                                </button>
                              )}

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

        <section id="strategy-comparison" className="money-section-panel">
          <div className="money-section-header">
            <div>
              <h2 className="money-section-title">Strategy Comparison</h2>
              <p className="money-section-description">
              Baseline comparison for payoff strategies. Minimum uses only the
              required payment on each active debt.
              </p>
            </div>
          </div>

          <div className="beast-table-wrap">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Debt-Free Date</th>
                  <th className="text-right">Months</th>
                  <th className="text-right">Total Interest</th>
                  <th className="text-right">Total Paid</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {strategyComparisonRows.map((row) => (
                  <tr key={row.strategy}>
                    <td className="font-semibold">
                      <div>{row.strategy}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.isBestInterest ? (
                          <span className="rounded border border-green-400/50 bg-green-950/30 px-2 py-1 text-xs text-green-200">
                            Best Interest Savings
                          </span>
                        ) : null}
                        {row.isFastest ? (
                          <span className="rounded border border-sky-300/50 bg-sky-950/30 px-2 py-1 text-xs text-sky-200">
                            Fastest Payoff
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>{row.debtFreeDate}</td>
                    <td className="text-right">{row.monthsToDebtFree}</td>
                    <td className="text-right">
                      ${row.totalInterest.toFixed(2)}
                    </td>
                    <td className="text-right">${row.totalPaid.toFixed(2)}</td>
                    <td
                      className={
                        row.status === "Projected"
                          ? "font-semibold text-green-300"
                          : "font-semibold text-yellow-300"
                      }
                    >
                      {row.status}
                    </td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="payoff-plan" className="money-section-panel">
          <div className="money-section-header">
            <h2 className="money-section-title">Payoff Plan</h2>

            <div>
              <label className="money-field-label">Projection Length</label>

              <select
                value={projectionMonths}
                onChange={(e) => setProjectionMonths(Number(e.target.value))}
                className="beast-input mt-2"
              >
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
                <option value={36}>36 Months</option>
                <option value={60}>60 Months</option>
                <option value={120}>120 Months</option>
              </select>
            </div>
          </div>

          <div className="beast-table-wrap">
            <table className="money-payoff-table w-full min-w-[1100px] text-sm">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Target</th>
                  <th className="text-right">Debt Start</th>
                  <th className="text-right">Required Min</th>
                  <th className="text-right">Monthly Interest</th>
                  <th className="text-right">Principal Reduction</th>
                  <th className="text-right">Recommended Min</th>
                  <th className="text-right">Monthly Extra Attack</th>
                  <th className="text-right">Total Payment</th>
                  <th className="text-right">Debt End</th>
                  <th className="text-right">Total Remaining</th>
                  <th className="text-right">Recovered Min</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {payoffPlan.payoff_months.length === 0 ? (
                  <tr>
                    <td colSpan={13}>Add debts to generate payoff plan.</td>
                  </tr>
                ) : (
                  payoffPlan.payoff_months
                    .slice(0, projectionMonths)
                    .map((row, index) => (
                      <tr key={`${row.month}-${row.target}-${index}`}>
                        <td>{row.month}</td>
                        <td>{row.target}</td>
                        <td className="text-right">
                          ${row.debt_starting_balance.toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${Number(row.required_minimum || 0).toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${Number(row.monthly_interest || 0).toFixed(2)}
                        </td>
                        <td
                          className={`text-right font-semibold ${
                            Number(row.principal_reduction || 0) < 0
                              ? "text-red-300"
                              : "text-green-300"
                          }`}
                        >
                          ${Number(row.principal_reduction || 0).toFixed(2)}
                        </td>
                        <td
                          className={`text-right font-semibold ${
                            row.warning ? "text-yellow-300" : "text-[#c7cfdb]"
                          }`}
                        >
                          ${Number(row.recommended_minimum || 0).toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${row.extra_attack.toFixed(2)}
                        </td>
                        <td className="text-right font-semibold">
                          ${row.total_payment.toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${row.debt_ending_balance.toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${row.remaining_debt.toFixed(2)}
                        </td>
                        <td
                          className={`text-right font-semibold ${
                            Number(row.recovered_minimum || 0) > 0
                              ? "text-green-300"
                              : "text-[#7f8da3]"
                          }`}
                        >
                          {Number(row.recovered_minimum || 0) > 0
                            ? `+$${Number(row.recovered_minimum || 0).toFixed(2)}`
                            : "—"}
                        </td>
                        <td>
                          {row.paid_off ? (
                            <span className="text-green-300 font-bold">
                              PAID OFF
                            </span>
                          ) : row.warning ? (
                            <span className="text-red-300 font-semibold">
                              {row.warning}
                            </span>
                          ) : (
                            <span className="text-[#7f8da3]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </BeastMoneyShell>
  );
}
