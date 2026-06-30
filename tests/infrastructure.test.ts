import test from "node:test";
import assert from "node:assert/strict";
import {
  DEBT_STRATEGIES,
  getDebtStrategyDescription,
  getDebtStrategyLabel,
  normalizeDebtStrategy,
} from "../src/lib/debtStrategies";
import {
  formatCurrency,
  formatMonthCount,
  formatPercent,
  parseNumber,
  parseOptionalNumber,
} from "../src/lib/formatters";
import {
  DEFAULT_VELOCITY_SETTINGS,
  mapVelocitySettingsRow,
  mergeStoredVelocitySettings,
  velocitySettingsToUpsertPayload,
} from "../src/lib/velocity/settings";

test("debt strategy registry includes existing strategy options", () => {
  assert.deepEqual(
    DEBT_STRATEGIES.map((strategy) => strategy.value),
    ["minimum", "snowball", "avalanche", "velocity"]
  );
  assert.equal(getDebtStrategyLabel("velocity"), "Velocity");
  assert.equal(
    getDebtStrategyDescription("minimum"),
    "Minimum payments only. No extra attack or rollover."
  );
  assert.equal(normalizeDebtStrategy("unknown"), "snowball");
});

test("shared formatters preserve current formatting semantics", () => {
  assert.equal(formatCurrency(1234.5), "$1,234.50");
  assert.equal(formatPercent(7.125), "7.13%");
  assert.equal(formatMonthCount(1), "1 Month");
  assert.equal(formatMonthCount(2.1), "3 Months");
  assert.equal(parseNumber(""), 0);
  assert.equal(parseNumber("12.5"), 12.5);
  assert.equal(parseOptionalNumber(""), null);
  assert.equal(parseOptionalNumber("12.5"), 12.5);
});

test("velocity settings helpers map persisted and stored values", () => {
  const mapped = mapVelocitySettingsRow({
    velocity_source_type: "ploc",
    credit_limit: 10000,
    current_balance: 2500,
    source_apr: 8.5,
    allow_super_velocity: true,
  });

  assert.equal(mapped.velocity_source_type, "ploc");
  assert.equal(mapped.credit_limit, "10000");
  assert.equal(mapped.max_utilization_percent, "66");
  assert.equal(mapped.recovery_months, "6");
  assert.equal(mapped.allow_super_velocity, true);

  const merged = mergeStoredVelocitySettings(
    JSON.stringify({ credit_limit: "5000" })
  );
  assert.deepEqual(merged, {
    ...DEFAULT_VELOCITY_SETTINGS,
    credit_limit: "5000",
  });

  assert.deepEqual(velocitySettingsToUpsertPayload(mapped), {
    velocity_source_type: "ploc",
    credit_limit: 10000,
    current_balance: 2500,
    source_apr: 8.5,
    max_utilization_percent: 66,
    recovery_months: 6,
    emergency_reserve_amount: null,
    allow_super_velocity: true,
  });
});
