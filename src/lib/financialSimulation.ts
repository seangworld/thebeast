import { getBeastDateKey, getBeastRuntimeToday } from "./runtimeDate";

export type FinancialSimulationState = {
  enabled: boolean;
  asOfDate: Date;
  dateKey: string;
  label: string;
};

export function parseSimulationDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildFinancialSimulationState(value?: string | null): FinancialSimulationState {
  const runtimeToday = getBeastRuntimeToday();
  const simulationDate = parseSimulationDate(value);
  const asOfDate = simulationDate || runtimeToday;
  const dateKey = getBeastDateKey(asOfDate);
  const runtimeKey = getBeastDateKey(runtimeToday);
  const enabled = Boolean(simulationDate && dateKey !== runtimeKey);

  return {
    enabled,
    asOfDate,
    dateKey,
    label: enabled ? `Simulation as of ${dateKey}` : "Live Money view",
  };
}

export function shiftDateBySimulation(
  originalDate: Date,
  fromDate: Date,
  simulationDate: Date
) {
  const deltaMs = originalDate.getTime() - fromDate.getTime();
  return new Date(simulationDate.getTime() + deltaMs);
}
