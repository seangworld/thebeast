"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildVelocityAdvisorResult,
  buildVelocityInputSnapshot,
  runVelocityBankingEngine,
  runVelocityEngine,
} from "@/lib/velocity";
import type { VelocityEngineResult } from "@/lib/velocity";
import { buildCashIntelligence } from "@/lib/cashIntelligence";
import { buildFinancialDecision } from "@/lib/financialDecisionEngine";
import {
  DEFAULT_VELOCITY_SETTINGS,
  VELOCITY_SETTINGS_STORAGE_KEY,
  mapVelocitySettingsRow,
  mergeStoredVelocitySettings,
  velocitySettingsToUpsertPayload,
  type VelocitySettings,
  type VelocitySourceType,
} from "@/lib/velocity/settings";
import {
  formatCurrency as formatMoney,
  formatMonthCount as formatRecoveryMonths,
  formatPercent,
  parseNumber as parseAmount,
} from "@/lib/formatters";
import { getDebtStrategyLabel, isDebtStrategy } from "@/lib/debtStrategies";
import { BeastMoneyShell } from "@/app/dashboard/money/BeastMoneyShell";

type SnapshotValue = {
  label: string;
  value: string;
  detail?: string;
  alert?: boolean;
};

type RecommendationValue = {
  label: string;
  value: string;
  detail?: string;
  alert?: boolean;
};

function loadStoredVelocitySettings() {
  return mergeStoredVelocitySettings(
    window.localStorage.getItem(VELOCITY_SETTINGS_STORAGE_KEY)
  );
}

function logVelocitySettingsError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
}

const sourceTypes: { value: VelocitySourceType; label: string }[] = [
  { value: "heloc", label: "HELOC" },
  { value: "ploc", label: "PLOC" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

const velocityRoadmap = [
  {
    phase: "Phase 1",
    items: [
      "Velocity Planner",
      "Chunk Recommendations",
      "Target Debt Recommendations",
      "Recovery Timeline",
    ],
  },
  {
    phase: "Phase 2",
    items: [
      "Multiple Velocity Sources",
      "Source Ranking Engine",
      "Best Source Recommendation",
      "Source Comparison",
    ],
  },
  {
    phase: "Phase 3",
    items: [
      "Cash Flow Timing Optimization",
      "Due Date Optimization",
      "Payment Timing Recommendations",
    ],
  },
  {
    phase: "Phase 4",
    items: [
      "Advanced Velocity Banking",
      "Daily Interest Modeling",
      "Average Daily Balance Analysis",
      "Full Velocity Simulation Engine",
    ],
  },
];

const advisorSectionOrder = [
  "recommendation",
  "why",
  "expected_result",
  "risks",
  "alternatives",
] as const;

function clampToZero(value: number) {
  return Math.max(value, 0);
}

function formatStrategyName(value: string) {
  return isDebtStrategy(value) ? getDebtStrategyLabel(value) : value;
}

function formatVelocityRiskStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function VelocityPlannerPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [strategy, setStrategy] = useState("—");
  const [extraAttack, setExtraAttack] = useState<number | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [velocitySettings, setVelocitySettings] =
    useState<VelocitySettings>(DEFAULT_VELOCITY_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState<
    "idle" | "saved" | "load_error" | "save_error" | "missing_user"
  >("idle");
  const velocitySnapshotAsOfDate = useMemo(() => new Date().toISOString(), []);

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

    const { data: debtSettings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: cashSettings } = await supabase
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const {
      data: velocitySettingsRow,
      error: velocitySettingsError,
    } = await supabase
      .from("velocity_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setDebts(debtRows || []);
    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setStrategy(debtSettings?.strategy || "—");
    setExtraAttack(
      debtSettings?.extra_payment != null
        ? Number(debtSettings.extra_payment)
        : null
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

    if (velocitySettingsRow) {
      setVelocitySettings(mapVelocitySettingsRow(velocitySettingsRow));
    } else if (!velocitySettingsError) {
      const storedSettings = loadStoredVelocitySettings();

      if (storedSettings) {
        setVelocitySettings(storedSettings);
      }
    } else {
      logVelocitySettingsError(
        "Failed to load Velocity settings from Supabase:",
        velocitySettingsError
      );
      setSettingsStatus("load_error");
    }

    setLoading(false);
  }, [getUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeDebts = useMemo(() => {
    return debts.filter(
      (debt) => !Boolean(debt.is_archived) && Number(debt.balance || 0) > 0
    );
  }, [debts]);

  const totalDebtBalance = useMemo(() => {
    return activeDebts.reduce(
      (sum, debt) => sum + Number(debt.balance || 0),
      0
    );
  }, [activeDebts]);

  const currentMonthlySurplus =
    startingBalance == null || buffer == null ? null : startingBalance - buffer;

  const creditLimit = parseAmount(velocitySettings.credit_limit);
  const currentBalance = parseAmount(velocitySettings.current_balance);
  const maxUtilizationPercent = parseAmount(
    velocitySettings.max_utilization_percent
  );
  const emergencyReserveAmount = parseAmount(
    velocitySettings.emergency_reserve_amount
  );
  const recoveryMonths = clampToZero(
    parseAmount(velocitySettings.recovery_months)
  );
  const availableCredit = clampToZero(creditLimit - currentBalance);
  const velocityUtilizationLimit =
    creditLimit * (maxUtilizationPercent / 100);
  const amountAboveSafeLimit = clampToZero(
    currentBalance - velocityUtilizationLimit
  );
  const remainingSafeCredit = clampToZero(
    velocityUtilizationLimit - currentBalance
  );
  const emergencyAdjustedSafeCredit = clampToZero(
    remainingSafeCredit - emergencyReserveAmount
  );
  const superVelocityCapacity = clampToZero(
    availableCredit - emergencyReserveAmount
  );
  const velocityHealthStatus =
    amountAboveSafeLimit > 0 ? "Guardrail Exceeded" : "Within Guardrails";
  const monthlyRecoveryCapacity =
    currentMonthlySurplus != null && currentMonthlySurplus > 0
      ? currentMonthlySurplus
      : extraAttack != null && extraAttack > 0
        ? extraAttack
        : 0;
  const monthlyRecoverySource =
    currentMonthlySurplus != null && currentMonthlySurplus > 0
      ? "Cash Flow monthly surplus"
      : extraAttack != null && extraAttack > 0
        ? "Debt extra attack setting"
        : "No recovery capacity found";
  const recoveryBasedLimit = clampToZero(
    monthlyRecoveryCapacity * recoveryMonths
  );
  const limitingFactor =
    monthlyRecoveryCapacity <= 0
      ? "No Recovery Capacity"
      : emergencyAdjustedSafeCredit <= 0
        ? "No Safe Credit"
        : recoveryBasedLimit <= emergencyAdjustedSafeCredit &&
            recoveryBasedLimit <= availableCredit
          ? "Recovery Window"
          : emergencyAdjustedSafeCredit <= availableCredit
            ? "Safe Credit Guardrail"
            : "Available Credit";
  const velocityInputSnapshot = useMemo(() => {
    return buildVelocityInputSnapshot({
      as_of_date: velocitySnapshotAsOfDate,
      debts: activeDebts,
      incomes,
      bills,
      velocity_settings: velocitySettings,
      starting_balance: startingBalance,
      cash_buffer: buffer,
      extra_attack: extraAttack,
    });
  }, [
    activeDebts,
    bills,
    buffer,
    extraAttack,
    incomes,
    startingBalance,
    velocitySettings,
    velocitySnapshotAsOfDate,
  ]);
  const cashIntelligence = useMemo(() => {
    return buildCashIntelligence({
      income: incomes,
      bills,
      debtMinimums: activeDebts,
      fundingSources: [
        {
          id: "velocity-ui-credit-source",
          name: "Primary Velocity Source",
          current_balance: currentBalance,
          credit_limit: creditLimit,
          max_utilization_percent: maxUtilizationPercent,
          is_active: true,
        },
      ],
      settings: {
        currentCash: startingBalance ?? 0,
        cashBuffer: buffer ?? 0,
        emergencyReserveAmount,
        lookaheadDays: 30,
      },
      guardrails: {
        minimumCashAfterPayment: emergencyReserveAmount,
        maxSourceUtilizationPercent: maxUtilizationPercent,
      },
    });
  }, [
    activeDebts,
    bills,
    buffer,
    creditLimit,
    currentBalance,
    emergencyReserveAmount,
    incomes,
    maxUtilizationPercent,
    startingBalance,
  ]);
  const financialDecision = useMemo(() => {
    return buildFinancialDecision({
      cashIntelligence,
      debts: activeDebts,
      income: incomes,
      bills,
      fundingSources: [
        {
          id: "velocity-ui-credit-source",
          name: "Primary Velocity Source",
          current_balance: currentBalance,
          credit_limit: creditLimit,
          max_utilization_percent: maxUtilizationPercent,
          is_active: true,
        },
      ],
      strategy: "velocity",
    });
  }, [
    activeDebts,
    bills,
    cashIntelligence,
    creditLimit,
    currentBalance,
    incomes,
    maxUtilizationPercent,
  ]);
  const velocityEngineResult = useMemo<VelocityEngineResult>(() => {
    return runVelocityEngine(velocityInputSnapshot);
  }, [velocityInputSnapshot]);
  const velocityBankingResult = useMemo(() => {
    return runVelocityBankingEngine({
      velocityInputSnapshot,
      cashIntelligence,
      financialDecision,
      velocityEngineResult,
    });
  }, [
    cashIntelligence,
    financialDecision,
    velocityEngineResult,
    velocityInputSnapshot,
  ]);
  const velocityAdvisorResult = useMemo(() => {
    return buildVelocityAdvisorResult(velocityEngineResult);
  }, [velocityEngineResult]);
  const chunkRecommendation = velocityEngineResult.chunk_recommendation;
  const recommendedChunk = clampToZero(
    velocityBankingResult.optimalChunkAmount
  );
  const riskStatus = formatVelocityRiskStatus(
    velocityEngineResult.risk_summary.risk_level
  );
  const recoveryTimeline = velocityBankingResult.recoveryTimeline;
  const interestSavings = velocityEngineResult.interest_savings;
  const recommendedVelocityTarget = useMemo(() => {
    const targetDebt = velocityEngineResult.target_debt;

    if (!targetDebt) return undefined;

    const balance = Number(targetDebt.balance || 0);
    const apr = Number(targetDebt.interest_rate || 0);
    const monthlyInterestCost = (balance * apr) / 100 / 12;

    return {
      ...targetDebt,
      balance,
      apr,
      monthlyInterestCost,
      opportunityScore: apr >= 20 ? "High" : apr >= 10 ? "Moderate" : "Low",
    };
  }, [velocityEngineResult.target_debt]);
  const chunkLimitingConstraint = chunkRecommendation?.constraints.find(
    (constraint) =>
      constraint.id === chunkRecommendation.limiting_constraint_id
  );
  const velocityTargetReason = !recommendedVelocityTarget
    ? "No active debt target"
    : recommendedChunk <= 0
      ? chunkRecommendation?.rationale?.[1] ||
        chunkLimitingConstraint?.detail ||
        "Velocity engine recommends holding cash."
      : chunkRecommendation?.rationale?.[1] ||
        `Limited by ${chunkRecommendation?.limiting_constraint_label || "engine guardrails"}.`;
  const recommendationValues: RecommendationValue[] = [
    {
      label: "Velocity Status",
      value: velocityBankingResult.status === "ready" ? "Ready" : "Wait",
      detail: velocityBankingResult.chunkAdvisor,
      alert: velocityBankingResult.status === "wait",
    },
    {
      label: "Recommended Chunk",
      value: formatMoney(recommendedChunk),
      detail:
        chunkRecommendation?.hold_reason && recommendedChunk <= 0
          ? `Hold reason: ${chunkRecommendation.limiting_constraint_label}.`
          : chunkRecommendation?.limiting_constraint_label
            ? `Limited by ${chunkRecommendation.limiting_constraint_label}.`
            : "Engine-selected payment amount from the current Velocity snapshot.",
      alert: recommendedChunk <= 0,
    },
    {
      label: "Optimal Timing",
      value:
        velocityBankingResult.status === "ready"
          ? "Now"
          : "Next income window",
      detail: velocityBankingResult.optimalChunkTiming,
      alert: velocityBankingResult.status === "wait",
    },
    {
      label: "Funding Source",
      value: velocityBankingResult.fundingSourceSelection?.name || "Not Available",
      detail: velocityBankingResult.fundingSourceSelection
        ? `Safe capacity: ${formatMoney(
            velocityBankingResult.fundingSourceSelection.safeCapacity
          )}.`
        : "No eligible Velocity source found.",
      alert: !velocityBankingResult.fundingSourceSelection,
    },
    {
      label: "Monthly Recovery Capacity",
      value: formatMoney(monthlyRecoveryCapacity),
      detail: `Source: ${monthlyRecoverySource}.`,
      alert: monthlyRecoveryCapacity <= 0,
    },
    {
      label: "Recovery Window",
      value: `${recoveryMonths || 0} Months`,
      detail: `Recovery-based limit: ${formatMoney(recoveryBasedLimit)}.`,
    },
    {
      label: "Safe Credit Available",
      value: formatMoney(emergencyAdjustedSafeCredit),
      detail: `After ${formatMoney(emergencyReserveAmount)} emergency reserve.`,
      alert: emergencyAdjustedSafeCredit <= 0,
    },
    {
      label: "Limiting Factor",
      value: limitingFactor,
    },
    {
      label: "Risk Status",
      value: riskStatus,
      alert: riskStatus === "High",
    },
  ];

  const snapshotValues: SnapshotValue[] = [
    {
      label: "Credit Limit",
      value: formatMoney(creditLimit),
    },
    {
      label: "Current Balance",
      value: formatMoney(currentBalance),
    },
    {
      label: "Available Credit",
      value: formatMoney(availableCredit),
      alert: availableCredit < 0,
    },
    {
      label: "Utilization Limit Amount",
      value: formatMoney(velocityUtilizationLimit),
      detail: `${maxUtilizationPercent || 0}% of credit limit.`,
    },
    {
      label: "Remaining Safe Credit",
      value: formatMoney(remainingSafeCredit),
      alert: remainingSafeCredit < 0,
    },
    {
      label: "Emergency Reserve",
      value: formatMoney(emergencyReserveAmount),
    },
    {
      label: "Current Strategy",
      value: loading ? "Loading..." : formatStrategyName(strategy),
      detail:
        extraAttack == null ? undefined : `Extra attack: ${formatMoney(extraAttack)}`,
    },
    {
      label: "Active Debt Count",
      value: loading ? "Loading..." : String(activeDebts.length),
    },
    {
      label: "Total Debt Balance",
      value: loading ? "Loading..." : formatMoney(totalDebtBalance),
      detail:
        currentMonthlySurplus == null
          ? undefined
          : `Monthly surplus estimate: ${formatMoney(currentMonthlySurplus)}`,
    },
  ];

  function updateVelocitySetting<K extends keyof VelocitySettings>(
    key: K,
    value: VelocitySettings[K]
  ) {
    setVelocitySettings((current) => ({
      ...current,
      [key]: value,
    }));
    setSettingsStatus("idle");
  }

  async function saveVelocitySettings() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) {
      setSettingsStatus("missing_user");
      return;
    }

    const { error } = await supabase.from("velocity_settings").upsert(
      {
        user_id: userId,
        ...velocitySettingsToUpsertPayload(velocitySettings),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      logVelocitySettingsError(
        "Failed to save Velocity settings to Supabase:",
        error
      );
      setSettingsStatus("save_error");
      return;
    }

    try {
      window.localStorage.setItem(
        VELOCITY_SETTINGS_STORAGE_KEY,
        JSON.stringify(velocitySettings)
      );
    } catch {
      // Supabase is the durable source of truth. Browser mirroring is optional.
    }

    setSettingsStatus("saved");
  }

  return (
    <BeastMoneyShell
      title="Velocity Planner"
      description="A planning workspace for Velocity recommendations, recovery timing, and deterministic interest savings."
    >
      <div className="space-y-8">

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <h2 className="text-xl font-bold">Velocity v2</h2>
            <p className="mt-3 text-sm text-[#c7cfdb]">
              Velocity uses available monthly cash flow, debt information,
              and a revolving credit source to accelerate debt payoff while
              maintaining safety guardrails.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-[#9aa7b8] sm:grid-cols-2">
              <li>Cash flow efficiency</li>
              <li>Debt reduction</li>
              <li>Risk management</li>
              <li>Preserving liquidity</li>
            </ul>
          </div>

          <div className="beast-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-xl font-bold">Velocity Planning Boundaries</h2>
              <span className="w-fit rounded border border-yellow-300/50 bg-yellow-950/30 px-3 py-1 text-xs font-semibold text-yellow-100">
                Current Scope
              </span>
            </div>
            <p className="mt-3 text-sm text-[#c7cfdb]">
              Use the current Velocity planner for one primary revolving source,
              cash timing, debt reduction, and liquidity guardrails. Keep other
              source ideas as planning notes until they are ready to model.
            </p>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Velocity Snapshot</h2>
            <p className="mt-1 text-sm text-[#9aa7b8]">
              Live planning values using saved Velocity settings and existing
              Beast debt data.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {snapshotValues.map((item) => (
              <div key={item.label} className="beast-card">
                <div className="text-sm text-[#c7cfdb]">{item.label}</div>
                <div
                  className={`mt-2 break-words text-2xl font-bold ${
                    item.alert ? "text-red-200" : ""
                  }`}
                >
                  {item.value}
                </div>
                {item.detail ? (
                  <p className="mt-2 text-sm text-[#9aa7b8]">{item.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Velocity Health / Guardrail Status
                </h2>
                <p className="mt-1 text-sm text-[#9aa7b8]">
                  A plain-language breakdown of source credit, utilization
                  guardrails, and emergency reserve protection.
                </p>
              </div>
              <span
                className={`w-fit rounded border px-3 py-1 text-xs font-semibold ${
                  amountAboveSafeLimit > 0
                    ? "border-red-300/50 bg-red-950/30 text-red-100"
                    : "border-green-300/50 bg-green-950/30 text-green-100"
                }`}
              >
                {velocityHealthStatus}
              </span>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_2fr]">
            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Guardrail Position</div>
              <div
                className={`mt-2 text-2xl font-bold ${
                  amountAboveSafeLimit > 0 ? "text-red-200" : "text-green-200"
                }`}
              >
                {velocityHealthStatus}
              </div>
              <p className="mt-2 text-sm text-[#9aa7b8]">
                {amountAboveSafeLimit > 0
                  ? `Current balance is ${formatMoney(amountAboveSafeLimit)} above the safe utilization limit.`
                  : "Current balance is within the configured utilization guardrail."}
              </p>
            </div>

            <div className="beast-surface p-4">
              <div className="grid gap-3 text-sm text-[#c7cfdb] sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <div className="text-[#7f8da3]">Credit Limit</div>
                  <div className="mt-1 font-bold">{formatMoney(creditLimit)}</div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">Current Balance</div>
                  <div className="mt-1 font-bold">
                    {formatMoney(currentBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">
                    Available Credit = Credit Limit - Current Balance
                  </div>
                  <div className="mt-1 font-bold">
                    {formatMoney(availableCredit)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">
                    Safe Utilization Limit = Credit Limit x Max Utilization %
                  </div>
                  <div className="mt-1 font-bold">
                    {formatMoney(velocityUtilizationLimit)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">Remaining Safe Credit</div>
                  <div className="mt-1 font-bold">
                    {formatMoney(remainingSafeCredit)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">Above Safe Limit</div>
                  <div
                    className={`mt-1 font-bold ${
                      amountAboveSafeLimit > 0 ? "text-red-200" : ""
                    }`}
                  >
                    {formatMoney(amountAboveSafeLimit)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">Emergency Reserve</div>
                  <div className="mt-1 font-bold">
                    {formatMoney(emergencyReserveAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">
                    Emergency-Protected Credit
                  </div>
                  <div className="mt-1 font-bold">
                    {formatMoney(superVelocityCapacity)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">
                    Guardrail-Protected Credit
                  </div>
                  <div className="mt-1 font-bold">
                    {formatMoney(emergencyAdjustedSafeCredit)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Primary Velocity Source</h2>
              <span className="w-fit rounded border border-[#2a3242] px-3 py-1 text-xs font-semibold text-[#c7cfdb]">
                Planning Settings
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[#c7cfdb]">Source Type</label>
                <select
                  className="beast-input mt-2"
                  value={velocitySettings.velocity_source_type}
                  onChange={(event) =>
                    updateVelocitySetting(
                      "velocity_source_type",
                      event.target.value as VelocitySourceType
                    )
                  }
                >
                  {sourceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">Credit Limit</label>
                <input
                  className="beast-input mt-2"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={velocitySettings.credit_limit}
                  onChange={(event) =>
                    updateVelocitySetting("credit_limit", event.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">Current Balance</label>
                <input
                  className="beast-input mt-2"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={velocitySettings.current_balance}
                  onChange={(event) =>
                    updateVelocitySetting("current_balance", event.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">APR</label>
                <input
                  className="beast-input mt-2"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={velocitySettings.source_apr}
                  onChange={(event) =>
                    updateVelocitySetting("source_apr", event.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-[#2a3242] bg-[#111827]/60 p-4 text-sm text-[#c7cfdb]">
              <div className="font-semibold text-[#e5edf7]">
                Current v2 Scope:
              </div>
              <p className="mt-1">
                Velocity v2 uses a single Primary Velocity Source.
              </p>
              <p className="mt-3 text-[#c7cfdb]">
                Keep additional HELOCs, PLOCs, credit cards, and other revolving
                sources in your planning notes until you are ready to choose one
                primary source for the current model.
              </p>
            </div>
          </div>

          <div className="beast-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Velocity Guardrails</h2>
              <span className="w-fit rounded border border-[#2a3242] px-3 py-1 text-xs font-semibold text-[#c7cfdb]">
                Active Inputs
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[#c7cfdb]">
                  Maximum Utilization
                </label>
                <input
                  className="beast-input mt-2"
                  inputMode="decimal"
                  max="100"
                  min="0"
                  type="number"
                  value={velocitySettings.max_utilization_percent}
                  onChange={(event) =>
                    updateVelocitySetting(
                      "max_utilization_percent",
                      event.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">Recovery Window</label>
                <input
                  className="beast-input mt-2"
                  inputMode="numeric"
                  min="1"
                  type="number"
                  value={velocitySettings.recovery_months}
                  onChange={(event) =>
                    updateVelocitySetting("recovery_months", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">
                  Emergency Reserve
                </label>
                <input
                  className="beast-input mt-2"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={velocitySettings.emergency_reserve_amount}
                  onChange={(event) =>
                    updateVelocitySetting(
                      "emergency_reserve_amount",
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                />
              </div>
              <label className="flex min-h-[44px] items-center gap-3 text-sm text-[#c7cfdb]">
                <input
                  type="checkbox"
                  checked={velocitySettings.allow_super_velocity}
                  onChange={(event) =>
                    updateVelocitySetting(
                      "allow_super_velocity",
                      event.target.checked
                    )
                  }
                />
                Allow Super Velocity
              </label>
            </div>

            <div className="mt-5 rounded-lg border border-[#2a3242] p-4">
              <div className="grid gap-3 text-sm text-[#c7cfdb] sm:grid-cols-3">
                <div>
                  <div className="text-[#7f8da3]">Available Credit</div>
                  <div className="mt-1 font-bold">{formatMoney(availableCredit)}</div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">Utilization Limit</div>
                  <div className="mt-1 font-bold">
                    {formatMoney(velocityUtilizationLimit)}
                  </div>
                </div>
                <div>
                  <div className="text-[#7f8da3]">Remaining Safe Credit</div>
                  <div
                    className={`mt-1 font-bold ${
                      remainingSafeCredit < 0 ? "text-red-200" : ""
                    }`}
                  >
                    {formatMoney(remainingSafeCredit)}
                  </div>
                </div>
              </div>
            </div>

            {velocitySettings.allow_super_velocity ? (
              <div className="mt-4 rounded-lg border border-red-300/40 bg-red-950/30 p-4 text-sm font-semibold text-red-100">
                Super Velocity increases risk by allowing use of nearly all
                available revolving credit. Proceed with caution.
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="beast-button-primary w-fit"
                onClick={saveVelocitySettings}
              >
                Save Velocity Settings
              </button>
              {settingsStatus === "saved" ? (
                <span className="text-sm text-green-200">Settings saved.</span>
              ) : null}
              {settingsStatus === "load_error" ? (
                <span className="text-sm text-red-200">
                  Settings could not be loaded from your account.
                </span>
              ) : null}
              {settingsStatus === "save_error" ? (
                <span className="text-sm text-red-200">
                  Settings could not be saved to your account. Please try again.
                </span>
              ) : null}
              {settingsStatus === "missing_user" ? (
                <span className="text-sm text-red-200">
                  Sign in again before saving Velocity settings.
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Velocity Results</h2>
            <p className="mt-1 text-sm text-yellow-200">
              Deterministic recommendations using saved guardrails, cash flow,
              debt details, and the current Velocity engine.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {recommendationValues.map((item) => (
              <div key={item.label} className="beast-card">
                <div className="text-sm text-[#c7cfdb]">{item.label}</div>
                <div
                  className={`mt-2 break-words text-2xl font-bold ${
                    item.alert ? "text-red-200" : ""
                  }`}
                >
                  {item.value}
                </div>
                {item.detail ? (
                  <p className="mt-2 text-sm text-[#9aa7b8]">{item.detail}</p>
                ) : null}
              </div>
            ))}
            {velocitySettings.allow_super_velocity ? (
              <div className="beast-card border-red-300/40 bg-red-950/20">
                <div className="text-sm text-red-100">
                  Super Velocity Capacity
                </div>
                <div className="mt-2 break-words text-2xl font-bold text-red-100">
                  {formatMoney(superVelocityCapacity)}
                </div>
                <p className="mt-2 text-xs text-red-100/80">
                  Experimental capacity based on available credit after
                  emergency reserve. This is not used for the recommended chunk.
                </p>
              </div>
            ) : null}
            {recommendedChunk > 0 && recommendedVelocityTarget ? (
              <div className="beast-card">
                <div className="text-sm text-[#c7cfdb]">
                  Recommended Velocity Target
                </div>
                <div className="mt-2 break-words text-2xl font-bold">
                  {recommendedVelocityTarget.name || "Unnamed Debt"}
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#c7cfdb]">
                  <div>
                    APR: {formatPercent(recommendedVelocityTarget.apr)}
                  </div>
                  <div>
                    Balance: {formatMoney(recommendedVelocityTarget.balance)}
                  </div>
                  <div>
                    Minimum Payment:{" "}
                    {formatMoney(
                      Number(recommendedVelocityTarget.minimum_payment || 0)
                    )}
                  </div>
                  <div>
                    Monthly Interest Cost: ~
                    {formatMoney(recommendedVelocityTarget.monthlyInterestCost)}
                  </div>
                  <div>
                    Opportunity Score:{" "}
                    {recommendedVelocityTarget.opportunityScore}
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#9aa7b8]">
                  Reason: {velocityTargetReason}
                </p>
              </div>
            ) : (
              <div className="beast-card border-yellow-300/40 bg-yellow-950/20">
                <div className="text-sm text-yellow-100">
                  Recommended Velocity Target
                </div>
                <div className="mt-2 break-words text-2xl font-bold text-yellow-100">
                  Velocity Action Not Recommended
                </div>
                <p className="mt-3 text-sm text-yellow-100/80">
                  Reason: {velocityTargetReason}
                </p>
              </div>
            )}
            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Recovery Timeline</div>
              <div
                className={`mt-2 break-words text-2xl font-bold ${
                  recoveryTimeline?.status === "Exceeds Guardrails"
                    ? "text-red-200"
                    : recoveryTimeline?.status === "Not Available"
                      ? "text-yellow-100"
                      : "text-green-200"
                }`}
              >
                {formatRecoveryMonths(recoveryTimeline?.months_required ?? null)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#c7cfdb]">
                <div>Recommended Chunk: {formatMoney(recommendedChunk)}</div>
                <div>
                  Monthly Recovery Capacity:{" "}
                  {formatMoney(recoveryTimeline?.monthly_recovery_capacity ?? 0)}
                </div>
                <div>
                  Recovery Goal:{" "}
                  {formatRecoveryMonths(recoveryTimeline?.recovery_months ?? 0)}
                </div>
                <div>
                  Recovery Complete:{" "}
                  {recoveryTimeline?.completion_date || "Not Available"}
                </div>
                <div>Status: {recoveryTimeline?.status || "Not Available"}</div>
              </div>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                The recovery timeline estimates how long it will take to restore
                the Velocity Source balance using current recovery capacity
                assumptions.
              </p>
            </div>
            <div className="beast-card">
              <div className="text-sm text-[#c7cfdb]">Interest Savings</div>
              <div className="mt-2 break-words text-2xl font-bold">
                {formatMoney(interestSavings?.net_interest_saved || 0)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#c7cfdb]">
                <div>
                  Gross Debt Interest Saved:{" "}
                  {formatMoney(interestSavings?.gross_interest_saved || 0)}
                </div>
                <div>
                  Velocity Source Cost:{" "}
                  {formatMoney(
                    interestSavings?.velocity_source_interest_cost || 0
                  )}
                </div>
                <div>
                  Minimum-Only Interest:{" "}
                  {formatMoney(interestSavings?.baseline_total_interest || 0)}
                </div>
                <div>
                  Velocity Interest:{" "}
                  {formatMoney(interestSavings?.velocity_total_interest || 0)}
                </div>
                <div>
                  Months Compared: {interestSavings?.months_compared || 0}
                </div>
              </div>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Net savings compare minimum-only debt payoff against the
                Velocity strategy after estimated source interest cost.
              </p>
            </div>
            <div className="beast-card xl:col-span-2">
              <div className="text-sm text-[#c7cfdb]">Chunk Calendar</div>
              <div className="mt-4 grid gap-3">
                {velocityBankingResult.chunkCalendar.map((item) => (
                  <div
                    key={`${item.type}-${item.month}-${item.label}`}
                    className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {item.label}
                        </div>
                        <div className="text-xs text-[#7f8da3]">
                          {item.dateLabel}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-green-200">
                        {formatMoney(item.amount)}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[#9aa7b8]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="beast-card xl:col-span-3">
              <div className="text-sm text-[#c7cfdb]">Velocity Payment Schedule</div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-[#7f8da3]">
                    <tr>
                      <th className="py-2 pr-4">Month</th>
                      <th className="py-2 pr-4">Target</th>
                      <th className="py-2 pr-4">Payment</th>
                      <th className="py-2 pr-4">Source Recovery</th>
                      <th className="py-2 pr-4">Remaining Debt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a3242]">
                    {velocityBankingResult.paymentSchedule.slice(0, 6).map((row) => (
                      <tr key={`${row.month}-${row.target}`}>
                        <td className="py-3 pr-4">Month {row.month}</td>
                        <td className="py-3 pr-4">{row.target}</td>
                        <td className="py-3 pr-4">{formatMoney(row.total_payment)}</td>
                        <td className="py-3 pr-4">
                          {formatMoney(row.velocity_source_payment || 0)}
                        </td>
                        <td className="py-3 pr-4">
                          {formatMoney(row.remaining_debt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[#9aa7b8]">
                Showing the first six projected months from the unified strategy schedule.
              </p>
            </div>
            <div className="beast-card sm:col-span-2 xl:col-span-3">
              <div className="flex flex-col gap-1 border-b border-[#2a3242] pb-4">
                <div className="text-sm text-[#38bdf8]">Read-only</div>
                <h3 className="text-xl font-bold">Beast Advisor</h3>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {advisorSectionOrder.map((sectionId) => {
                  const section = velocityAdvisorResult.sections[sectionId];

                  return (
                    <div
                      key={section.id}
                      className="rounded-lg border border-[#2a3242] p-4"
                    >
                      <div className="text-sm font-semibold text-[#e5e7eb]">
                        {section.title}
                      </div>
                      <p className="mt-2 text-sm text-[#c7cfdb]">
                        {section.summary}
                      </p>
                      {section.facts.length > 0 ? (
                        <div className="mt-3 grid gap-2 text-sm text-[#c7cfdb] sm:grid-cols-2">
                          {section.facts.map((fact) => (
                            <div key={`${section.id}-${fact.label}`}>
                              <div className="text-[#9aa7b8]">
                                {fact.label}
                              </div>
                              <div className="mt-1 font-semibold text-[#e5e7eb]">
                                {fact.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {section.items.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-[#9aa7b8]">
                          {section.items.map((item, index) => {
                            const separatorIndex = item.indexOf(": ");
                            const label =
                              separatorIndex > 0
                                ? item.slice(0, separatorIndex)
                                : null;
                            const value =
                              separatorIndex > 0
                                ? item.slice(separatorIndex + 2)
                                : item;

                            return (
                              <li key={`${section.id}-${index}`}>
                                {label ? (
                                  <>
                                    <span className="font-semibold text-[#e5e7eb]">
                                      {label}:
                                    </span>{" "}
                                    <span>{value}</span>
                                  </>
                                ) : (
                                  item
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="beast-card">
          <h2 className="text-xl font-bold">Full Velocity Roadmap</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {velocityRoadmap.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-lg border border-[#2a3242] p-4"
              >
                <div className="text-sm font-semibold text-[#38bdf8]">
                  {phase.phase}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-[#c7cfdb]">
                  {phase.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </BeastMoneyShell>
  );
}
