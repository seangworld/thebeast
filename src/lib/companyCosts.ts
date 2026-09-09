export const costKinds = ["recurring", "payment", "credit_funding"] as const;
export type CompanyCost = {
  id: string;
  name: string;
  kind: typeof costKinds[number];
  amount_cents: number | null;
  interval_months: number | null;
  active: boolean;
  paid_on: string | null;
  notes: string;
};

export function parseCompanyCost(value: unknown): CompanyCost {
  if (!value || typeof value !== "object") throw new Error("Invalid cost entry.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)) throw new Error("Invalid entry ID.");
  if (typeof row.name !== "string" || !row.name.trim() || row.name.trim().length > 120) throw new Error("Enter a name of up to 120 characters.");
  if (!costKinds.includes(row.kind as CompanyCost["kind"])) throw new Error("Choose an entry type.");
  if (row.amount_cents !== null && (typeof row.amount_cents !== "number" || !Number.isSafeInteger(row.amount_cents) || row.amount_cents < 0 || row.amount_cents > 100000000)) throw new Error("Enter a valid USD amount, or leave it unknown.");
  if (typeof row.active !== "boolean") throw new Error("Invalid active status.");
  if (typeof row.notes !== "string" || row.notes.length > 1000) throw new Error("Notes must be at most 1,000 characters.");
  if (row.kind === "recurring") {
    if (typeof row.interval_months !== "number" || !Number.isInteger(row.interval_months) || row.interval_months < 1 || row.interval_months > 120) throw new Error("Billing interval must be 1–120 months.");
    if (row.paid_on !== null) throw new Error("Record payments separately from recurring estimates.");
  } else if (row.interval_months !== null) throw new Error("Payments do not have a billing interval.");
  if (row.paid_on !== null && (typeof row.paid_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.paid_on) || !Number.isFinite(Date.parse(row.paid_on)) || new Date(row.paid_on).toISOString().slice(0, 10) !== row.paid_on)) throw new Error("Enter a valid payment date or leave it unknown.");
  return { id: row.id, name: row.name.trim(), kind: row.kind as CompanyCost["kind"], amount_cents: row.amount_cents as number | null, interval_months: row.interval_months as number | null, active: row.active, paid_on: row.paid_on as string | null, notes: row.notes.trim() };
}

export function summarizeCompanyCosts(rows: readonly CompanyCost[]) {
  const recurring = rows.filter((row) => row.kind === "recurring" && row.active);
  const known = recurring.filter((row) => row.amount_cents !== null);
  const monthlyCents = known.length ? Math.round(known.reduce((sum, row) => sum + row.amount_cents! / row.interval_months!, 0)) : null;
  const sumKind = (kind: CompanyCost["kind"]) => {
    const entries = rows.filter((row) => row.kind === kind && row.amount_cents !== null);
    return entries.length ? entries.reduce((sum, row) => sum + row.amount_cents!, 0) : null;
  };
  return { monthlyCents, unknownRecurring: recurring.length - known.length, recordedPaymentsCents: sumKind("payment"), recordedFundingCents: sumKind("credit_funding") };
}
