import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildGuidanceCareerGoalProposal,
  guidanceDiscoveryProfileFromRow,
  hasMatchingGuidanceCareerGoal,
} from "../src/lib/education";
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

test("BE-201 proposes only verified career goals and never activates them", () => {
  const proposal = buildGuidanceCareerGoalProposal(
    guidanceDiscoveryProfileFromRow({
      goal: "Become a cybersecurity analyst",
    })
  );
  assert.deepEqual(proposal, {
    title: "Become a cybersecurity analyst",
    category: "Career",
    status: "Proposed",
    summary:
      "Proposed from a verified career goal stated in a Guidance Counselor conversation. Review it in Beast Goals before treating it as active.",
    current_step: "Review this proposed career goal in Beast Goals.",
    source_module: "learning",
  });
  assert.equal(
    buildGuidanceCareerGoalProposal(
      guidanceDiscoveryProfileFromRow({
        career_interests: ["cybersecurity"],
      })
    ),
    undefined
  );
});

test("BE-201 deduplicates proposed Goals and preserves Beast Goals ownership", () => {
  const proposal = buildGuidanceCareerGoalProposal(
    guidanceDiscoveryProfileFromRow({ goal: "Become a cybersecurity analyst" })
  );
  assert.ok(proposal);
  assert.equal(
    hasMatchingGuidanceCareerGoal(proposal, [
      { title: "Become a Cybersecurity Analyst!", status: "Active" },
    ]),
    true
  );
  assert.match(conversation, /\.eq\("owner_id", memberId\)/);
  assert.match(conversation, /owner_id: memberId,[\s\S]*\.\.\.goalProposal/);
  assert.match(conversation, /added to Beast Goals[\s\S]*proposal for your review/);
});
