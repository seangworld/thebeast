export const DEBT_STRATEGIES = [
  {
    value: "minimum",
    label: "Minimum",
    description: "Minimum payments only. No extra attack or rollover.",
    usesExtraPayment: false,
  },
  {
    value: "snowball",
    label: "Snowball",
    description: "Fastest emotional momentum and early wins.",
    usesExtraPayment: true,
  },
  {
    value: "avalanche",
    label: "Avalanche",
    description: "Lowest projected interest paid.",
    usesExtraPayment: true,
  },
  {
    value: "velocity",
    label: "Velocity",
    description: "Velocity recommendations are configured in the Velocity Planner.",
    usesExtraPayment: true,
    configurationPath: "/dashboard/money/velocity",
  },
] as const;

export type DebtStrategy = (typeof DEBT_STRATEGIES)[number]["value"];

export type DebtStrategyOption = (typeof DEBT_STRATEGIES)[number];

export const DEFAULT_DEBT_STRATEGY: DebtStrategy = "snowball";

export function isDebtStrategy(value: unknown): value is DebtStrategy {
  return DEBT_STRATEGIES.some((strategy) => strategy.value === value);
}

export function normalizeDebtStrategy(value: unknown): DebtStrategy {
  return isDebtStrategy(value) ? value : DEFAULT_DEBT_STRATEGY;
}

export function getDebtStrategyOption(value: unknown): DebtStrategyOption {
  return (
    DEBT_STRATEGIES.find((strategy) => strategy.value === value) ||
    DEBT_STRATEGIES.find((strategy) => strategy.value === DEFAULT_DEBT_STRATEGY)!
  );
}

export function getDebtStrategyLabel(value: unknown) {
  return getDebtStrategyOption(value).label;
}

export function getDebtStrategyDescription(value: unknown) {
  return getDebtStrategyOption(value).description;
}
