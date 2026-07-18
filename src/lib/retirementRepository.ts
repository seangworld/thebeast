import type { RetirementScenario, RetirementValue } from "./retirementModel";

export type RetirementScenarioRecord = { id: string; owner_id: string; name: string; assumptions: RetirementValue[]; created_at: string; updated_at: string };

export function scenarioFromRecord(record: RetirementScenarioRecord, required: Omit<RetirementScenario, "retirementBalances" | "annualContributions" | "retirementIncome">) {
  const byKey = new Map(record.assumptions.map((value) => [value.key, value]));
  const values = Array.from(byKey.values());
  return { ...required, retirementBalances: values.filter((value) => value.key.startsWith("retirement_balance:")), annualContributions: values.filter((value) => value.key.startsWith("annual_contribution:")), retirementIncome: values.filter((value) => value.key.startsWith("retirement_income:")) };
}

export const RETIREMENT_PERSISTENCE_BOUNDARY = "Retirement scenarios are owner-scoped records. Persisted values retain source, date, confidence, assumptions, and limitations; no official benefit is inferred or overwritten.";
