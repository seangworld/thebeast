import assert from "node:assert/strict";
import test from "node:test";
import { buildGuidanceCounselorResponse } from "../src/lib/education";

const context = {
  educationalGoal: "Become a cybersecurity analyst",
  interests: "Cybersecurity and public service",
  careerDirection: "Technology",
  roadmap: "Compare verified education requirements and build practical evidence.",
};

test("BE-206 reasons about prerequisites and certification requirements without inventing them", () => {
  const response = buildGuidanceCounselorResponse({
    question: "What prerequisites and certification requirements do I need?",
    context,
  });

  assert.equal(response.confidence, "needs-verification");
  assert.ok(response.planningTopics.includes("prerequisites"));
  assert.ok(response.planningTopics.includes("certification"));
  assert.match(response.text, /true entry requirements from recommended preparation/i);
  assert.match(response.text, /would not tell you.*mandatory yet/i);
  assert.match(response.text, /credential issuer’s current candidate handbook/i);
  assert.ok(response.authoritativeSources.length >= 2);
});

test("BE-206 compares college pathways and tradeoffs naturally", () => {
  const response = buildGuidanceCounselorResponse({
    question: "Should I start at community college or go straight to a university?",
    context,
  });

  assert.ok(response.planningTopics.includes("college-pathway"));
  assert.match(response.text, /compare at least two credible routes/i);
  assert.match(response.text, /credits that actually apply to the major/i);
  assert.match(response.text, /official transfer or articulation agreement/i);
  assert.doesNotMatch(response.text, /you should choose/i);
});

test("BE-206 gives learning order and time estimates without false precision", () => {
  const response = buildGuidanceCounselorResponse({
    question: "What foundational knowledge should I learn first and how long will it take?",
    context,
  });

  assert.ok(response.planningTopics.includes("foundations"));
  assert.ok(response.planningTopics.includes("learning-order"));
  assert.ok(response.planningTopics.includes("time-estimate"));
  assert.match(response.text, /foundations to proof/i);
  assert.match(response.text, /precise completion date would be false confidence/i);
  assert.match(response.text, /starting level.*verified scope.*hours/i);
});

test("BE-206 frames career progression as evidence-backed options, not guarantees", () => {
  const response = buildGuidanceCounselorResponse({
    question: "How can I progress from an entry-level role toward a promotion?",
    context,
  });

  assert.ok(response.planningTopics.includes("career-progression"));
  assert.match(response.text, /not a guaranteed ladder/i);
  assert.match(response.text, /map the target role backward/i);
  assert.match(response.text, /current employer role descriptions/i);
});

test("BE-206 keeps a warm counselor voice when the question is still broad", () => {
  const response = buildGuidanceCounselorResponse({
    question: "I am not sure what direction fits me.",
    context: {
      educationalGoal: "Define a long-term educational goal together.",
      interests: "Explore the subjects, problems, and environments that fit you.",
      careerDirection: "No career direction has been confirmed yet.",
      roadmap: "No roadmap has been confirmed yet.",
    },
  });

  assert.match(response.text, /Tell me the outcome you are considering/i);
  assert.match(response.text, /keeps your options open/i);
  assert.doesNotMatch(response.text, /\bAs an AI\b|documentation|language model/i);
});
