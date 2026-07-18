import assert from "node:assert/strict";
import test from "node:test";
import { buildNetWorthModel, validateNetWorthModel } from "../src/lib/netWorth";

const categories = [
  { id: "owned", label: "Owned", kind: "asset" as const, sortOrder: 0 },
  { id: "owed", label: "Owed", kind: "liability" as const, sortOrder: 1 },
];

const entries = [
  { id: "primary-asset", categoryId: "owned", kind: "asset" as const, name: "Primary asset" },
  { id: "primary-debt", categoryId: "owed", kind: "liability" as const, name: "Primary debt" },
];

test("BM-29 models assets liabilities categories and dated history", () => {
  const model = buildNetWorthModel({
    categories,
    entries,
    history: [
      { id: "asset-jan", entryId: "primary-asset", recordedOn: "2026-01-01", value: 100_000 },
      { id: "debt-jan", entryId: "primary-debt", recordedOn: "2026-01-01", value: 40_000 },
    ],
  });

  assert.deepEqual(model.categories.map(({ id }) => id), ["owned", "owed"]);
  assert.deepEqual(model.entries.map(({ id }) => id), ["primary-asset", "primary-debt"]);
  assert.equal(model.history.length, 2);
  assert.equal(model.current?.netWorth, 60_000);
});

test("BM-29 exposes a chronological net-worth trend with prior values carried forward", () => {
  const model = buildNetWorthModel({
    categories,
    entries,
    history: [
      { id: "asset-jan", entryId: "primary-asset", recordedOn: "2026-01-01", value: 100_000 },
      { id: "debt-jan", entryId: "primary-debt", recordedOn: "2026-01-01", value: 40_000 },
      { id: "debt-feb", entryId: "primary-debt", recordedOn: "2026-02-01", value: 35_000 },
      { id: "asset-mar", entryId: "primary-asset", recordedOn: "2026-03-01", value: 103_000 },
    ],
  });

  assert.deepEqual(model.trend, [
    { recordedOn: "2026-01-01", assetTotal: 100_000, liabilityTotal: 40_000, netWorth: 60_000, change: null, direction: "first" },
    { recordedOn: "2026-02-01", assetTotal: 100_000, liabilityTotal: 35_000, netWorth: 65_000, change: 5_000, direction: "up" },
    { recordedOn: "2026-03-01", assetTotal: 103_000, liabilityTotal: 35_000, netWorth: 68_000, change: 3_000, direction: "up" },
  ]);
});

test("BM-29 reports decreases and unchanged net-worth history honestly", () => {
  const model = buildNetWorthModel({
    categories,
    entries,
    history: [
      { id: "asset-jan", entryId: "primary-asset", recordedOn: "2026-01-01", value: 10_000 },
      { id: "asset-feb", entryId: "primary-asset", recordedOn: "2026-02-01", value: 9_000 },
      { id: "asset-mar", entryId: "primary-asset", recordedOn: "2026-03-01", value: 9_000 },
    ],
  });

  assert.deepEqual(model.trend.map(({ change, direction }) => ({ change, direction })), [
    { change: null, direction: "first" },
    { change: -1_000, direction: "down" },
    { change: 0, direction: "unchanged" },
  ]);
});

test("BM-29 rejects orphan history invalid values and mismatched category ownership", () => {
  const errors = validateNetWorthModel({
    categories,
    entries: [{ id: "wrong-kind", categoryId: "owned", kind: "liability", name: "Wrong kind" }],
    history: [
      { id: "orphan", entryId: "missing", recordedOn: "not-a-date", value: -1 },
    ],
  });

  assert.equal(errors.some((error) => /does not match category/.test(error)), true);
  assert.equal(errors.some((error) => /missing entry/.test(error)), true);
  assert.equal(errors.some((error) => /invalid date/.test(error)), true);
  assert.equal(errors.some((error) => /non-negative finite value/.test(error)), true);
});
