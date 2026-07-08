export type FinancialExplanationEntity = {
  id?: string;
  name: string;
  type: "debt" | "bill" | "income" | "funding_source" | "cash" | "forecast" | "strategy";
};

export type FinancialExplanation = {
  recommendation: string;
  reason: string;
  impact: string;
  risks: string[];
  assumptions: string[];
  affectedEntities: FinancialExplanationEntity[];
};

export type FinancialExplanationInput = {
  recommendation: string;
  reason: string;
  impact: string;
  risks?: string[];
  assumptions?: string[];
  affectedEntities?: FinancialExplanationEntity[];
};

export function buildFinancialExplanation(
  input: FinancialExplanationInput
): FinancialExplanation {
  return {
    recommendation: input.recommendation,
    reason: input.reason,
    impact: input.impact,
    risks: input.risks?.filter(Boolean) || [],
    assumptions: input.assumptions?.filter(Boolean) || [],
    affectedEntities: input.affectedEntities || [],
  };
}

export function getPrimaryRisk(explanation: FinancialExplanation) {
  return explanation.risks[0] || "No major risk detected from current records.";
}

export function summarizeExplanation(explanation: FinancialExplanation) {
  return `${explanation.recommendation} ${explanation.reason} ${explanation.impact}`.trim();
}
