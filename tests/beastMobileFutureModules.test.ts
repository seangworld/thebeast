import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMobileFutureModuleCards } from "../src/lib/mobileFutureModules";

const foundations = [
  {
    identifier: "health" as const,
    title: "BeastHealth",
    description: "Admin-only foundation for the future BeastHealth workspace.",
    focus: [
      "Reserve the BeastHealth application shell.",
      "Keep health scope protected until safety and privacy policy are approved.",
    ],
    href: "/dashboard/health",
    sections: 10,
  },
  {
    identifier: "home" as const,
    title: "BeastHome",
    description: "Admin-only foundation for the future BeastHome workspace.",
    focus: [
      "Reserve the BeastHome application shell.",
      "Keep home scope protected until policy is approved.",
    ],
    href: "/dashboard/home",
    sections: 7,
  },
];

test("BF-MOB-007 stops presenting released BeastHome as a future module card", () => {
  const ownerCards = buildMobileFutureModuleCards({
    isOwner: true,
    foundations,
  });
  const memberCards = buildMobileFutureModuleCards({
    isOwner: false,
    foundations,
  });

  assert.deepEqual(ownerCards, []);
  assert.deepEqual(memberCards, []);
});

test("BF-MOB-007 leaves no future card for released Health or Home", () => {
  const cards = buildMobileFutureModuleCards({
    isOwner: true,
    foundations,
  });

  assert.deepEqual(cards, []);
});

test("BF-MOB-007 exposes mobile future module surfaces without replacing desktop shells", () => {
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const mobileFutureModules = readFileSync("src/lib/mobileFutureModules.ts", "utf8");
  const healthShell = readFileSync("src/app/dashboard/health/BeastHealthShell.tsx", "utf8");
  const homeShell = readFileSync("src/app/dashboard/home/BeastHomeShell.tsx", "utf8");

  assert.match(dashboard, /data-mobile-future-modules="true"/);
  assert.match(dashboard, /data-mobile-future-module=\{card.module\}/);
  assert.match(dashboard, /data-mobile-read-only=\{card.readOnly\}/);
  assert.match(dashboard, /md:hidden/);
  assert.match(dashboard, /min-w-0/);
  assert.match(dashboard, /break-words/);
  assert.match(mobileFutureModules, /isOwner: boolean/);
  assert.match(mobileFutureModules, /future-module-foundation-route/);
  assert.match(healthShell, /Health Advisor Active/);
  assert.match(homeShell, /Photo-to-Home-Inventory is the only active member-facing BeastHome workflow/);
});
