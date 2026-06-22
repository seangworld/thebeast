"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const sourceTypes: { value: VelocitySourceType; label: string }[] = [
  { value: "heloc", label: "HELOC" },
  { value: "ploc", label: "PLOC" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

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
    "idle" | "saved" | "error"
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
    setLoading(false);
  }, [getUserId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const storedSettings = window.localStorage.getItem(
        VELOCITY_SETTINGS_STORAGE_KEY
      );

      if (!storedSettings) return;

      setVelocitySettings({
        ...DEFAULT_VELOCITY_SETTINGS,
        ...JSON.parse(storedSettings),
      });
    } catch {
      setSettingsStatus("error");
    }
  }, []);

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
      value: loading ? "Loading..." : strategy,
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

  function saveVelocitySettings() {
    try {
      window.localStorage.setItem(
        VELOCITY_SETTINGS_STORAGE_KEY,
        JSON.stringify(velocitySettings)
      );
      setSettingsStatus("saved");
    } catch {
      setSettingsStatus("error");
    }
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
              <h2 className="text-xl font-bold">Velocity Source</h2>
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
              {settingsStatus === "error" ? (
                <span className="text-sm text-red-200">
                  Settings could not be loaded or saved in this browser.
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
            {[
              "Recommended Target Debt",
              "Interest Savings",
            ].map((label) => (
              <div key={label} className="beast-card">
                <div className="text-sm text-[#c7cfdb]">{label}</div>
                <div className="mt-2 text-lg font-bold">Not Yet Available</div>
              </div>
            ))}
          </div>
        </section>

        <section className="beast-card">
          <h2 className="text-xl font-bold">Full Velocity Roadmap</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Phase 1", "Velocity Lite"],
              ["Phase 2", "Velocity Source Modeling"],
              ["Phase 3", "Cash Flow Timing Optimization"],
              ["Phase 4", "Advanced Velocity Banking"],
            ].map(([phase, title]) => (
              <div key={phase} className="rounded-lg border border-[#2a3242] p-4">
                <div className="text-sm font-semibold text-[#38bdf8]">
                  {phase}
                </div>
                <div className="mt-2 font-bold">{title}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
