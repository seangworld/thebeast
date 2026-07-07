import { useCallback, useEffect, useRef } from "react";
import type { CashIntelligenceResult } from "@/lib/cashIntelligence";
import { createClient } from "@/lib/supabase/client";
import type { FundingSource, PayoffStrategy } from "../cashflowUtils";

type UseCashFlowDataLoaderInput = {
  cycleMonth: string;
  buildProjection: (input: any) => any;
  setLoading: (value: boolean) => void;
  setFundingSources: (value: FundingSource[]) => void;
  setIncomes: (value: any[]) => void;
  setBills: (value: any[]) => void;
  setBillPayments: (value: any[]) => void;
  setDebtPaymentRows: (value: any[]) => void;
  setDebts: (value: any[]) => void;
  setTimeline: (value: any[]) => void;
  setData: (value: any[]) => void;
  setLookaheadDays: (value: number) => void;
  setAssignmentHorizonMonths: (value: number) => void;
  setBuffer: (value: number) => void;
  setStartingBalance: (value: number) => void;
  setStrategy: (value: PayoffStrategy) => void;
  setExtraPayment: (value: number) => void;
  setTargetDebtName: (value: string) => void;
  setRequiredCash: (value: number) => void;
  setBillsDue: (value: number) => void;
  setIncomeExpected: (value: number) => void;
  setCashIntelligence: (value: CashIntelligenceResult | null) => void;
};

export function useCashFlowDataLoader({
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
}: UseCashFlowDataLoaderInput) {
  const focusReloadInFlightRef = useRef(false);
  const lastFocusReloadAtRef = useRef(0);

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
  }, [getUserId, setFundingSources]);

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

    const projection = buildProjection({
      userId,
      cycleMonth,
      incomeRows,
      billRows,
      paymentRows,
      debtPaymentRows,
      debtRows,
      cashSettings,
      debtSettings,
    });

    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setBillPayments(projection.activePayments);
    setDebtPaymentRows(projection.activeDebtPayments);
    setDebts(debtRows || []);
    setTimeline(projection.builtTimeline);
    setData(projection.simulated);

    setLookaheadDays(projection.activeLookahead);
    setAssignmentHorizonMonths(projection.activeAssignmentHorizon);
    setBuffer(projection.activeBuffer);
    setStartingBalance(projection.activeStartingBalance);

    setStrategy(projection.activeStrategy);
    setExtraPayment(projection.activeExtraPayment);
    setTargetDebtName(
      projection.activeStrategy === "velocity"
        ? "Velocity Planner"
        : projection.targetDebt?.name || "—"
    );

    setRequiredCash(projection.requiredCash);
    setBillsDue(projection.billsDue);
    setIncomeExpected(projection.incomeExpected);
    setCashIntelligence(projection.cashIntelligence);

    setLoading(false);
  }, [
    buildProjection,
    cycleMonth,
    getUserId,
    setAssignmentHorizonMonths,
    setBillPayments,
    setBills,
    setBillsDue,
    setBuffer,
    setData,
    setDebtPaymentRows,
    setDebts,
    setExtraPayment,
    setIncomeExpected,
    setCashIntelligence,
    setIncomes,
    setLoading,
    setLookaheadDays,
    setRequiredCash,
    setStartingBalance,
    setStrategy,
    setTargetDebtName,
    setTimeline,
  ]);

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

  return {
    getUserId,
    load,
    loadFundingSources,
  };
}
