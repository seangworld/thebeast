import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGuidanceWorkflowRecommendation,
  type GuidanceWorkflowInput,
} from "../src/lib/education/guidanceWorkflow";
import type { GuidanceDiscoveryProfile } from "../src/lib/education/discoveryConversation";

const blankProfile: GuidanceDiscoveryProfile = {
  goal: "",
  currentSituation: "",
  strengths: "",
  growthAreas: "",
  constraints: "",
  weeklyHours: 0,
  availableStudyTimeKnown: false,
  selectedProviders: [],
  careerInterests: [],
  educationalGoals: [],
  learningPreferences: [],
  certifications: [],
  collegeInterest: null,
  tradeInterest: null,
  currentEmployment: "",
  militaryExperience: "",
  otherEducationalContext: "",
};

function recommend(
  profile: Partial<GuidanceDiscoveryProfile> = {},
  state: Partial<Omit<GuidanceWorkflowInput, "profile" | "memberName">> = {}
) {
  return buildGuidanceWorkflowRecommendation({
    memberName: "Sean Carter",
    profile: { ...blankProfile, ...profile },
    hasSavedGoal: false,
    hasSavedPlan: false,
    activeCourseCount: 0,
    openSessionCount: 0,
    ...state,
  });
}

test("BE-218 starts with a goal instead of exposing unrelated workspaces", () => {
  const result = recommend();

  assert.equal(result.action, "goals");
  assert.equal(result.href, "/dashboard/education/guidance-counselor");
  assert.match(result.why, /do not know your intended outcome/i);
});

test("BE-218 introduces planning workspaces only from relevant member context", () => {
  assert.equal(
    recommend({ careerInterests: ["Cybersecurity"] }).action,
    "career-planning"
  );
  assert.equal(
    recommend({
      goal: "Earn a degree in nursing",
      educationalGoals: ["Earn a degree"],
      collegeInterest: true,
    }).action,
    "schools"
  );
  assert.equal(
    recommend({
      goal: "Earn a degree in nursing",
      educationalGoals: ["Earn a degree"],
      collegeInterest: true,
      constraints: "Tuition cost is my main constraint",
    }).action,
    "scholarships"
  );
  assert.equal(
    recommend({
      goal: "Earn the Security+ certification",
      educationalGoals: ["Prepare for the certification"],
    }).action,
    "certifications"
  );
});

test("BP-400 keeps active learning connected to Roadmap without exposing Tutor", () => {
  const profile = {
    goal: "Move into cybersecurity",
    educationalGoals: ["Build the required foundations"],
  };

  assert.equal(recommend(profile).action, "roadmap");
  assert.equal(
    recommend(profile, {
      hasSavedGoal: true,
      hasSavedPlan: true,
      activeCourseCount: 1,
    }).action,
    "roadmap"
  );
});

test("BE-218 every recommendation explains why and names one action", () => {
  const scenarios = [
    recommend(),
    recommend({ careerInterests: ["Design"] }),
    recommend({
      goal: "Earn a degree",
      educationalGoals: ["College degree"],
      collegeInterest: true,
    }),
    recommend({
      goal: "Earn a degree",
      educationalGoals: ["College degree"],
      collegeInterest: true,
      constraints: "I need financial aid",
    }),
    recommend({
      goal: "Professional certification",
      educationalGoals: ["Certification"],
    }),
    recommend({
      goal: "Advance at work",
      educationalGoals: ["Build new skills"],
    }),
    recommend(
      {
        goal: "Advance at work",
        educationalGoals: ["Build new skills"],
      },
      { hasSavedGoal: true, hasSavedPlan: true, openSessionCount: 1 }
    ),
  ];

  assert.deepEqual(
    new Set(scenarios.map(({ action }) => action)),
    new Set([
      "goals",
      "career-planning",
      "schools",
      "scholarships",
      "certifications",
      "roadmap",
    ])
  );
  for (const result of scenarios) {
    assert.ok(result.why.length > 40);
    assert.ok(result.actionLabel);
    assert.ok(result.href.startsWith("/dashboard/education"));
  }
});

test("BP-400 dashboard presents the Counselor decision without teaching assignments", () => {
  const component = readFileSync(
    "src/app/dashboard/learning/BeastEducationExperience.tsx",
    "utf8"
  );

  assert.match(component, /buildGuidanceWorkflowRecommendation/);
  assert.match(component, /Why this matters/);
  assert.match(component, /recommendation\.href/);
  assert.match(component, /data-education-owner="guidance-counselor"/);
  assert.doesNotMatch(component, /Today’s assignment|mission\.primaryAction/);
});
