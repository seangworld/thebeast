import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { agencyNavigation, buildOwnerNavigationForPersona } from "../src/lib/moduleNavigation";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";
import { isOwnerWorkspacePath } from "../src/lib/operationsNavigation";

test("Agency Metrics is an owner-only navigation destination", () => {
  assert.equal(agencyNavigation.label, "Agency");
  assert.deepEqual(agencyNavigation.children?.map(({ label, href }) => [label, href]), [
    ["Metrics", "/dashboard/admin/agency/metrics"],
  ]);
  assert.equal(buildOwnerNavigationForPersona({ isOwner: false }).some((item) => item.label === "Agency"), false);
  assert.equal(buildOwnerNavigationForPersona({ isOwner: true }).some((item) => item.label === "Agency"), true);
  assert.equal(buildMobileNavigation({ isOwner: false }).more.some((item) => item.label === "Agency"), false);
  assert.equal(buildMobileNavigation({ isOwner: true }).more.some((item) => item.label === "Agency"), true);
  assert.equal(isOwnerWorkspacePath("/dashboard/admin/agency/metrics"), true);
});

test("Agency Metrics uses owner access shell and transparent empty states", () => {
  const path = "src/app/dashboard/admin/agency/metrics/page.tsx";
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, "utf8");
  assert.match(source, /<BeastAdminShell/);
  assert.match(source, /Cole Mercer/);
  assert.match(source, /Leila Bautista/);
  assert.match(source, /Not connected/);
  assert.match(source, /No data yet/);
});
