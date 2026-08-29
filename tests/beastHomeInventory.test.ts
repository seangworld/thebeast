import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveMemberModuleEntitlement } from "../src/lib/memberAgeEntitlements";
import { getModuleRegistryEntry } from "../src/lib/moduleRegistry";
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
  assert.match(migration, /is_beast_home_member_eligible/);
  assert.match(migration, /profile\.birthday <= current_date - interval '18 years'/);
  assert.match(migration, /access\.module_id = 'home'[\s\S]*access\.enabled = false/);
  assert.match(migration, /references public\.beast_documents\(id, owner_id\)/);
  assert.match(migration, /on delete set null \(receipt_document_id\)/);
  assert.match(migration, /foreign key \(room_id, inventory_id, owner_id\)/);
  assert.doesNotMatch(migration, /service_role/);
});

test("BHM-002 entitlement denies minors unknown ages and disabled access while preserving adult and admin access", () => {
  const entry = getModuleRegistryEntry("home");
  assert.equal(resolveMemberModuleEntitlement({ module: "home", birthday: "2000-01-01", entry }).allowed, true);
  assert.equal(resolveMemberModuleEntitlement({ module: "home", birthday: "2015-01-01", entry }).allowed, false);
  assert.equal(resolveMemberModuleEntitlement({ module: "home", birthday: null, entry }).allowed, false);
  assert.equal(resolveMemberModuleEntitlement({ module: "home", birthday: "2000-01-01", entry, override: false }).allowed, false);
  assert.equal(resolveMemberModuleEntitlement({ module: "home", birthday: null, entry, isAdmin: true }).allowed, true);
  assert.match(shell, /resolveMemberModuleEntitlement[\s\S]*module: "home"/);
  assert.match(detector, /requireMemberModuleEntitlement\("home"/);
});

test("BHM-002 photo intake is private bounded and confirmation-gated", () => {
  assert.match(detector, /private, no-store/);
  assert.match(detector, /decodedBytes > 3_000_000/);
  assert.match(detector, /\[A-Za-z0-9\+\/\]\+\=\{0,2\}/);
  assert.match(detector, /Do not infer ownership/);
  assert.match(workspace, /AI suggestions are not saved yet/);
  assert.match(workspace, /Confirm and save selected items/);
  assert.match(workspace, /Export dated CSV/);
  assert.match(workspace, /not saved/);
});

test("BHM-002 implements receipt linking onboarding and privacy-bounded Outcome events", () => {
  assert.match(workspace, /receipt_document_id: item\.receiptDocumentId \|\| null/);
  assert.match(workspace, /beast_documents!beast_home_inventory_items_receipt_owner_fk/);
  for (const event of ["home_inventory_opened", "home_inventory_started", "home_inventory_confirmed", "home_inventory_exported"]) {
    assert.match(workspace, new RegExp(event));
    assert.match(migration, new RegExp(event));
  }
  assert.match(migration, /'minimumCohort', 5/);
  const tour = readFileSync("src/lib/guidedOnboarding.ts", "utf8");
  assert.match(tour, /beasthome-inventory-first-use/);
  assert.match(tour, /private home inventory[\s\S]*review and confirm/i);
});
