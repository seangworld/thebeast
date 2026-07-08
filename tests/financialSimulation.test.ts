import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinancialSimulationState,
  parseSimulationDate,
  shiftDateBySimulation,
} from "../src/lib/financialSimulation";

test("parseSimulationDate accepts date-only simulation values", () => {
  assert.equal(parseSimulationDate("2026-08-15")?.getFullYear(), 2026);
  assert.equal(parseSimulationDate("not-a-date"), null);
});

test("shiftDateBySimulation preserves relative timing", () => {
  const original = new Date("2026-07-10T12:00:00");
  const from = new Date("2026-07-07T12:00:00");
  const simulation = new Date("2026-08-01T12:00:00");

  assert.equal(shiftDateBySimulation(original, from, simulation).toISOString().slice(0, 10), "2026-08-04");
});

test("buildFinancialSimulationState labels simulation mode", () => {
  const state = buildFinancialSimulationState("2026-08-15");

  assert.equal(state.dateKey, "2026-08-15");
  assert.equal(state.label.includes("Simulation"), true);
});
