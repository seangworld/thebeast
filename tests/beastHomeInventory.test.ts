import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const migration = readFileSync("supabase/migrations/20260829040000_add_beast_home_inventory.sql", "utf8");
const detector = readFileSync("src/app/api/home/inventory/detect/route.ts", "utf8");
const workspace = readFileSync("src/app/dashboard/home/inventory/BeastHomeInventoryWorkspace.tsx", "utf8");
const shell = readFileSync("src/app/dashboard/home/BeastHomeShell.tsx", "utf8");
const registry = readFileSync("src/lib/moduleRegistry.ts", "utf8");

test("BHM-002 releases one discoverable member-facing BeastHome inventory", () => {
  assert.match(registry, /name: "BeastHome"[\s\S]*status: "active"[\s\S]*visibility: "released"/);
  assert.match(shell, /Home Inventory[\s\S]*\/dashboard\/home\/inventory/);
});

test("BHM-002 persistence is explicitly owner-scoped and RLS protected", () => {
  for (const table of ["beast_home_inventories", "beast_home_inventory_rooms", "beast_home_inventory_items"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /owner_id = auth\.uid\(\)/);
  assert.match(migration, /references public\.beast_documents\(id, owner_id\)/);
  assert.doesNotMatch(migration, /service_role/);
});

test("BHM-002 photo intake is private bounded and confirmation-gated", () => {
  assert.match(detector, /private, no-store/);
  assert.match(detector, /image\.length > 7_000_000/);
  assert.match(detector, /Do not infer ownership/);
  assert.match(workspace, /AI suggestions are not saved yet/);
  assert.match(workspace, /Confirm and save selected items/);
  assert.match(workspace, /Export dated CSV/);
  assert.match(workspace, /not saved/);
});
