import { useCallback, useEffect, useRef } from "react";
import type { CashIntelligenceResult } from "@/lib/cashIntelligence";
import { activeDebtPayments } from "@/lib/financialPaymentHistory";
import { loadCashFlowFinancialData } from "@/lib/financialDataLoaders";
import { createClient } from "@/lib/supabase/client";
import type { FundingSource, PayoffStrategy } from "../cashflowUtils";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

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

  const getUserId = useCallback(async (supabase: SupabaseBrowserClient = createClient()) => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }, []);

  const loadFundingSources = useCallback(async () => {
    const supabase = createClient();
    const userId = await getUserId(supabase);

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
    const userId = await getUserId(supabase);

    if (!userId) {
      setLoading(false);
      return;
    }

    const {
      incomeRows,
      billRows,
      paymentRows,
      debtPaymentRows,
      debtRows,
      cashSettings,
      debtSettings,
      fundingSourceRows,
    } = await loadCashFlowFinancialData(supabase, userId, cycleMonth);

    const currentDebtPayments = activeDebtPayments(debtPaymentRows || []);
    const projection = buildProjection({
      userId,
      cycleMonth,
      incomeRows,
      billRows,
      paymentRows,
      debtPaymentRows: currentDebtPayments,
      debtRows,
      cashSettings,
      debtSettings,
    });

    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setBillPayments(projection.activePayments);
    setDebtPaymentRows(projection.activeDebtPayments);
    setDebts(debtRows || []);
    setFundingSources(fundingSourceRows || []);
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
    setFundingSources,
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
  }, [load]);

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
