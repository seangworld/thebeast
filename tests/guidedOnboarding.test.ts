import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastEducationGuidedTour,
  beastGuidedTour,
  guidedTourStorageKey,
  shouldOfferGuidedTour,
} from "../src/lib/guidedOnboarding";

test("BO-UX-001 provides a reusable versioned first-use tour", () => {
  assert.equal(beastGuidedTour.id, "beast-first-use");
  assert.ok(beastGuidedTour.steps.length >= 6);
  assert.ok(beastGuidedTour.steps.some((step) => step.id === "staff"));
  assert.equal(shouldOfferGuidedTour(null, beastGuidedTour), true);
  assert.equal(
    shouldOfferGuidedTour(
      {
        status: "completed",
        version: beastGuidedTour.version,
        step: beastGuidedTour.steps.length - 1,
        updatedAt: "2026-08-29T00:00:00Z",
      },
      beastGuidedTour
    ),
    false
  );
  assert.equal(
    shouldOfferGuidedTour(
      {
        status: "skipped",
        version: "0.9.0",
        step: 0,
        updatedAt: "2026-08-29T00:00:00Z",
      },
      beastGuidedTour
    ),
    true
  );
});

test("BO-UX-001 scopes progress by member and tour", () => {
  assert.equal(
    guidedTourStorageKey("member-1", beastGuidedTour.id),
    "beast:guided-tour:member-1:beast-first-use"
  );
  assert.notEqual(
    guidedTourStorageKey("member-1", beastGuidedTour.id),
    guidedTourStorageKey("member-2", beastGuidedTour.id)
  );
});

test("BeastEducation tutorial uses plain language and includes homework help", () => {
  const copy = beastEducationGuidedTour.steps
    .map((step) => `${step.title} ${step.description}`)
    .join(" ");
  assert.match(copy, /What I Know/);
  assert.match(copy, /What I Think/);
  assert.match(copy, /What I Still Need/);
  assert.match(copy, /Answer This/);
  assert.doesNotMatch(copy, /canonical|governance|runtime|telemetry/i);
});

test("contextual spotlight selectors are implemented by Education surfaces", () => {
  const source = [
    readFileSync("src/app/dashboard/learning/BeastEducationExperience.tsx", "utf8"),
    readFileSync("src/app/dashboard/learning/GuidanceCounselorConversation.tsx", "utf8"),
    readFileSync("src/app/components/agents/ProfessionalKnowledgeWorkspace.tsx", "utf8"),
  ].join("\n");
  for (const step of beastEducationGuidedTour.steps) {
    if (!step.target) continue;
    const stableHook = step.target.match(/data-[a-z-]+/)?.[0];
    assert.ok(stableHook && source.includes(stableHook), `${step.id} target must exist`);
  }
});

test("guided modal contains focus and restores the previous control", () => {
  const source = readFileSync("src/app/components/GuidedTour.tsx", "utf8");
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /const originalControl = document\.activeElement/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => control\?\.focus\(\)\)/);
  assert.match(source, /\}, \[open\]\);/);
  assert.doesNotMatch(
    source.slice(source.indexOf('writeProgress(storageKey, definition, "started"'), source.indexOf("const position")),
    /restoreFocusRef\.current = document\.activeElement/
  );
  assert.match(source, /aria-modal="true"/);
});

test("Education tour selection follows route context rather than member persona", () => {
  const source = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  assert.match(source, /educationOnly=\{pathname\.includes\("\/education\/guidance-counselor"\)\}/);
  assert.doesNotMatch(source, /educationOnly=\{learningOnlyNavigation\}/);
});
