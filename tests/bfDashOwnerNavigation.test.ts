import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { beastModuleRegistry } from "../src/lib/moduleRegistry";
import {
  BF_DASH_CANONICAL_URL,
  buildApplicationNavigationForPersona,
  buildOwnerNavigationForPersona,
} from "../src/lib/moduleNavigation";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";

test("owner navigation exposes BeastAdmin then the canonical external BF-Dash", () => {
  const ownerNavigation = buildOwnerNavigationForPersona({ isOwner: true });

  assert.deepEqual(
    ownerNavigation.map((item) => item.label),
    ["BeastAdmin", "BF-Dash"]
  );
  assert.equal(ownerNavigation[0]?.href, "/dashboard/admin");
  assert.equal(ownerNavigation[0]?.external, undefined);
  assert.equal(ownerNavigation[1]?.href, BF_DASH_CANONICAL_URL);
  assert.equal(ownerNavigation[1]?.external, true);
  assert.equal(BF_DASH_CANONICAL_URL, "http://127.0.0.1:4173/");
  assert.equal(
    ownerNavigation.filter((item) => item.label === "BeastAdmin").length,
    1
  );
  assert.equal(
    ownerNavigation.filter((item) => item.label === "BF-Dash").length,
    1
  );
});

test("owner tools stay hidden from members and outside the module registry", () => {
  assert.deepEqual(buildOwnerNavigationForPersona({ isOwner: false }), []);
  assert.equal(
    beastModuleRegistry.some((item) => item.name === "BF-Dash"),
    false
  );
  assert.equal(
    buildApplicationNavigationForPersona({ isOwner: true }).some(
      (item) => item.label === "BF-Dash"
    ),
    false
  );
});

test("desktop and mobile navigation render BF-Dash as a safe external link", () => {
  const dashboardLayout = readFileSync(
    "src/app/dashboard/layout.tsx",
    "utf8"
  );
  const ownerMobileItems = buildMobileNavigation({ isOwner: true }).more.filter(
    (item) => item.label === "BF-Dash"
  );

  assert.equal(ownerMobileItems.length, 1);
  assert.equal(ownerMobileItems[0]?.href, BF_DASH_CANONICAL_URL);
  assert.equal(ownerMobileItems[0]?.external, true);
  assert.equal(
    buildMobileNavigation({ isOwner: false }).more.some(
      (item) => item.label === "BF-Dash" || item.label === "BeastAdmin"
    ),
    false
  );
  assert.match(dashboardLayout, /target="_blank"/);
  assert.match(dashboardLayout, /rel="noopener noreferrer"/);
  assert.match(dashboardLayout, /title=\{compact \? `\$\{item\.label\} \(opens in a new tab\)`/);
  assert.match(dashboardLayout, /aria-label="Owner"/);
});
