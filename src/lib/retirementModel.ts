export type ValueSource = "user_entered_official" | "imported" | "beastmoney_estimate" | "default_planning_assumption";
export type RetirementValue = { key: string; value?: number; source: ValueSource; asOf: string; confidence: "high" | "medium" | "low" | "unknown"; assumptions?: string[]; limitations?: string[]; startAge?: number; endAge?: number };
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

export type RetirementTimelineYear = {
  age: number;
  yearOffset: number;
  income: { label: string; amount: number; source: ValueSource; confidence: RetirementValue["confidence"]; limitations: string[] }[];
  expenses: number;
  incomeTotal: number;
  annualGap: number;
  cumulativeGap: number;
  incomplete: boolean;
};
export type RetirementTimeline = { years: RetirementTimelineYear[]; warnings: string[]; calculationVersion: "bm35-v1"; reproducibilityKey: string; informational: true };
export type RetirementReadiness = { label: "incomplete" | "documented"; factors: { name: string; state: "complete" | "missing" | "review_needed"; explanation: string }[]; limitations: string[] };
const money = (value: number) => Math.round(value * 100) / 100;
const isReviewed = (value: RetirementValue) => value.source !== "default_planning_assumption" && value.confidence !== "unknown";

/** Pure BM-35 annual projection. It is an educational model, never a withdrawal or retirement-date recommendation. */
export function createRetirementTimeline(s: RetirementScenario): RetirementTimeline {
  const errors = validateRetirementScenario(s);
  if (errors.length) return { years: [], warnings: [...errors, "Timeline is unavailable until required assumptions are reviewed."], calculationVersion: "bm35-v1", reproducibilityKey: "incomplete", informational: true };
  const targetAge = numeric(s.targetAge)!;
  const horizon = numeric(s.lifeExpectancy)! - targetAge;
  if (horizon <= 0) return { years: [], warnings: ["Life expectancy must be greater than target retirement age."], calculationVersion: "bm35-v1", reproducibilityKey: "invalid-horizon", informational: true };
  const projection = projectRetirementScenario(s);
  const inflation = numeric(s.inflationRate)! / 100;
  const annualExpenses = numeric(s.annualExpenses)!;
  const values = [...s.retirementIncome];
  const explicitWithdrawal = s.safeWithdrawalRate.source !== "default_planning_assumption" && projection.projectedAnnualWithdrawal !== null
    ? { key: "account_supported_income", value: projection.projectedAnnualWithdrawal, source: s.safeWithdrawalRate.source, asOf: s.safeWithdrawalRate.asOf, confidence: s.safeWithdrawalRate.confidence, assumptions: ["Shown from the user-reviewed withdrawal assumption; it is not a withdrawal recommendation."], limitations: ["Account-supported income is an assumption, not a guarantee."], startAge: targetAge } satisfies RetirementValue
    : null;
  if (explicitWithdrawal) values.push(explicitWithdrawal);
  let cumulativeGap = 0;
  const years = Array.from({ length: horizon + 1 }, (_, yearOffset) => {
    const age = targetAge + yearOffset;
    const income = values.filter((value) => (value.startAge ?? targetAge) <= age && (value.endAge ?? Infinity) >= age).flatMap((value) => {
      const amount = numeric(value);
      return amount === null ? [] : [{ label: value.key, amount: money(amount), source: value.source, confidence: value.confidence, limitations: value.limitations ?? [] }];
    });
    const expenses = money(annualExpenses * Math.pow(1 + inflation, yearOffset));
    const incomeTotal = money(income.reduce((sum, item) => sum + item.amount, 0));
    const annualGap = money(incomeTotal - expenses);
    cumulativeGap = money(cumulativeGap + annualGap);
    return { age, yearOffset, income, expenses, incomeTotal, annualGap, cumulativeGap, incomplete: values.some((value) => numeric(value) === null) };
  });
  const sourceSignature = JSON.stringify({ targetAge, horizon, inflation, annualExpenses, values: values.map(({ key, value, source, asOf, confidence, startAge, endAge }) => ({ key, value, source, asOf, confidence, startAge, endAge })) });
  return { years, warnings: ["Informational projection only; values are not guarantees.", "Timeline uses reviewed assumptions and does not infer official benefits or taxes."], calculationVersion: "bm35-v1", reproducibilityKey: `bm35-v1:${sourceSignature}`, informational: true };
}

export function compareRetirementTimelines(scenarios: { id: string; name: string; scenario: RetirementScenario }[]) {
  return scenarios.slice(0, 3).map(({ id, name, scenario }) => ({ id, name, timeline: createRetirementTimeline(scenario) }));
}

export function assessRetirementReadiness(s: RetirementScenario): RetirementReadiness {
  const inputs = [s.currentAge, s.targetAge, s.lifeExpectancy, s.inflationRate, s.annualExpenses];
  const factors = [
    { name: "Planning horizon", state: numeric(s.lifeExpectancy) !== null && numeric(s.targetAge) !== null ? "complete" : "missing", explanation: "A documented target age and planning horizon are required." },
    { name: "Income documentation", state: s.retirementIncome.length > 0 ? (s.retirementIncome.every(isReviewed) ? "complete" : "review_needed") : "missing", explanation: "Income streams remain separate and retain their original source." },
    { name: "Expense documentation", state: isReviewed(s.annualExpenses) ? "complete" : "review_needed", explanation: "Expenses are an editable planning assumption, not a prediction." },
    { name: "Assumption review", state: inputs.every(isReviewed) ? "complete" : "review_needed", explanation: "Source dates, confidence, assumptions, and limitations affect evidence quality." }
  ] as RetirementReadiness["factors"];
  return { label: factors.every((factor) => factor.state === "complete") ? "documented" : "incomplete", factors, limitations: ["This is an evidence-quality summary, not a probability, score, or recommendation to retire.", "Projections are informational and non-guaranteed."] };
}

export function explainRetirementTimeline(s: RetirementScenario, timeline: RetirementTimeline) {
  return { summary: timeline.years.length ? "This timeline applies the displayed income, expense, inflation, and horizon assumptions year by year." : "Timeline unavailable until required assumptions are reviewed.", calculationVersion: timeline.calculationVersion, missing: validateRetirementScenario(s), limitations: ["No retirement-date, investment, withdrawal, benefit-claiming, tax, or borrowing recommendation is provided.", "Official benefit values are only shown when supplied by the user or imported from an identified source."] };
}
