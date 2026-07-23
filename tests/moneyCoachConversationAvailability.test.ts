import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const source = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");

function experience() {
  return buildMoneyCoachExperience({
    ownerId: "7f892d87-2d72-40a7-8df2-1183c84d66aa",
    userName: "Sean",
    asOfDate: new Date("2026-07-23T12:00:00.000Z"),
    activeBillCount: 0,
    billsDueSoonCount: 0,
    monthlyBills: 0,
    activeDebtCount: 0,
    totalDebt: 0,
    projectedDebtReduction: 0,
    debtProgressPercent: 0,
    monthlyIncome: 0,
    monthlyOutflow: 0,
    projectedSurplus: 0,
    currentCash: 0,
    cashBuffer: 0,
    utilization: 0,
    fundingSourceCount: 0,
    safeFundingSourceCapacity: 0,
    assignedIncomePotCount: 0,
    totalObligationCount: 0,
    recommendationTitle: "Add current records",
    recommendationAction: "Add income and obligations.",
    recommendationWhy: "Current records are incomplete.",
    recommendationHref: "/dashboard/money/cashflow",
    interestSaved: 0,
    timeSavedMonths: 0,
  });
}

test("BM-305A carries the authenticated owner independently of optional insights", () => {
  const model = experience();
  assert.equal(model.ownerId, "7f892d87-2d72-40a7-8df2-1183c84d66aa");
  assert.equal(model.insights[0]?.ownerId, model.ownerId);
  assert.match(source, /const ownerId = model\.ownerId/);
});

test("BM-305A waits for owner resolution and clears stale availability errors", () => {
  assert.match(source, /ownerId === "authenticated-owner"/);
  assert.match(source, /setHistoryError\(""\)/);
  assert.doesNotMatch(source, /Saved conversations are temporarily unavailable/);
});

test("BM-305A makes the server conversation query the availability boundary", () => {
  const listPosition = source.indexOf("nextRepository.list");
  const conversationStatePosition = source.indexOf("setRepository(nextRepository)");
  const importPosition = source.indexOf("nextRepository.importLegacy");
  const memoryPosition = source.indexOf("nextMemoryStore.query");

  assert.ok(listPosition > -1);
  assert.ok(conversationStatePosition > listPosition);
  assert.ok(importPosition > conversationStatePosition);
  assert.ok(memoryPosition > conversationStatePosition);
  assert.match(source, /Promise\.allSettled/);
});

test("BM-305A exposes the underlying conversation error during development", () => {
  assert.match(source, /process\.env\.NODE_ENV === "development"/);
  assert.match(source, /Conversation history could not load: \$\{detail\}/);
  assert.match(source, /setHistoryError\(persistenceErrorMessage\(cause\)\)/);
});
