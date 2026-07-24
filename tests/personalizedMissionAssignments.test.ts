import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGuidanceCounselorMissionAssignment } from "../src/lib/learning/missionAssignment";
import type { MentorHomeMission } from "../src/lib/learning/mentorHome";

const mission: MentorHomeMission = {
  state: "next_activity",
  greeting: "Hi Sean.",
  missionTitle: "CIDR notation",
  missionLabel: "Today’s adaptive mission",
  durationLabel: "18 minutes",
  recommendationReason:
    "Your last saved work was Subnetting warmup, so this is the next available activity.",
  currentGoalLabel: "Security+ certification",
  recentProgressLabel: "Subnetting warmup",
  weakAreaLabel: "Networking foundations",
  nextAfterLabel:
    "After this, I will decide whether to continue, review, remediate, or advance.",
  journeyProgressLabel: "Two of six milestones complete.",
  journeyRemainingLabel: "Four milestones remain.",
  journeyMilestoneLabel: "Explain CIDR ranges",
  journeyUnlockLabel: "A review may unlock.",
  primaryAction: {
    label: "Start mission",
    href: "/dashboard/education/activities/activity-1",
    detail: "Bring in the Tutor.",
  },
  secondaryActions: [],
  hasSufficientLearnerData: true,
};

test("BE-210 personally assigns today's adaptive mission", () => {
  const assignment = buildGuidanceCounselorMissionAssignment(
    "Sean Carter",
    mission
  );

  assert.equal(
    assignment.introduction,
    "Sean, I’d like us to begin here today."
  );
  assert.equal(assignment.actionLabel, "Begin here today");
  assert.doesNotMatch(assignment.actionLabel, /Start Mission/i);
});

test("BE-210 explains why outcome roadmap connection and next step", () => {
  const assignment = buildGuidanceCounselorMissionAssignment("Sean", mission);

  assert.equal(assignment.why, mission.recommendationReason);
  assert.match(assignment.expectedOutcome, /fresh evidence/i);
  assert.match(assignment.roadmapConnection, /Security\+ certification/);
  assert.match(assignment.roadmapConnection, /Explain CIDR ranges/);
  assert.equal(assignment.afterCompletion, mission.nextAfterLabel);
});

test("BE-210 changes presentation without changing adaptive planning", () => {
  const component = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );
  const planner = readFileSync("src/lib/learning/mentorHome.ts", "utf8");

  for (const label of [
    "Why I chose this",
    "Expected outcome",
    "Roadmap connection",
    "What happens after",
  ]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /assignment\.actionLabel/);
  assert.match(planner, /withAdaptiveReason/);
  assert.match(planner, /adaptiveProgression/);
});

test("BE-210 adapts counselor language to resume review and planning states", () => {
  assert.match(
    buildGuidanceCounselorMissionAssignment("Sean", {
      ...mission,
      state: "resume",
    }).introduction,
    /continue here today/
  );
  assert.equal(
    buildGuidanceCounselorMissionAssignment("Sean", {
      ...mission,
      state: "review",
    }).actionLabel,
    "Review this with me"
  );
  assert.equal(
    buildGuidanceCounselorMissionAssignment("Sean", {
      ...mission,
      state: "completed_queue",
    }).actionLabel,
    "Plan our next step"
  );
});
