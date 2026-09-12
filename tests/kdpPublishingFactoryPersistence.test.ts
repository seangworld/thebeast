import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("KDP-001 persists an owner-only queue without Amazon submission authority", () => {
  const migration = readFileSync("supabase/migrations/20260912181500_add_kdp_publishing_factory.sql", "utf8");
  const route = readFileSync("src/app/api/admin/beast-marketing/publishing/route.ts", "utf8");
  assert.match(migration, /alter table public\.kdp_publications enable row level security/);
  assert.match(migration, /\(select auth\.uid\(\)\) = owner_id/);
  assert.match(migration, /grant select, insert, update on public\.kdp_publications to authenticated/);
  assert.match(route, /profile\.data\?\.role === "admin"/);
  assert.match(route, /submissionAuthority: "owner_only"/);
  assert.doesNotMatch(route, /amazon\.com|kdp\.amazon|submit.*publication/i);
});

test("KDP-001 exposes one Publishing workspace with an honest preparation boundary", () => {
  const nav = readFileSync("src/app/dashboard/admin/marketing/MarketingSectionNav.tsx", "utf8");
  const page = readFileSync("src/app/dashboard/admin/marketing/publishing/page.tsx", "utf8");
  const panel = readFileSync("src/app/dashboard/admin/marketing/publishing/KdpPublishingFactoryPanel.tsx", "utf8");
  assert.match(nav, /label: "Publishing"/);
  assert.match(page, /KdpPublishingFactoryPanel/);
  assert.match(panel, /Amazon submission, account changes, terms, ISBN decisions, advertising, and publication remain owner-only/);
  assert.match(panel, /Score and add to queue/);
});

test("KDP-002 adds a fail-closed brief and package approval handoff", () => {
  const migration = readFileSync("supabase/migrations/20260912182938_add_kdp_lifecycle_brief.sql", "utf8");
  const route = readFileSync("src/app/api/admin/beast-marketing/publishing/route.ts", "utf8");
  const panel = readFileSync("src/app/dashboard/admin/marketing/publishing/KdpPublishingFactoryPanel.tsx", "utf8");
  assert.match(migration, /add column if not exists brief jsonb/);
  assert.match(migration, /'brief_ready'/);
  assert.match(route, /evaluateKdpPackageReadiness/);
  assert.match(route, /score of 55 or higher/i);
  assert.match(panel, /Owner approve package/);
  assert.match(panel, /Amazon submission is waiting for your separate owner action/);
  assert.doesNotMatch(route, /action === "submit|action === "publish/);
});
