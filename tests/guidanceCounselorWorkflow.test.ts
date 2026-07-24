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
  assert.equal(result.href, "/dashboard/education/goals");
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

test("BE-218 sequences roadmap before Tutor and Tutor after active learning begins", () => {
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
    "tutor"
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
      "tutor",
    ])
  );
  for (const result of scenarios) {
    assert.ok(result.why.length > 40);
    assert.ok(result.actionLabel);
    assert.ok(result.href.startsWith("/dashboard/education"));
  }
});

test("BE-218 homepage presents the Counselor decision and keeps the adaptive assignment", () => {
  const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
  const component = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );

  assert.match(page, /buildGuidanceWorkflowRecommendation/);
  assert.match(component, /Why I’m recommending this/);
  assert.match(component, /nextAction\.href/);
  assert.match(component, /data-guidance-next-action/);
  assert.match(component, /Today’s assignment from your Guidance Counselor/);
  assert.match(component, /mission\.primaryAction\.href/);
});
