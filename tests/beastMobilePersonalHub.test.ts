import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileGoalActionCards,
  buildMobileHouseholdAlertCards,
  buildMobileQuickUploadCards,
} from "../src/lib/mobilePersonalHub";
import { summarizeDocuments } from "../src/lib/platform/documents";
import { mockGoals, summarizeGoals } from "../src/lib/platform/goals";
import {
  buildHouseholdSharedLinkRequest,
  mockHouseholdModel,
} from "../src/lib/platform/household";

test("BF-MOB-005 builds Quick Upload cards through BeastOS document contracts", () => {
  const cards = buildMobileQuickUploadCards({
    summary: summarizeDocuments([]),
  });

  assert.equal(cards[0].source, "documents");
  assert.equal(cards[0].href, "/dashboard/uploads#mobile-quick-upload");
  assert.equal(cards[0].dispatchMode, "document-upload-contract");
  assert.equal(cards[0].sourceOwnershipPreserved, true);
});

test("BF-MOB-005 builds mobile goal action cards without owning module progress", () => {
  const cards = buildMobileGoalActionCards({
    goals: mockGoals,
    summary: summarizeGoals(mockGoals),
  });

  assert.equal(cards[0].source, "goals");
  assert.equal(cards[0].dispatchMode, "goal-source-route");
  assert.equal(cards[0].sourceOwnershipPreserved, true);
  assert.ok(cards[0].metadata.includes("Active"));
});

test("BF-MOB-005 builds household alert cards from Household service contracts", () => {
  const sharedLink = buildHouseholdSharedLinkRequest({
    householdId: "household-sean",
    kind: "Document",
    sourceRecordId: "document-1",
    title: "Shared document",
    permission: "View",
    grantedByMemberId: "household-member-owner",
    grantedToMemberIds: ["household-member-owner"],
    model: mockHouseholdModel,
  });
  const cards = buildMobileHouseholdAlertCards({
    model: {
      ...mockHouseholdModel,
      sharedLinks: [sharedLink],
    },
  });

  assert.equal(cards[0].source, "beastos");
  assert.equal(cards[0].dispatchMode, "household-contract-event");
  assert.equal(cards[0].sourceOwnershipPreserved, true);
  assert.ok(cards[0].metadata.includes("1 shared links"));
});

test("BF-MOB-005 exposes mobile Personal Hub quick surfaces on approved routes", () => {
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const uploads = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const goals = readFileSync("src/app/dashboard/goals/page.tsx", "utf8");

  assert.match(dashboard, /data-mobile-personal-hub="household-alerts"/);
  assert.match(uploads, /data-mobile-personal-hub="quick-uploads"/);
  assert.match(goals, /data-mobile-personal-hub="goals"/);
  assert.match(uploads, /data-mobile-source-contract=\{card.dispatchMode\}/);
  assert.match(goals, /data-mobile-source-contract=\{card.dispatchMode\}/);
});

test("BF-MOB-005 keeps mobile Personal Hub surfaces narrow and desktop views intact", () => {
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const uploads = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const goals = readFileSync("src/app/dashboard/goals/page.tsx", "utf8");
  const globalStyles = readFileSync("src/app/globals.css", "utf8");

  for (const page of [uploads, goals]) {
    assert.match(page, /md:hidden/);
    assert.match(page, /min-w-0/);
    assert.match(page, /break-words/);
    assert.match(page, /beast-button/);
  }

  assert.match(dashboard, /data-beast-mobile-shell="home"/);
  assert.match(uploads, /DocumentUploadDropzone/);
  assert.match(goals, /Current goals/);
  assert.match(globalStyles, /width: 100%;/);
  assert.match(globalStyles, /min-width: 0;/);
  assert.doesNotMatch(globalStyles, /overflow-x: (?:clip|hidden)/);
});
