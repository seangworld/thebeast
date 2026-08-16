import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { guidanceDiscoveryProfileFromRow } from "../src/lib/education";
import { buildGuidanceProactiveOpportunities } from "../src/lib/education/guidanceWorkflow";

const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);

test("BE-201 explains why proactive education and career options fit the member", () => {
  const opportunities = buildGuidanceProactiveOpportunities(
    guidanceDiscoveryProfileFromRow({
      goal: "Become a cybersecurity analyst",
      educational_goals: ["Earn the Security+ certification"],
      college_interest: true,
      constraints: "Tuition cost is a concern",
    })
  );

  for (const id of [
    "career-paths",
    "courses-training",
    "certifications",
    "schools",
    "scholarships-funding",
    "roadmap",
  ]) {
    const opportunity = opportunities.find((item) => item.id === id);
    assert.ok(opportunity, `missing ${id}`);
    assert.ok(opportunity.why.length > 40);
    assert.match(opportunity.href, /^\/dashboard\/education\//);
  }
});

test("BE-201 keeps career context in the canonical proposal review flow", () => {
  assert.match(conversation, /\.eq\("owner_id", memberId\)/);
  assert.match(conversation, /RuntimeProposalReview/);
  assert.match(conversation, /onDecision=\{\(\) => void refreshThreads\(\)\}/);
});
