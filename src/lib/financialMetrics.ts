export type RecurringFrequency =
  | "weekly"
  | "biweekly"
  | "semi-monthly"
  | "monthly"
  | "annual"
  | string
  | null
  | undefined;

export type RecurringAmountSource = {
  amount?: number | string | null;
  frequency?: RecurringFrequency;
  is_active?: boolean | null;
  is_archived?: boolean | null;
};

export function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getMonthlyFrequencyMultiplier(frequency: RecurringFrequency) {
  const normalizedFrequency = String(frequency || "monthly")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();

  if (
    normalizedFrequency === "weekly" ||
    (normalizedFrequency.includes("weekly") &&
      !normalizedFrequency.includes("bi"))
  ) {
    return 52 / 12;
  }

  if (
    normalizedFrequency === "biweekly" ||
    normalizedFrequency === "bi-weekly" ||
    normalizedFrequency.includes("biweekly") ||
    normalizedFrequency.includes("bi-weekly")
  ) {
    return 26 / 12;
  }

  if (
    normalizedFrequency === "semi-monthly" ||
    normalizedFrequency === "semimonthly" ||
    normalizedFrequency.includes("semi-monthly") ||
    normalizedFrequency.includes("semimonthly") ||
    normalizedFrequency.includes("twice")
  ) {
    return 2;
  }

  if (
    normalizedFrequency === "annual" ||
    normalizedFrequency === "annually" ||
    normalizedFrequency === "yearly" ||
    normalizedFrequency.includes("annual") ||
    normalizedFrequency.includes("year")
  ) {
    return 1 / 12;
  }

  return 1;
}

export function normalizeRecurringAmountToMonthly(
  amount: unknown,
  frequency: RecurringFrequency
) {
  return numberValue(amount) * getMonthlyFrequencyMultiplier(frequency);
}

export function isActiveRecurringSource(source: RecurringAmountSource) {
  return source.is_active !== false && source.is_archived !== true;
}

export function calculateMonthlyRecurringTotal(
  sources: RecurringAmountSource[]
) {
  return sources
    .filter(isActiveRecurringSource)
    .reduce(
      (sum, source) =>
        sum + normalizeRecurringAmountToMonthly(source.amount, source.frequency),
      0
    );
}

export function countActiveRecurringSources(sources: RecurringAmountSource[]) {
  return sources.filter(isActiveRecurringSource).length;
}
