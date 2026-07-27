import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  auditBeastRoadmapIdentities,
  validateFutureRoadmapIdentifier,
} from "../src/lib/beastRoadmapIdentity";

const standard = readFileSync(
  "docs/BA-134-BEASTADMIN-LAYOUT-STANDARD.md",
  "utf8"
);

test("BA-LYT-101 defines the BeastAdmin reference layout for future modules", () => {
  for (const section of [
    "Reference layout",
    "Navigation",
    "Header",
    "Content",
    "Module adoption boundary",
    "Adoption checklist",
  ]) {
    assert.match(standard, new RegExp(`(?:^|\\n)#+ ${section}`, "i"));
  }

  assert.match(standard, /persistent left navigation rail/i);
  assert.match(standard, /current workspace title/i);
  assert.match(standard, /concise purpose statement/i);
  assert.match(standard, /contextual actions only/i);
  assert.match(standard, /workspace body contains the interface specific/i);
});

test("BA-LYT-101 preserves alternative interaction models and module ownership", () => {
  for (const boundary of [
    "conversation",
    "guided workflow",
    "immersive tool",
    "focused activity runner",
    "domain logic",
    "permissions",
    "persistence",
    "professional behavior",
    "calculations",
    "safety requirements",
  ]) {
    assert.match(standard, new RegExp(boundary, "i"));
  }

  assert.match(standard, /not modify BeastMoney/i);
  assert.match(standard, /BeastEducation, BeastHealth, BeastHome/i);
  assert.match(standard, /introduces no[\s\S]*runtime behavior/i);
  assert.match(standard, /database change, migration, or deployment requirement/i);
});

test("BA-LYT-101 preserves the supplied BA-134 label as collision provenance", () => {
  const audit = auditBeastRoadmapIdentities();
  const collision = audit.historicalCollisions.find(
    (entry) => entry.identifier === "BA-134"
  );

  assert.ok(collision);
  assert.deepEqual(collision.roadmapIds, ["BA-LYT-101", "BA-REC-134"]);
  assert.equal(validateFutureRoadmapIdentifier("BA-134").available, false);
  assert.equal(validateFutureRoadmapIdentifier("BA-LYT-101").available, false);
});
