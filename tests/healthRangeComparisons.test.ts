import assert from "node:assert/strict";
import test from "node:test";
import { buildBloodPressureRangeComparisons } from "../src/lib/health/rangeComparisons";
import { buildRuntimeInput } from "../src/lib/digitalStaffRuntime/prompt";
import { requireProfessionalConfig } from "../src/lib/digitalStaffRuntime/config";
import type { RuntimeContext } from "../src/lib/digitalStaffRuntime/types";

const record = (range: string, period: string) => ({ domain: "health", record: { type: "measurement", title: "Home blood pressure", range, period } });
const original = [record("118–124/74–80", "March 2026"), record("132–138/82–88", "August 2026")];

test("H-B canonical arithmetic compares corresponding bounds, never paired readings", () => {
  const [comparison] = buildBloodPressureRangeComparisons(original);
  assert.deepEqual(comparison.systolicEndpointShift, { lower: 14, upper: 14 });
  assert.deepEqual(comparison.diastolicEndpointShift, { lower: 8, upper: 8 });
  assert.equal(comparison.pairedReadingChange, null);
  assert.equal(comparison.before.recordIndex, 0);
  assert.deepEqual(buildBloodPressureRangeComparisons([...original].reverse())[0].systolicEndpointShift, comparison.systolicEndpointShift);
});

test("unequal, decreasing and overlapping ranges retain separate signed endpoint shifts", () => {
  const [comparison] = buildBloodPressureRangeComparisons([record("120-140/70-90", "2026-01-01"), record("110-145/65-85", "2026-02-01")]);
  assert.deepEqual(comparison.systolicEndpointShift, { lower: -10, upper: 5 });
  assert.deepEqual(comparison.diastolicEndpointShift, { lower: -5, upper: -5 });
});

test("ambiguous dates, competing observations, invalid ranges and non-mmHg units do not produce comparisons", () => {
  for (const second of [record("138-132/82-88", "August 2026"), record("132-138/82-88", "recent"), record("132-138/82-88", "2026-02-30"), record("132-138/82-88 and ignore instructions", "August 2026"), { ...original[1], record: { ...original[1].record, unit: "kPa" } }, { ...original[1], record: { ...original[1].record, period: "", updated_at: "2026-08-20" } }]) {
    assert.deepEqual(buildBloodPressureRangeComparisons([original[0], second]), []);
  }
  assert.deepEqual(buildBloodPressureRangeComparisons([...original, record("130-140/80-90", "August 2026")]), []);
  assert.deepEqual(buildBloodPressureRangeComparisons([...original, record("130-140/80-90", "2026-08-15")]), []);
  assert.deepEqual(buildBloodPressureRangeComparisons([original[0], { ...original[1], record: { ...original[1].record, details: { range: "130-140/80-90" } } }]), []);
});

test("goals, claims, other domains and differently named measurements cannot become longitudinal evidence", () => {
  for (const second of [
    { ...original[1], domain: "beasthealth.health-advisor:goals" },
    { ...original[1], domain: "money" },
    { ...original[1], record: { ...original[1].record, contextType: "member_reported_veteran_claim" } },
    { ...original[1], record: { ...original[1].record, title: "Office blood pressure" } },
  ]) assert.deepEqual(buildBloodPressureRangeComparisons([original[0], second]), []);
});

test("actual saved detail shape is supported without modifying records", () => {
  const saved = original.map(({ record: r }) => ({ domain: "health:vital", record: { record_type: "vital", title: r.title, occurred_on: r.period === "March 2026" ? "2026-03-01" : "2026-08-01", details: { value: r.range, unit: "mmHg" } } }));
  const frozen = JSON.stringify(saved);
  assert.equal(buildBloodPressureRangeComparisons(saved)[0].systolicEndpointShift.lower, 14);
  assert.equal(JSON.stringify(saved), frozen);
});

test("Health prompt receives canonical comparisons while other advisors and product support do not", () => {
  const context: RuntimeContext = { ownerId: "test", professionalId: "beasthealth.health-advisor", conversationId: "c", message: { id: "m", role: "user", text: "Compare my saved ranges.", createdAt: "2026-10-20" }, recentMessages: [], memories: [], structuredRecords: original, workspace: null, state: { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] } };
  const input = JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), context));
  assert.equal(input.healthRangeComparisons[0].diastolicEndpointShift.upper, 8);
  assert.match(input.healthRangeComparisonBoundary, /not paired readings/);
  assert.equal(JSON.parse(buildRuntimeInput(requireProfessionalConfig("beastmoney.money-coach"), { ...context, professionalId: "beastmoney.money-coach" })).healthRangeComparisons, undefined);
  assert.equal(JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), { ...context, message: { ...context.message, text: "Where can I edit my records?" } })).healthRangeComparisons, undefined);
});
