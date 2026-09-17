import assert from "node:assert/strict";
import test from "node:test";
import { getHealthAwareness } from "../src/lib/health/awareness";

test("awareness changes at local month boundaries and repeats next year", () => {
  assert.equal(getHealthAwareness(new Date(2026, 8, 30, 23, 59)).spotlight.title, "Suicide Prevention Month");
  assert.equal(getHealthAwareness(new Date(2026, 9, 1)).spotlight.title, "Breast Cancer Awareness Month");
  assert.equal(getHealthAwareness(new Date(2027, 9, 1)).spotlight.title, "Breast Cancer Awareness Month");
});
test("seasonal flu reminder spans the year boundary but leaves summer clear", () => {
  for (const month of [0, 1, 2, 8, 9, 10, 11]) assert.equal(getHealthAwareness(new Date(2026, month, 15)).showFluReminder, true);
  for (const month of [3, 4, 5, 6, 7]) assert.equal(getHealthAwareness(new Date(2026, month, 15)).showFluReminder, false);
});
test("every month has a resource without labeling evergreen content an observance", () => {
  for (let month = 0; month < 12; month++) assert.ok(getHealthAwareness(new Date(2026, month, 1)).spotlight.href.startsWith("https://"));
  assert.equal(getHealthAwareness(new Date(2026, 0, 1)).observance, false);
});
