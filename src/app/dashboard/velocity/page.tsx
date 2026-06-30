"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildVelocityAdvisorResult,
  buildVelocityInputSnapshot,
  runVelocityEngine,
} from "@/lib/velocity";

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

type VelocitySourceType = "heloc" | "ploc" | "credit_card" | "other";

type VelocitySettings = {
  velocity_source_type: VelocitySourceType;
  credit_limit: string;
  current_balance: string;
  source_apr: string;
  max_utilization_percent: string;
  recovery_months: string;
  emergency_reserve_amount: string;
  allow_super_velocity: boolean;
};

const VELOCITY_SETTINGS_STORAGE_KEY = "beast_velocity_settings_v1";

const DEFAULT_VELOCITY_SETTINGS: VelocitySettings = {
  velocity_source_type: "heloc",
  credit_limit: "",
  current_balance: "",
  source_apr: "",
  max_utilization_percent: "66",
  recovery_months: "6",
  emergency_reserve_amount: "",
  allow_super_velocity: false,
};

function toInputString(value: unknown) {
  if (value == null) return "";
  return String(value);
}

function loadStoredVelocitySettings() {
  try {
    const storedSettings = window.localStorage.getItem(
      VELOCITY_SETTINGS_STORAGE_KEY
    );

    if (!storedSettings) return null;

    return {
      ...DEFAULT_VELOCITY_SETTINGS,
      ...JSON.parse(storedSettings),
    } as VelocitySettings;
  } catch {
    return null;
  }
}

function mapVelocitySettingsRow(row: any): VelocitySettings {
  return {
    velocity_source_type:
      row?.velocity_source_type || DEFAULT_VELOCITY_SETTINGS.velocity_source_type,
    credit_limit: toInputString(row?.credit_limit),
    current_balance: toInputString(row?.current_balance),
    source_apr: toInputString(row?.source_apr),
    max_utilization_percent: toInputString(
      row?.max_utilization_percent ??
        DEFAULT_VELOCITY_SETTINGS.max_utilization_percent
    ),
    recovery_months: toInputString(
      row?.recovery_months ?? DEFAULT_VELOCITY_SETTINGS.recovery_months
    ),
    emergency_reserve_amount: toInputString(row?.emergency_reserve_amount),
    allow_super_velocity: Boolean(row?.allow_super_velocity),
  };
}

function optionalNumber(value: string) {
  if (value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

const strategyLabels: Record<string, string> = {
  avalanche: "Avalanche",
  snowball: "Snowball",
  minimum: "Minimum",
};

const velocityRoadmap = [
  {
    phase: "Phase 1",
    items: [
      "Velocity Lite",
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

function parseAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampToZero(value: number) {
  return Math.max(value, 0);
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatStrategyName(value: string) {
  return strategyLabels[value] || value;
}

function formatRecoveryMonths(value: number | null) {
  if (value == null) return "Not Available";
  const rounded = Math.ceil(value);
  return `${rounded} ${rounded === 1 ? "Month" : "Months"}`;
}

function getRecoveryCompletionDate(monthsRequired: number | null) {
  if (monthsRequired == null) return "Not Available";

  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsRequired));

  return completionDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function VelocityPlannerPage() {
  const [debts, setDebts] = useState<any[]>([]);
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
  const recommendedChunk = clampToZero(
    Math.min(emergencyAdjustedSafeCredit, recoveryBasedLimit, availableCredit)
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
  const riskStatus =
    recommendedChunk <= 0
      ? "Not Available"
      : velocitySettings.allow_super_velocity ||
          emergencyAdjustedSafeCredit <= monthlyRecoveryCapacity
        ? "High Risk"
        : recommendedChunk <= emergencyAdjustedSafeCredit * 0.5 &&
            recoveryMonths <= 6
          ? "Low Risk"
          : "Moderate Risk";
  // TEMP DEV COMPARISON: remove the legacy target sorter after the engine
  // target has been validated against real Velocity page data.
  const legacyRecommendedVelocityTarget = useMemo(() => {
    return activeDebts
      .map((debt) => {
        const balance = Number(debt.balance || 0);
        const apr = Number(debt.interest_rate || 0);
        const monthlyInterestCost = (balance * apr) / 100 / 12;

        return {
          ...debt,
          balance,
          apr,
          monthlyInterestCost,
          opportunityScore:
            apr >= 20 ? "High" : apr >= 10 ? "Moderate" : "Low",
        };
      })
      .sort((a, b) => {
        const aprCompare = b.apr - a.apr;
        if (aprCompare !== 0) return aprCompare;

        const interestCompare = b.monthlyInterestCost - a.monthlyInterestCost;
        if (interestCompare !== 0) return interestCompare;

        return a.balance - b.balance;
      })[0];
  }, [activeDebts]);
  const velocityInputSnapshot = useMemo(() => {
    return buildVelocityInputSnapshot({
      debts: activeDebts,
      velocity_settings: velocitySettings,
      starting_balance: startingBalance,
      cash_buffer: buffer,
      extra_attack: extraAttack,
    });
  }, [activeDebts, buffer, extraAttack, startingBalance, velocitySettings]);
  const velocityEngineResult = useMemo(() => {
    return runVelocityEngine(velocityInputSnapshot);
  }, [velocityInputSnapshot]);
  const velocityAdvisorResult = useMemo(() => {
    return buildVelocityAdvisorResult(velocityEngineResult);
  }, [velocityEngineResult]);
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
  const velocityTargetReason =
    recommendedChunk <= 0
      ? amountAboveSafeLimit > 0
        ? "Guardrail Exceeded"
        : limitingFactor
      : !recommendedVelocityTarget
        ? "No active debt target"
        : "Velocity engine target_debt. Current engine tie breakers favor higher APR, then higher remaining balance.";
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    console.debug("Velocity target comparison", {
      engineTargetId: velocityEngineResult.target_debt?.id,
      engineTargetName: velocityEngineResult.target_debt?.name,
      legacyTargetId: legacyRecommendedVelocityTarget?.id,
      legacyTargetName: legacyRecommendedVelocityTarget?.name,
      matchesLegacy:
        velocityEngineResult.target_debt?.id ===
        legacyRecommendedVelocityTarget?.id,
    });
  }, [legacyRecommendedVelocityTarget, velocityEngineResult.target_debt]);
  const recoveryMonthsRequired =
    recommendedChunk > 0 && monthlyRecoveryCapacity > 0
      ? recommendedChunk / monthlyRecoveryCapacity
      : null;
  const recoveryTimelineStatus =
    recoveryMonthsRequired == null
      ? "Not Available"
      : recoveryMonthsRequired <= recoveryMonths
        ? "Within Guardrails"
        : "Exceeds Guardrails";
  const recoveryCompletionDate =
    getRecoveryCompletionDate(recoveryMonthsRequired);

  const recommendationValues: RecommendationValue[] = [
    {
      label: "Recommended Chunk",
      value: formatMoney(recommendedChunk),
      detail: "Conservative value. Velocity simulations are not enabled yet.",
      alert: recommendedChunk <= 0,
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
      alert: riskStatus === "High Risk" || riskStatus === "Not Available",
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
        velocity_source_type: velocitySettings.velocity_source_type,
        credit_limit: optionalNumber(velocitySettings.credit_limit),
        current_balance: optionalNumber(velocitySettings.current_balance),
        source_apr: optionalNumber(velocitySettings.source_apr),
        max_utilization_percent:
          optionalNumber(velocitySettings.max_utilization_percent) ?? 66,
        recovery_months:
          optionalNumber(velocitySettings.recovery_months) ?? 6,
        emergency_reserve_amount: optionalNumber(
          velocitySettings.emergency_reserve_amount
        ),
        allow_super_velocity: velocitySettings.allow_super_velocity,
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
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <p className="beast-kicker">The Beast v2.0 Foundation</p>
          <h1 className="beast-title">Velocity Planner</h1>
          <p className="beast-subtitle">
            A planning workspace for future Velocity Lite and Full Velocity
            Banking tools. Calculations are not enabled yet.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <h2 className="text-xl font-bold">Velocity Lite</h2>
            <p className="mt-3 text-sm text-[#c7cfdb]">
              Velocity Lite uses available monthly cash flow, debt information,
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
              <h2 className="text-xl font-bold">Future Full Velocity Banking</h2>
              <span className="w-fit rounded border border-yellow-300/50 bg-yellow-950/30 px-3 py-1 text-xs font-semibold text-yellow-100">
                Coming In Future Version
              </span>
            </div>
            <p className="mt-3 text-sm text-[#c7cfdb]">
              Full Velocity Banking will explore HELOC strategies, PLOC
              strategies, credit card velocity, income timing, bill timing
              optimization, daily interest modeling, and average daily balance
              calculations.
            </p>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Velocity Snapshot</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
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
                  <p className="mt-2 text-xs text-[#7f8da3]">{item.detail}</p>
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
                <p className="mt-1 text-sm text-[#7f8da3]">
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
              <p className="mt-2 text-sm text-[#7f8da3]">
                {amountAboveSafeLimit > 0
                  ? `Current balance is ${formatMoney(amountAboveSafeLimit)} above the safe utilization limit.`
                  : "Current balance is within the configured utilization guardrail."}
              </p>
            </div>

            <div className="rounded-lg border border-[#2a3242] p-4">
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
                Current Version:
              </div>
              <p className="mt-1">
                Velocity Lite uses a single Primary Velocity Source.
              </p>
              <p className="mt-3 text-[#9aa7b8]">
                Future versions will support multiple Velocity Sources (HELOCs,
                PLOCs, credit cards, and other revolving credit accounts) with
                automatic source ranking and recommendations.
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
            <h2 className="text-xl font-bold">Velocity Lite Results</h2>
            <p className="mt-1 text-sm text-yellow-200">
              Conservative recommendation only. Velocity Lite payoff simulation
              is not enabled yet.
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
                  <p className="mt-2 text-xs text-[#7f8da3]">{item.detail}</p>
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
                <p className="mt-3 text-xs text-[#7f8da3]">
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
                  recoveryTimelineStatus === "Exceeds Guardrails"
                    ? "text-red-200"
                    : recoveryTimelineStatus === "Not Available"
                      ? "text-yellow-100"
                      : "text-green-200"
                }`}
              >
                {formatRecoveryMonths(recoveryMonthsRequired)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#c7cfdb]">
                <div>Recommended Chunk: {formatMoney(recommendedChunk)}</div>
                <div>
                  Monthly Recovery Capacity:{" "}
                  {formatMoney(monthlyRecoveryCapacity)}
                </div>
                <div>
                  Recovery Goal: {formatRecoveryMonths(recoveryMonths)}
                </div>
                <div>Recovery Complete: {recoveryCompletionDate}</div>
                <div>Status: {recoveryTimelineStatus}</div>
              </div>
              <p className="mt-3 text-xs text-[#7f8da3]">
                The recovery timeline estimates how long it will take to restore
                the Velocity Source balance using current recovery capacity
                assumptions.
              </p>
            </div>
            {["Interest Savings"].map((label) => (
              <div key={label} className="beast-card">
                <div className="text-sm text-[#c7cfdb]">{label}</div>
                <div className="mt-2 text-lg font-bold">Not Yet Available</div>
              </div>
            ))}
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
                        <div className="mt-3 grid gap-2 text-xs text-[#c7cfdb] sm:grid-cols-2">
                          {section.facts.map((fact) => (
                            <div key={`${section.id}-${fact.label}`}>
                              <div className="text-[#7f8da3]">
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
                        <ul className="mt-3 space-y-2 text-xs text-[#7f8da3]">
                          {section.items.map((item, index) => (
                            <li key={`${section.id}-${index}`}>{item}</li>
                          ))}
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
    </main>
  );
}
