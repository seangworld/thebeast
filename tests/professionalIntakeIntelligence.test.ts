import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGuidanceCounselorConversationTurn,
  guidanceDiscoveryProfileFromRow,
  learnFromDiscoveryTurn,
  planProfessionalIntake,
} from "../src/lib/education";

const context = {
  educationalGoal: "Define a long-term educational goal together.",
  interests: "Explore what fits.",
  careerDirection: "No career direction has been confirmed yet.",
  roadmap: "No roadmap has been confirmed yet.",
};

test("BE-221 gives every intake question a professional purpose and consequence", () => {
  const decision = planProfessionalIntake({
    profile: guidanceDiscoveryProfileFromRow(null),
  });

  assert.equal(decision?.area, "career-goals");
  assert.ok((decision?.purpose.length || 0) > 30);
  assert.ok((decision?.expectedInfluence.length || 0) > 30);
  assert.equal(decision?.stage, "orientation");
  assert.equal(decision?.specificity, "broad");
});

test("BE-221 makes questions more specific as understanding improves", () => {
  const profile = guidanceDiscoveryProfileFromRow({
    goal: "Become a cybersecurity analyst",
    current_situation: "Working full time in operations",
    current_employment: "operations specialist",
    strengths: "troubleshooting",
    learning_preferences: ["hands-on"],
  });
  const decision = planProfessionalIntake({ profile });

  assert.equal(decision?.area, "educational-goals");
  assert.equal(decision?.stage, "planning");

  const priorExperience = planProfessionalIntake({
    profile: guidanceDiscoveryProfileFromRow({
      goal: "Become a cybersecurity analyst",
      educational_goals: ["Build job-ready evidence"],
      current_employment: "operations specialist",
    }),
    topics: ["prerequisites"],
  });
  assert.match(
    priorExperience?.question || "",
    /toward Become a cybersecurity analyst/
  );
  assert.equal(priorExperience?.specificity, "focused");
});

test("BE-221 lets each answer change the next professional question", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  const first = planProfessionalIntake({ profile: blank });
  const learned = learnFromDiscoveryTurn(
    "I want a career in cybersecurity",
    blank
  );
  const second = planProfessionalIntake({ profile: learned });

  assert.equal(first?.area, "career-goals");
  assert.equal(second?.area, "educational-goals");
  assert.notEqual(first?.question, second?.question);
});

test("BE-221 does not repeat a question already asked in conversation history", () => {
  const profile = guidanceDiscoveryProfileFromRow(null);
  const first = planProfessionalIntake({ profile });
  const second = planProfessionalIntake({
    profile,
    previousCounselorResponses: [
      `Here is why this matters. ${first?.question}`,
    ],
  });

  assert.equal(first?.area, "career-goals");
  assert.equal(second?.area, "educational-goals");
});

test("BE-221 asks at most one relevant intake question without exposing mechanics", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "How long will this path take?",
    context,
    profile: guidanceDiscoveryProfileFromRow(null),
  });

  assert.equal(turn.intakeDecision?.area, "weekly-study-time");
  assert.equal((turn.text.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(
    turn.text,
    /intake|profile field|questionnaire|expectedInfluence/i
  );
});

test("BE-221 supports longitudinal intake from persisted understanding", () => {
  const persisted = guidanceDiscoveryProfileFromRow({
    goal: "Advance into cybersecurity",
    educational_goals: ["Earn role-ready evidence"],
    current_employment: "operations specialist",
    other_educational_context: "Prior IT support training",
    strengths: "troubleshooting",
    growth_areas: "networking",
    weekly_hours: 6,
    available_study_time_known: true,
    learning_preferences: ["hands-on"],
    constraints: "evening schedule",
    college_interest: false,
    trade_interest: false,
  });
  const decision = planProfessionalIntake({ profile: persisted });

  assert.equal(decision, undefined);
});
