import type { RuntimeContext, StructuredKnowledgeProposal } from "./digitalStaffRuntime/types";
import { normalizeRecurringAmountToMonthly } from "./financialMetrics";

const cashKeys = ["safeToSpendToday","projectedAvailableCash","requiredCashNext30Days","billsDueNext30Days","incomeExpectedNext30Days","monthlyIncome","monthlyBills","monthlyDebtMinimums","monthlyAvailableCash","projectedCashBalance","currentCash","cashBuffer","plannedExtraDebtPayment"] as const;
const factKeys = ["recurringIncomeExcludingDisputed","supportedExtraPayment","requestedExtraPayment"] as const;
const strategyKeys = ["extraMonthly","totalInterest","totalPaid","monthsToPayoff"] as const;
type Strategy = "minimum" | "snowball" | "avalanche";
export type MoneyEvidenceSelector = typeof cashKeys[number] | `financialAssessment.facts.${typeof factKeys[number]}` | "financialAssessment.facts.lowestProjectedBalance.balance" | `financialAssessment.debtComparisons.${Strategy}.${typeof strategyKeys[number]}`;
export type MoneyEvidenceEntry = { selector: MoneyEvidenceSelector; value: number | null; canonicalPath?: string };
export type MoneyEvidenceCatalog = { version: "money-evidence-v2"; snapshotId: string; entries: MoneyEvidenceEntry[]; conflicts: string[]; boundary: string };
const snapshots = new WeakMap<RuntimeContext, { source: string; snapshotId: string }>();

/** Selectors are emitted only from explicit canonical fields, never user-defined keys/expressions. */
export function moneyEvidenceCatalog(context: RuntimeContext): MoneyEvidenceCatalog {
  const source = JSON.stringify([context.ownerId,context.contextBoundary,context.structuredRecords]);
  let snapshot = snapshots.get(context);
  if (!snapshot || snapshot.source !== source) { snapshot = {source,snapshotId:globalThis.crypto.randomUUID()}; snapshots.set(context,snapshot); }
  const summary = context.structuredRecords.find(r=>r.domain === "beastmoney.money-coach:canonical-affordability")?.record as Record<string,unknown> | undefined;
  const assessment = summary?.financialAssessment as Record<string,unknown> | undefined;
  const facts = assessment?.facts as Record<string,unknown> | undefined;
  const entries: MoneyEvidenceEntry[] = [];
  const add = (selector: MoneyEvidenceSelector, value: unknown, canonicalPath: string = selector) => { if (value === null || typeof value === "number" && Number.isFinite(value)) entries.push({selector,value,...(canonicalPath!==selector?{canonicalPath}:{})}); };
  for (const key of cashKeys) if (summary && Object.hasOwn(summary,key)) add(key,summary[key]);
  for (const key of factKeys) if (facts && Object.hasOwn(facts,key)) add(`financialAssessment.facts.${key}`,facts[key]);
  const low = facts?.lowestProjectedBalance as {balance?:unknown} | null | undefined;
  if (low) add("financialAssessment.facts.lowestProjectedBalance.balance",low.balance);
  for (const strategy of ["minimum","snowball","avalanche"] as const) {
    const comparisons = assessment?.debtComparisons;
    const index = Array.isArray(comparisons) ? comparisons.findIndex(c=>c.strategy===strategy) : -1;
    if (Array.isArray(comparisons) && index >= 0) for (const key of strategyKeys) add(`financialAssessment.debtComparisons.${strategy}.${key}`,comparisons[index][key],`financialAssessment.debtComparisons.${index}.${key}`);
  }
  const conflicts: string[] = [];
  for (const [kind,count,key] of [["income","activeIncomeCount","monthlyIncome"],["bill","activeBillCount","monthlyBills"]] as const) {
    const raw=context.structuredRecords.filter(r=>r.domain===`beastmoney.money-coach:${kind}`).map(r=>r.record as Record<string,unknown>);
    if (raw.length && raw.length===summary?.[count] && assessment?.cashVerified===true) {
      const total=raw.reduce((n,r)=>n+normalizeRecurringAmountToMonthly(r.amount,String(r.frequency||"")),0);
      if (typeof summary[key]==="number" && Math.abs(total-(summary[key] as number))>.011) conflicts.push(`Current ${kind} source rows conflict with canonical ${key}.`);
    }
  }
  return {version:"money-evidence-v2",snapshotId:snapshot.snapshotId,entries,conflicts,boundary:"Copy only an emitted selector and its exact value. Null means unknown, never zero. These are saved-record computations, not independent bank verification or authorization. No arbitrary expressions, aliases, bracket selectors, or invented calculations. Source conflicts block a current financial recommendation."};
}

export const moneyPriorityFields = ["priority","goal","title","value"] as const;
/** Existing Money persistence supports a priority in beast_goals only, never debt/income writes. */
export function supportedMoneyProposal(proposal: StructuredKnowledgeProposal) {
  return ["money","goal","preference"].includes(proposal.domain) && ["priority","goal","preference"].includes(proposal.entityType)
    && Object.keys(proposal.fields).length>0 && Object.entries(proposal.fields).every(([key,value])=>moneyPriorityFields.includes(key as typeof moneyPriorityFields[number]) && typeof value==="string" && value.trim().length>0)
    && ["create","update"].includes(proposal.proposedAction);
}
