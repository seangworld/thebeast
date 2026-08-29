import assert from "node:assert/strict";
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
  assert.match(copy, /What I.m Planning/);
  assert.match(copy, /What I Still Need/);
  assert.match(copy, /Answer This/);
  assert.match(copy, /Take a picture or upload it/);
  assert.doesNotMatch(copy, /canonical|governance|runtime|telemetry/i);
});
