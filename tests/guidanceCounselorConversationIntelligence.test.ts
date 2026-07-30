import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuidanceCounselorConversationTurn,
  guidanceDiscoveryProfileFromRow,
} from "../src/lib/education";

const context = {
  educationalGoal: "Become a cybersecurity analyst",
  interests: "Cybersecurity and public service",
  careerDirection: "Technology",
  roadmap: "Build foundations, verify requirements, and create practical evidence.",
};

function profile(
  values: Record<string, unknown> = {}
) {
  return guidanceDiscoveryProfileFromRow({
    goal: "Become a cybersecurity analyst",
    current_employment: "operations specialist",
    weekly_hours: 6,
    available_study_time_known: true,
    learning_preferences: ["hands-on"],
    constraints: "evening schedule",
    ...values,
  });
}

test("BE-225 leads with natural guidance and known context", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "What should I learn first?",
    context,
    profile: profile(),
  });

  assert.match(turn.text, /interested in becoming a cybersecurity analyst/);
  assert.doesNotMatch(turn.text, /I recommend|keeping .* in view/i);
  assert.ok(turn.referencedContext.length > 0);
  assert.doesNotMatch(turn.text, /\bAs an AI\b|language model|documentation/i);
});

test("BE-225 asks one natural qualifier only when it improves the answer", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "How long will the certification path take?",
    context,
    profile: profile({ weekly_hours: 0, available_study_time_known: false }),
  });

  assert.equal(
    turn.followUp,
    "How many hours could you realistically protect for this in a typical week?"
  );
  assert.equal((turn.text.match(/\?/g) || []).length, 1);
});

test("BE-225 does not ask for context the member already provided", () => {
  const known = profile({
    other_educational_context: "Prior IT support training",
    certifications: ["CompTIA A+"],
    discovery_answers: {
      guidance_education_history: ["Prior IT support training"],
      guidance_degrees: ["No completed degree"],
      guidance_experience: ["Operations and IT support experience"],
    },
  });
  const turn = buildGuidanceCounselorConversationTurn({
    question: "What certification prerequisites should I check?",
    context,
    profile: known,
  });

  assert.equal(turn.followUp, undefined);
  assert.doesNotMatch(
    turn.text,
    /What relevant education, training, or credentials are you already bringing/
  );
  assert.equal((turn.text.match(/\?/g) || []).length, 0);
});

test("BE-225 avoids interrogating broad or uncertain members", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "I am not sure what direction fits me.",
    context: {
      educationalGoal: "Define a long-term educational goal together.",
      interests: "Explore what fits.",
      careerDirection: "No career direction has been confirmed yet.",
      roadmap: "No roadmap has been confirmed yet.",
    },
    profile: guidanceDiscoveryProfileFromRow(null),
  });

  assert.match(turn.text, /don’t need to have everything figured out/i);
  assert.doesNotMatch(turn.text, /I recommend|not a generic education plan/i);
  assert.equal((turn.text.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(turn.text, /Tell me the outcome.*where you are starting.*constraints/i);
});
