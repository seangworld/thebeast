export type ValueSource = "user_entered_official" | "imported" | "beastmoney_estimate" | "default_planning_assumption";
export type RetirementValue = { key: string; value?: number; source: ValueSource; asOf: string; confidence: "high" | "medium" | "low" | "unknown"; assumptions?: string[] };
export type RetirementScenario = { currentAge: RetirementValue; targetAge: RetirementValue; lifeExpectancy: RetirementValue; inflationRate: RetirementValue; preRetirementGrowthRate: RetirementValue; postRetirementGrowthRate: RetirementValue; safeWithdrawalRate: RetirementValue; retirementBalances: RetirementValue[]; annualContributions: RetirementValue[]; retirementIncome: RetirementValue[]; annualExpenses: RetirementValue };
export type RetirementProjection = { yearsToRetirement: number | null; projectedBalance: number | null; projectedAnnualWithdrawal: number | null; warnings: string[]; informational: true };
const numeric = (record: RetirementValue) => typeof record.value === "number" && Number.isFinite(record.value) && record.value >= 0 ? record.value : null;
export function validateRetirementScenario(s: RetirementScenario) {
  const required = [s.currentAge, s.targetAge, s.lifeExpectancy, s.inflationRate, s.preRetirementGrowthRate, s.postRetirementGrowthRate, s.safeWithdrawalRate, s.annualExpenses];
  const errors = required.flatMap((item) => numeric(item) === null ? [`${item.key} requires a non-negative user-reviewed value.`] : []);
  if (numeric(s.targetAge) !== null && numeric(s.currentAge) !== null && numeric(s.targetAge)! <= numeric(s.currentAge)!) errors.push("Target retirement age must be greater than current age.");
  return errors;
}
export function projectRetirementScenario(s: RetirementScenario): RetirementProjection {
  const errors = validateRetirementScenario(s); if (errors.length) return { yearsToRetirement: null, projectedBalance: null, projectedAnnualWithdrawal: null, warnings: [...errors, "Projection is unavailable until missing assumptions are reviewed."], informational: true };
  const years = numeric(s.targetAge)! - numeric(s.currentAge)!; const growth = numeric(s.preRetirementGrowthRate)! / 100;
  const balance = s.retirementBalances.reduce((sum, item) => sum + (numeric(item) ?? 0), 0);
  const contribution = s.annualContributions.reduce((sum, item) => sum + (numeric(item) ?? 0), 0);
  const projectedBalance = Math.round((balance * Math.pow(1 + growth, years) + contribution * ((Math.pow(1 + growth, years) - 1) / Math.max(growth, Number.EPSILON))) * 100) / 100;
  return { yearsToRetirement: years, projectedBalance, projectedAnnualWithdrawal: Math.round(projectedBalance * (numeric(s.safeWithdrawalRate)! / 100) * 100) / 100, warnings: ["Informational projection only; values are not guarantees.", "Official benefit and tax values are never inferred."], informational: true };
}
export function explainRetirementProjection(s: RetirementScenario, projection: RetirementProjection) {
  return { summary: projection.projectedBalance === null ? "Projection unavailable until assumptions are reviewed." : "Informational projection from reviewed assumptions.", missing: validateRetirementScenario(s), limitations: ["Not investment, tax, withdrawal, retirement-date, or benefit-claiming advice.", "Official benefit values are never inferred."] };
}
