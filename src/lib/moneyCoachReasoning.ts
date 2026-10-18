import { moneyEvidenceCatalog } from "./moneyCoachEvidence";
import type { RuntimeContext } from "./digitalStaffRuntime/types";

export type MoneyCoachReasoning = {
  snapshotId: string;
  objective: string;
  status: "supported" | "conditional" | "insufficient_evidence";
  claims: Array<{ path: string; value: number | null; meaning: string }>;
  alternatives: string[];
  uncertainties: string[];
};
export const moneyCoachReasoningSchema = { anyOf: [{ type: "null" }, {
  type: "object", additionalProperties: false, required: ["objective","status","claims","alternatives","uncertainties"], properties: {
    objective: { type: "string" }, status: { type: "string", enum: ["supported","conditional","insufficient_evidence"] },
    claims: { type: "array", items: { type: "object", additionalProperties: false, required: ["path","value","meaning"], properties: { path: {type:"string"}, value: {anyOf:[{type:"number"},{type:"null"}]}, meaning: {type:"string"} } } },
    alternatives: {type:"array",items:{type:"string"}}, uncertainties: {type:"array",items:{type:"string"}},
  },
}]} as const;

/** Runtime schema is constrained by the exact machine-generated current catalog. */
export function moneyCoachReasoningSchemaFor(context: RuntimeContext) {
  const catalog=moneyEvidenceCatalog(context);
  const object=moneyCoachReasoningSchema.anyOf[1];
  return {anyOf:[{type:"null"},{...object,required:[...object.required,"snapshotId"],properties:{...object.properties,snapshotId:{type:"string",enum:[catalog.snapshotId]},claims:{type:"array",items:{...object.properties.claims.items,properties:{...object.properties.claims.items.properties,path:{type:"string",enum:catalog.entries.length?catalog.entries.map(e=>e.selector):["no_supported_numeric_evidence"]}}}}}}]};
}

/** External retrieval gets public subject/year only; personal application stays private. */
export function moneyCoachResearchQuery(message: string) {
  const year = message.match(/\b20\d{2}\b/)?.[0] || "the current year";
  const subject = /\b(?:irs|ira|401k|401\(k\)|tax|contribution|deduction)\b/i.test(message)
    ? "IRS retirement contribution limits and tax eligibility rules"
    : /\b(?:tsp|opm|pension)\b/i.test(message) ? "TSP and OPM retirement plan rules"
      : /\b(?:ssa|social security|benefit)\b/i.test(message) ? "SSA retirement benefits eligibility rules"
        : "CFPB consumer budgeting, credit and debt repayment rules";
  return `Current official ${subject} for ${year}. Explain conditions and limitations; no personal account lookup.`;
}

/** Numeric grounding is a deterministic safeguard, not independent judgment grading. */
export function verifyMoneyCoachReasoning(context: RuntimeContext, reasoning: MoneyCoachReasoning | null | undefined, intent?: string) {
  const failures: string[] = [];
  const summary = context.structuredRecords.find(r=>r.domain === "beastmoney.money-coach:canonical-affordability")?.record as Record<string,unknown> | undefined;
  if (!reasoning) {
    if (summary && (["answer","answer_previous_question","correction"].includes(intent || "") || !intent && /\b(?:afford|compare|payoff|repay|payment|shortfall|retire|recommend|strategy|income|cash|bills?|debt|budget|saving|balance)\b/i.test(context.message.text))) failures.push("Financial judgment omitted its evidence assessment.");
    return failures;
  }
  if (!["supported","conditional","insufficient_evidence"].includes(reasoning.status) || !Array.isArray(reasoning.claims) || reasoning.claims.length > 24 || !Array.isArray(reasoning.alternatives) || !Array.isArray(reasoning.uncertainties)) return ["Malformed financial evidence assessment."];
  const catalog = moneyEvidenceCatalog(context);
  if (reasoning.snapshotId !== catalog.snapshotId) failures.push("Financial evidence snapshot is missing or stale.");
  if (catalog.conflicts.length) failures.push(...catalog.conflicts);
  for (const claim of reasoning.claims) {
    if (!claim || typeof claim !== "object") { failures.push("Malformed financial numeric claim."); continue; }
    const entry=catalog.entries.find(e=>e.selector===claim.path);
    if (!entry) { failures.push("Rejected unsupported financial evidence path."); continue; }
    if (!(claim.value===null || typeof claim.value==="number" && Number.isFinite(claim.value)) || entry.value!==claim.value) failures.push("Financial numeric claim does not match current canonical evidence.");
  }
  const assessment=summary?.financialAssessment as {cashVerified?:boolean} | undefined;
  if (reasoning.status === "supported" && (!summary || !assessment?.cashVerified || !reasoning.claims.length || context.contextBoundary?.completeness.canonicalRecordsComplete === false)) failures.push("Incomplete or disputed financial evidence cannot support a verified recommendation.");
  if (reasoning.status !== "supported" && !reasoning.uncertainties.length) failures.push("Conditional financial conclusions must state their missing facts or assumptions.");
  return failures;
}
