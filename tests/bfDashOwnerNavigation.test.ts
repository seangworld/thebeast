import assert from "node:assert/strict";
import test from "node:test";

import { beastModuleRegistry } from "../src/lib/moduleRegistry";
import {
  buildApplicationNavigationForPersona,
  buildOwnerNavigationForPersona,
} from "../src/lib/moduleNavigation";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";

test("retired BF-Dash is absent from owner desktop and mobile navigation", () => {
  const ownerNavigation = buildOwnerNavigationForPersona({ isOwner: true });

  assert.deepEqual(
    ownerNavigation.map((item) => item.label),
    ["BeastAdmin"]
  );
  assert.equal(ownerNavigation[0]?.href, "/dashboard/admin");
  assert.equal(
    ownerNavigation.some((item) => item.label === "BF-Dash"),
    false
  );
  assert.equal(
    buildMobileNavigation({ isOwner: true }).more.some(
      (item) => item.label === "BF-Dash"
    ),
    false
  );
});

test("retired BF-Dash remains absent from member and application navigation", () => {
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
  assert.equal(
    buildMobileNavigation({ isOwner: false }).more.some(
      (item) => item.label === "BF-Dash"
    ),
    false
  );
});
