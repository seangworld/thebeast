import { normalizePaymentConfiguration } from "./paymentConfiguration";
export type PaycheckMove = { kind: "bill" | "debt"; id: string; date: string };
export function projectPaycheckDraft(baseBuckets: any[], baseBills: any[], baseDebts: any[], moves: PaycheckMove[], fundingSources: { id: string; type: string }[]) {
  const bills = new Map<string, any>();
  const debts = new Map<string, any>();
  for (const item of baseBills) bills.set(item.id, { ...item });
  for (const item of baseDebts) debts.set(item.id, { ...item });
  for (const bucket of baseBuckets) {
    for (const item of bucket.assignedBills) bills.set(item.id, { ...item });
    for (const item of bucket.assignedDebts) debts.set(item.id, { ...item });
  }
  const changes = new Map<string, PaycheckMove>();
  for (const move of moves) {
    const item = (move.kind === "bill" ? bills : debts).get(move.id);
    if (!item) continue;
    changes.set(`${move.kind}:${move.id}`, move);
    item.assigned_income_date = move.date;
  }
  function funded(item: any) {
    const config = normalizePaymentConfiguration(item);
    if (!config.fundingAccountId || config.fundingAccountType === "income_pot") return true;
    const source = fundingSources.find(source => source.id === config.fundingAccountId);
    return !source || !["credit_card", "heloc", "ploc"].includes(source.type);
  }
  const billAmount = (item: any) => Number(item.remaining ?? item.amount ?? 0);
  const debtAmount = (item: any) => Number(item.minimum_payment ?? 0);
  const buckets = baseBuckets.map(bucket => {
    const assignedBills = Array.from(bills.values()).filter(item => item.assigned_income_date === bucket.date);
    const assignedDebts = Array.from(debts.values()).filter(item => item.assigned_income_date === bucket.date);
    const billsTotal = assignedBills.filter(funded).reduce((sum, item) => sum + billAmount(item), 0);
    const debtMinimumsTotal = assignedDebts.filter(funded).reduce((sum, item) => sum + debtAmount(item), 0);
    const assignedTotal = billsTotal + debtMinimumsTotal;
    const availableToAssign = Number(bucket.amount || 0) - assignedTotal;
    const buffer = Number(bucket.availableToAssign || 0) - Number(bucket.safeAfterBuffer || 0);
    return { ...bucket, assignedBills, assignedDebts, billsTotal, debtMinimumsTotal, assignedTotal, availableToAssign, safeAfterBuffer: availableToAssign - buffer };
  });
  const unassignedBills = Array.from(bills.values()).filter(item => !item.assigned_income_date);
  const unassignedDebts = Array.from(debts.values()).filter(item => !item.assigned_income_date);
  return { buckets, unassignedBills, unassignedDebts,
    unassignedTotal: unassignedBills.reduce((sum, item) => sum + billAmount(item), 0) + unassignedDebts.reduce((sum, item) => sum + debtAmount(item), 0), changes: Array.from(changes.values()) };
}
