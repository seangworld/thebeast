import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditGenerationTwoUX, generationTwoUXPrinciples } from "../src/lib/platform/generationTwoUX";

test("Generation 2 UX contract covers every required ecosystem standard", () => {
  assert.equal(generationTwoUXPrinciples.length, 9);
  assert.match(generationTwoUXPrinciples.join(" "), /horizontal scrolling/i);
  assert.match(generationTwoUXPrinciples.join(" "), /progressive saving/i);
  assert.match(generationTwoUXPrinciples.join(" "), /Tables become readable cards/i);
  const result = auditGenerationTwoUX({ pageId: "money", responsive: true, guidedEmptyState: true, noDeadEnd: true, progressiveSaving: "not-applicable", aiFirst: true, adaptiveDenseContent: true });
  assert.equal(result.compliant, true);
  assert.deepEqual(auditGenerationTwoUX({ ...result, pageId: "broken", responsive: false }).failed, ["responsive"]);
});

test("shared primitives enforce guidance progressive save details and adaptive tables", () => {
  const source = readFileSync("src/app/components/design/DashboardPrimitives.tsx", "utf8");
  assert.match(source, /function GuidedEmptyState/);
  assert.match(source, /data-generation-two-guided-state/);
  assert.match(source, /AI guidance:/);
  assert.match(source, /function ProgressiveSaveStatus/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /function ExpandableDetailPanel/);
  assert.match(source, /function AdaptiveTable/);
  assert.match(source, /data-adaptive-table/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden md:block/);
});

test("ecosystem module shells replace inert placeholders with useful next actions", () => {
  const health = readFileSync("src/app/dashboard/health/BeastHealthShell.tsx", "utf8");
  const home = readFileSync("src/app/dashboard/home/BeastHomeShell.tsx", "utf8");
  const platform = readFileSync("src/app/dashboard/platformPlaceholder.tsx", "utf8");
  for (const source of [health, home, platform]) {
    assert.match(source, /GuidedEmptyState/);
    assert.match(source, /nextAction=/);
    assert.match(source, /secondaryAction=/);
  }
});

test("responsive contract uses structural reflow and retains focusable dense-region fallback", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.doesNotMatch(css, /overflow-x: (?:clip|hidden)/);
  assert.match(css, /:where\(\.beast-page, \.beast-container, \.beast-card, \.beast-panel, \.beast-surface\)[\s\S]*min-width: 0/);
  assert.match(css, /\.beast-table-wrap[\s\S]*overflow-x: auto/);
  assert.match(css, /\.beast-table-wrap:focus-visible/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Education Profile demonstrates progressive saving without a blocking submit", () => {
  const source = readFileSync("src/app/dashboard/learning/EducationCommandCenter.tsx", "utf8");
  assert.match(source, /useProgressiveSave/);
  assert.match(source, /ProgressiveSaveStatus/);
  assert.match(source, /localStorage\.setItem/);
});
