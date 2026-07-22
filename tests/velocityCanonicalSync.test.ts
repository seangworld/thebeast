import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCanonicalVelocityChangeEvidence,
  canonicalDebtToVelocitySettings,
  deriveCanonicalAvailableCredit,
  resolveCanonicalVelocitySource,
} from "../src/lib/velocity";

const ownerId = "owner-1";
const heloc = { id: "heloc-1", user_id: ownerId, name: "Home HELOC", balance: 24000, credit_limit: 50000, interest_rate: 8.25, minimum_payment: 350, is_archived: false };
const planning = { max_utilization_percent: "66", recovery_months: "6", emergency_reserve_amount: "1000", allow_super_velocity: false };

test("Velocity resolves current canonical HELOC values by stable owner-scoped ID", () => {
  const current = { ...heloc, balance: 21500, credit_limit: 52000, interest_rate: 7.9 };
  const resolution = resolveCanonicalVelocitySource(current.id, ownerId, [current]);
  assert.equal(resolution.status, "ready");
  if (resolution.status !== "ready") return;
  const settings = canonicalDebtToVelocitySettings(resolution.source, planning);
  assert.equal(settings.source_debt_id, current.id);
  assert.equal(settings.current_balance, 21500);
  assert.equal(settings.credit_limit, 52000);
  assert.equal(settings.source_apr, 7.9);
  assert.equal(deriveCanonicalAvailableCredit(current), 30500);
});

test("Velocity preserves planning fields and has no independently editable shared balance", () => {
  const settings = canonicalDebtToVelocitySettings(heloc, planning);
  assert.equal(settings.recovery_months, "6");
  assert.equal(settings.max_utilization_percent, "66");
  const page = readFileSync("src/app/dashboard/money/velocity/page.tsx", "utf8");
  assert.doesNotMatch(page, /updateVelocitySetting\("current_balance"/);
  assert.doesNotMatch(page, /updateVelocitySetting\("credit_limit"/);
  assert.doesNotMatch(page, /updateVelocitySetting\("source_apr"/);
  assert.match(page, /data-selected-heloc-summary="true"/);
  assert.match(page, /grid min-w-0 gap-3 rounded-lg/);
});

test("missing archived and cross-owner HELOCs never silently reassign", () => {
  assert.equal(resolveCanonicalVelocitySource("missing", ownerId, [heloc]).status, "missing");
  assert.equal(resolveCanonicalVelocitySource(heloc.id, ownerId, [{ ...heloc, is_archived: true }]).status, "archived");
  assert.equal(resolveCanonicalVelocitySource(heloc.id, ownerId, [{ ...heloc, user_id: "other-owner" }]).status, "missing");
});

test("canonical changes produce owner-scoped evidence without claiming payment", () => {
  const evidence = buildCanonicalVelocityChangeEvidence(ownerId, heloc, { ...heloc, balance: 21500, credit_limit: 52000, interest_rate: 7.9 }, "2026-07-21T12:00:00.000Z");
  assert.ok(evidence);
  assert.equal(evidence.event.ownerId, ownerId);
  assert.equal((evidence.event.payload as { paymentConfirmed: boolean }).paymentConfirmed, false);
  assert.match(evidence.memory.summary, /projection were recalculated/);
  assert.throws(() => buildCanonicalVelocityChangeEvidence(ownerId, heloc, { ...heloc, user_id: "other-owner" }));
});

test("migration links Velocity to canonical debt while retaining legacy values as evidence", () => {
  const migration = readFileSync("supabase/migrations/20260721000200_link_velocity_to_canonical_debt.sql", "utf8");
  assert.match(migration, /selected_debt_id uuid null references public\.debts\(id\) on delete set null/);
  assert.match(migration, /Legacy duplicated source fields are retained as migration evidence only/);
  assert.match(migration, /set_debts_updated_at/);
});
