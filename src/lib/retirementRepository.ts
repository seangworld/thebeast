import type { RetirementScenario, RetirementValue } from "./retirementModel";

export type RetirementScenarioRecord = { id: string; owner_id: string; name: string; assumptions: RetirementValue[]; created_at: string; updated_at: string };

export function scenarioFromRecord(record: RetirementScenarioRecord, required: Omit<RetirementScenario, "retirementBalances" | "annualContributions" | "retirementIncome">) {
  const byKey = new Map(record.assumptions.map((value) => [value.key, value]));
  const values = Array.from(byKey.values());
  return { ...required, retirementBalances: values.filter((value) => value.key.startsWith("retirement_balance:")), annualContributions: values.filter((value) => value.key.startsWith("annual_contribution:")), retirementIncome: values.filter((value) => value.key.startsWith("retirement_income:")) };
}

export const RETIREMENT_PERSISTENCE_BOUNDARY = "Retirement scenarios are owner-scoped records. Persisted values retain source, date, confidence, assumptions, and limitations; no official benefit is inferred or overwritten.";

export type RetirementTimelineRunRecord = { id: string; scenario_id: string; owner_id: string; calculation_version: string; scenario_snapshot: unknown; timeline: unknown; reproducibility_key: string; created_at: string };
export type RetirementReportRecord = { id: string; scenario_id: string; owner_id: string; format: "print" | "pdf" | "csv" | "json"; scenario_snapshot: unknown; created_at: string };

export function timelineRunPayload(ownerId: string, scenarioId: string, scenarioSnapshot: unknown, timeline: { calculationVersion: string; reproducibilityKey: string }) {
  return { owner_id: ownerId, scenario_id: scenarioId, scenario_snapshot: scenarioSnapshot, calculation_version: timeline.calculationVersion, reproducibility_key: timeline.reproducibilityKey };
}

export const RETIREMENT_REPORT_BOUNDARY = "Retirement reports are owner-scoped snapshots. They display assumptions, provenance, limitations, calculation version, and an informational non-guarantee notice; they are never advice or an external submission.";
