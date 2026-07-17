import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileHardeningChecklist,
  buildMobileRuntimeState,
} from "../src/lib/mobileHardening";

test("BF-MOB-008 defines mobile hardening coverage for critical paths", () => {
  const checklist = buildMobileHardeningChecklist();

  assert.deepEqual(
    checklist.map((item) => item.id),
    [
      "safe-area",
      "no-horizontal-overflow",
      "touch-targets",
      "focus-visible",
      "reduced-motion",
      "offline-state",
      "degraded-state",
      "source-owned-actions",
    ]
  );
  assert.equal(checklist.every((item) => item.covered), true);
});

test("BF-MOB-008 mobile runtime state explains offline and degraded mode", () => {
  const offline = buildMobileRuntimeState({ online: false });
  const degraded = buildMobileRuntimeState({ online: true, degraded: true });
  const normal = buildMobileRuntimeState({ online: true });

  assert.equal(offline.banner?.kind, "Offline");
  assert.match(offline.banner?.recoveryAction || "", /Reconnect/);
  assert.equal(degraded.banner?.kind, "Degraded");
  assert.match(degraded.banner?.recoveryAction || "", /retry/i);
  assert.equal(normal.banner, null);
});

test("BF-MOB-008 hardens mobile shell accessibility safe areas and overflow", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const learning = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
  const money = readFileSync("src/app/dashboard/money/page.tsx", "utf8");

  assert.match(layout, /data-mobile-runtime-state=\{mobileRuntimeState\.banner\.kind\.toLowerCase\(\)\}/);
  assert.match(layout, /role="dialog"/);
  assert.match(layout, /aria-modal="true"/);
  assert.match(layout, /aria-labelledby="beast-mobile-more-title"/);
  assert.match(layout, /aria-label="Open more mobile destinations"/);
  assert.match(layout, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(layout, /data-mobile-hardening="bottom-navigation"/);
  assert.match(layout, /env\(safe-area-inset-top\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(css, /overflow-x: clip/);

  for (const page of [dashboard, learning, money]) {
    assert.match(page, /md:hidden/);
    assert.match(page, /min-w-0/);
  }
});
