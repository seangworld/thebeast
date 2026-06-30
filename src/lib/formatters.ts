export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseOptionalNumber(value: number | string | null | undefined) {
  if (value == null || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value: number | null | undefined) {
  const numericValue = Number(value);

  return numericValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNullableCurrency(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  return formatCurrency(Number(value));
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function formatDate(value: unknown) {
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value || "");
}

export function addMonthsClamped(date: Date, months: number) {
  const originalDay = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatMonthCount(value: number | null | undefined) {
  if (value == null) return "Not Available";
  const rounded = Math.ceil(value);
  return `${rounded} ${rounded === 1 ? "Month" : "Months"}`;
}
