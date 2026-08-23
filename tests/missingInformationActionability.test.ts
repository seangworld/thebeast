import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  guidanceDiscoveryProfileFromRow,
  learnFromGuidanceKnowledgeAnswer,
  discoveryProfileUpdate,
} from "../src/lib/education/discoveryConversation";
import { buildGuidanceCounselorUnderstanding } from "../src/lib/education/guidanceUnderstanding";
import { buildGuidanceWorkflowRecommendation } from "../src/lib/education/guidanceWorkflow";
import { buildGuidanceProactiveOpportunities } from "../src/lib/education/guidanceWorkflow";
import {
  defineMissingInformationRequirement,
  missingInformationWasSatisfied,
} from "../src/lib/platform/agents/missingInformation";

const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const workspace = readFileSync(
  "src/app/components/agents/ProfessionalKnowledgeWorkspace.tsx",
  "utf8"
);
const migration = readFileSync(
  "supabase/migrations/20260724000200_add_education_profiles.sql",
  "utf8"
);

test("BF-122 shared requirements carry a specific question, reason, and immediate input", () => {
  const requirement = defineMissingInformationRequirement({
    requirementId: "career-goals",
    question: "What kind of work sounds interesting to you right now?",
    why: "This helps choose useful paths to compare.",
    input: { kind: "conversation", placeholder: "A short answer is enough." },
  });
  assert.equal(requirement.input.kind, "conversation");
  assert.match(requirement.question, /\?$/);
  assert.match(workspace, /Why I’m asking/);
  assert.match(workspace, /Once your answer is saved, it moves out of this list/);
});

test("BF-122 student answer persists through the existing canonical Education Profile shape and clears", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  assert.ok(
    buildGuidanceCounselorUnderstanding(blank).whatIStillNeed.some(
      (item) => item.area === "career-goals"
    )
  );

  const answered = learnFromGuidanceKnowledgeAnswer(
    "I want to design video games.",
    "career-goals",
    blank
  );
  const remaining = buildGuidanceCounselorUnderstanding(answered).whatIStillNeed.map(
    (item) => item.area
  );
  assert.equal(
    missingInformationWasSatisfied({
      requirementId: "career-goals",
      remainingRequirementIds: remaining,
    }),
    true
  );
  assert.ok(
    buildGuidanceCounselorUnderstanding(answered).whatIKnow.some(
      (item) => item.area === "career-goals" && /video games/.test(item.value || "")
    )
  );
  assert.equal(discoveryProfileUpdate(answered).goal, "I want to design video games.");
  assert.doesNotMatch(remaining.join(" "), /career-goals/);
});

test("BF-122 a material student answer updates planning without being asked again", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  const answered = learnFromGuidanceKnowledgeAnswer(
    "I want to design video games.",
    "career-goals",
    blank
  );
  const recommendation = buildGuidanceWorkflowRecommendation({
    memberName: "Jordan",
    profile: answered,
    hasSavedGoal: false,
    hasSavedPlan: false,
  });
  assert.notEqual(recommendation.action, "goals");
  assert.ok(
    buildGuidanceProactiveOpportunities(answered).some((item) =>
      /video games/i.test(item.why)
    )
  );
});

test("BF-122 completion and privacy behavior are explicit and owner-scoped", () => {
  assert.match(conversation, /I have what I need for now/);
  assert.match(conversation, /user\.id !== memberId/);
  assert.match(conversation, /onConflict: "owner_id"/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.doesNotMatch(workspace, /education_profiles|discovery_answers|owner_id/);
});
