import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCustomDebtTarget, normalizeCustomDebtOrder, parseCustomDebtOrder } from "../src/lib/customDebtOrder";
import { normalizeDebtStrategy } from "../src/lib/debtStrategies";
import { runUnifiedStrategyEngine } from "../src/lib/unifiedStrategyEngine";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { buildFinancialForecast } from "../src/lib/financialForecasting";
import { buildFinancialInsights } from "../src/lib/financialInsights";
import { saveDebtStrategySettings } from "../src/lib/debtStrategySettings";

const debts = [
  { id: "a", name: "Small", balance: 100, minimum_payment: 10, interest_rate: 24 },
  { id: "b", name: "Chosen first", balance: 500, minimum_payment: 20, interest_rate: 0 },
];

test("custom remains a canonical strategy and order follows stable IDs, not labels or input sort", () => {
  assert.equal(normalizeDebtStrategy("custom"), "custom");
  assert.deepEqual(parseCustomDebtOrder(["b", null, 4, "b", "", "a"]), ["b", "a"]);
  assert.deepEqual(normalizeCustomDebtOrder([...debts].reverse(), ["gone", "b"]), ["b", "a"]);
  assert.equal(getCustomDebtTarget(debts, ["b"])?.id, "b");
  assert.equal(getCustomDebtTarget([{ ...debts[1], balance: 0 }, debts[0]], ["b", "a"])?.id, "a");
  assert.equal(getCustomDebtTarget([{ ...debts[1], is_archived: true }, debts[0]], ["b"])?.id, "a");
  assert.equal(getCustomDebtTarget([{ ...debts[1], is_excluded: true }, debts[0]], ["b"])?.id, "a");
});

test("decision, forecast, insights, and payoff engine use the same saved custom priority", () => {
  const cashIntelligence = buildCashIntelligence({ asOfDate: new Date("2026-09-17T12:00:00Z"),
    income: [{ amount: 3000, frequency: "monthly", next_date: "2026-09-18" }], bills: [], debtMinimums: debts,
    settings: { currentCash: 100, cashBuffer: 50 },
  });
  const customDebtOrder = ["b", "a"];
  const financialDecision = buildFinancialDecision({ cashIntelligence, debts, strategy: "custom", customDebtOrder });
  assert.equal(financialDecision.targetDebt?.id, "b");
  const plan = runUnifiedStrategyEngine({ debts, strategy: "custom", customDebtOrder, financialDecision });
  assert.equal(plan.first_target, "Chosen first");
  const financialForecast = buildFinancialForecast({ debts, cashIntelligence, financialDecision, strategy: "custom", customDebtOrder });
  const insights = buildFinancialInsights({ debts, cashIntelligence, financialDecision, financialForecast, strategy: "custom", customDebtOrder });
  assert.equal(insights.optimizedPlan.first_target, "Chosen first");
  assert.deepEqual(insights.optimizedPlan.debt_payment_schedule, plan.debt_payment_schedule);
  assert.equal(financialForecast.periods[0].debt, plan.payoff_months[0].remaining_debt);
});

function clientFixture(options: { signedIn?: boolean; error?: {code: string}; mismatch?: boolean; throwWrite?: boolean } = {}) {
  const calls: { table: string; payload: Record<string, unknown>; conflict: unknown }[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.signedIn === false ? null : { id: "verified-owner" } }, error: null }) },
    from(table: string) {
      return { upsert(payload: Record<string, unknown>, conflict: unknown) {
        calls.push({ table, payload, conflict });
        return { select: () => ({ single: async () => {
          if (options.throwWrite) throw new Error("network lost");
          return { data: options.mismatch ? { ...payload, custom_debt_order: [] } : payload, error: options.error ?? null };
        } }) };
      } };
    },
  } as unknown as Parameters<typeof saveDebtStrategySettings>[0];
  return { client, calls };
}

test("explicit save writes only authenticated owner's canonical settings and confirms response", async () => {
  const { client, calls } = clientFixture();
  const result = await saveDebtStrategySettings(client, { strategy: "custom", extraPayment: 123.456, customDebtOrder: ["b", "a", "b"] });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ table: "debt_settings", payload: {
    user_id: "verified-owner", strategy: "custom", extra_payment: 123.46, custom_debt_order: ["b", "a"],
  }, conflict: { onConflict: "user_id" } }]);
});

test("standard strategy saves do not erase stored custom order", async () => {
  const { client, calls } = clientFixture();
  assert.equal((await saveDebtStrategySettings(client, { strategy: "snowball", extraPayment: 10, customDebtOrder: ["b"] })).ok, true);
  assert.equal("custom_debt_order" in calls[0].payload, false);
});

test("invalid input and signed-out sessions never issue a write", async () => {
  for (const input of [
    { strategy: "custom" as const, extraPayment: 20, customDebtOrder: [] },
    { strategy: "snowball" as const, extraPayment: -1 },
  ]) {
    const { client, calls } = clientFixture();
    assert.equal((await saveDebtStrategySettings(client, input)).ok, false);
    assert.equal(calls.length, 0);
  }
  const { client, calls } = clientFixture({ signedIn: false });
  assert.equal((await saveDebtStrategySettings(client, { strategy: "custom", extraPayment: 0, customDebtOrder: ["b"] })).ok, false);
  assert.equal(calls.length, 0);
});

test("missing migration, rejected writes, network ambiguity, and mismatched responses never report success", async () => {
  for (const options of [{ error: { code: "PGRST204" } }, { error: { code: "42501" } }, { throwWrite: true }, { mismatch: true }]) {
    const { client } = clientFixture(options);
    const result = await saveDebtStrategySettings(client, { strategy: "custom", extraPayment: 10, customDebtOrder: ["b"] });
    assert.equal(result.ok, false);
    if (options.error?.code === "PGRST204") assert.match(result.message, /database update/);
  }
});

test("cashflow reload carries custom priority through to suggestions without assignment writes", () => {
  const projection = readFileSync("src/app/dashboard/money/cashflow/hooks/useCashFlowProjection.ts", "utf8");
  const loader = readFileSync("src/app/dashboard/money/cashflow/hooks/useCashFlowDataLoader.ts", "utf8");
  const page = readFileSync("src/app/dashboard/money/cashflow/page.tsx", "utf8");
  assert.match(projection, /getTargetDebt\(payableDebtRows, activeStrategy, customDebtOrder\)/);
  assert.match(loader, /setCustomDebtOrder\(projection.customDebtOrder\)/);
  assert.match(page, /getTargetDebt\(payableDebts, strategy, customDebtOrder\)/);
  const writer = readFileSync("src/lib/debtStrategySettings.ts", "utf8");
  assert.doesNotMatch(writer, /assigned_income_date|debt_payments|bill_events/);
});

test("custom-order migration is additive and preserves existing owner policies", () => {
  const sql = readFileSync("supabase/migrations/20260917140138_add_custom_debt_order.sql", "utf8");
  assert.match(sql, /add column if not exists custom_debt_order text\[\] not null default '\{\}'/);
  assert.doesNotMatch(sql, /drop\s|disable row level|security definer|grant\s/i);
  assert.match(sql, /cardinality\(custom_debt_order\) <= 1000/);
});
