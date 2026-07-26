import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminRoadmapProducts,
  beastAdminRoadmapStatuses,
  buildBeastAdminRoadmapCounts,
  filterBeastAdminRoadmapItems,
  getBeastAdminRoadmapLifecyclePosition,
  normalizeBeastAdminRoadmapRow,
  type BeastAdminRoadmapItem,
} from "../src/lib/beastAdminRoadmap";

const items: BeastAdminRoadmapItem[] = [
  {
    id: "education-intake",
    userId: "owner",
    productId: "education",
    title: "Professional intake",
    summary: "Make educational discovery conversational.",
    status: "testing",
    ownerNotes: "Verify with a new member account.",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
  },
  {
    id: "fusion-context",
    userId: "owner",
    productId: "fusion",
    title: "Shared understanding",
    summary: "Reduce duplicate questions across professionals.",
    status: "in_progress",
    ownerNotes: "Respect module ownership.",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "old-plan",
    userId: "owner",
    productId: "money",
    title: "Retired planning experiment",
    summary: "",
    status: "archived",
    ownerNotes: "",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
  },
];

test("BA-102 represents every requested product and lifecycle state", () => {
  assert.deepEqual(
    beastAdminRoadmapProducts.map((product) => product.id),
    [
      "beastos",
      "money",
      "education",
      "health",
      "goals",
      "documents",
      "home",
      "fusion",
      "seangworld",
      "future",
    ]
  );
  assert.deepEqual(beastAdminRoadmapStatuses, [
    "planned",
    "in_progress",
    "testing",
    "released",
    "archived",
  ]);

  const beastOS = beastAdminRoadmapProducts.find(
    (product) => product.id === "beastos"
  );
  const fusion = beastAdminRoadmapProducts.find(
    (product) => product.id === "fusion"
  );
  assert.match(beastOS?.currentVersion || "", /^v/);
  assert.equal(fusion?.currentVersion, null);
  assert.match(fusion?.sourceLabel || "", /no version/i);
});

test("BA-102 filters features by product, status, and owner planning context", () => {
  assert.deepEqual(
    filterBeastAdminRoadmapItems(items, {
      productId: "education",
      status: "all",
      query: "",
    }).map((item) => item.id),
    ["education-intake"]
  );
  assert.deepEqual(
    filterBeastAdminRoadmapItems(items, {
      productId: "all",
      status: "in_progress",
      query: "ownership",
    }).map((item) => item.id),
    ["fusion-context"]
  );
  assert.deepEqual(
    filterBeastAdminRoadmapItems(items, {
      productId: "all",
      status: "all",
      query: "duplicate questions",
    }).map((item) => item.id),
    ["fusion-context"]
  );
});

test("BA-102 reports lifecycle stages without inventing completion percentages", () => {
  assert.deepEqual(getBeastAdminRoadmapLifecyclePosition("planned"), {
    current: 1,
    total: 4,
    label: "1 of 4 delivery stages",
  });
  assert.deepEqual(getBeastAdminRoadmapLifecyclePosition("released"), {
    current: 4,
    total: 4,
    label: "4 of 4 delivery stages",
  });
  assert.deepEqual(getBeastAdminRoadmapLifecyclePosition("archived"), {
    current: 0,
    total: 4,
    label: "Archived outside the active delivery lifecycle",
  });
  assert.deepEqual(buildBeastAdminRoadmapCounts(items), {
    planned: 0,
    in_progress: 1,
    testing: 1,
    released: 0,
    archived: 1,
  });
});

test("BA-102 rejects unsupported database values instead of displaying invented state", () => {
  const valid = normalizeBeastAdminRoadmapRow({
    id: "valid",
    user_id: "owner",
    product_id: "education",
    title: "  Guidance improvements  ",
    summary: null,
    status: "testing",
    owner_notes: null,
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-26T00:00:00.000Z",
  });
  const invalidProduct = normalizeBeastAdminRoadmapRow({
    id: "invalid",
    user_id: "owner",
    product_id: "invented-product",
    title: "Feature",
    summary: "",
    status: "planned",
    owner_notes: "",
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-26T00:00:00.000Z",
  });

  assert.equal(valid?.title, "Guidance improvements");
  assert.equal(valid?.summary, "");
  assert.equal(invalidProduct, null);
});

test("BA-102 keeps roadmap persistence owner-only and migration-backed", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000000_add_beast_admin_product_roadmap.sql",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/roadmap/BeastAdminRoadmapWorkspace.tsx",
    "utf8"
  );
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );

  assert.match(migration, /beast_admin_roadmap_items/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /auth\.uid\(\) = user_id/g);
  assert.match(
    migration,
    /status in \('planned', 'in_progress', 'testing', 'released', 'archived'\)/
  );
  assert.match(workspace, /\.from\("beast_admin_roadmap_items"\)/);
  assert.match(workspace, /Add to roadmap/);
  assert.match(workspace, /Owner notes/);
  assert.match(workspace, /Save changes/);
  assert.match(workspace, /No roadmap features match these filters/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(shell, /\/dashboard\/admin\/roadmap/);
  assert.match(shell, /canAccessBeastAdmin/);
});
