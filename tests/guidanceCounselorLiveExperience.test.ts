import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  discoveryProfileUpdate,
  guidanceDiscoveryProfileFromRow,
  learnFromDiscoveryTurn,
  learnFromGuidanceKnowledgeAnswer,
} from "../src/lib/education/discoveryConversation";
import { buildGuidanceCounselorSessionAwareness } from "../src/lib/education/guidanceCounselorLive";

const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const experience = readFileSync(
  "src/app/dashboard/learning/BeastEducationExperience.tsx",
  "utf8"
);
const workflow = readFileSync(
  "src/lib/education/guidanceWorkflow.ts",
  "utf8"
);
const reasoning = readFileSync(
  "src/lib/education/guidanceCounselorReasoning.ts",
  "utf8"
);

test("BE-401 distinguishes first visits from authoritative returning reviews", () => {
  const now = new Date("2026-07-29T14:00:00");
  const firstVisit = buildGuidanceCounselorSessionAwareness({
    memberName: "Sean Gatewood",
    now,
  });
  assert.equal(firstVisit.greeting, "Good afternoon, Sean.");
  assert.equal(firstVisit.firstVisit, true);
  assert.match(firstVisit.opening, /Tell me about your educational journey/);

  const returning = buildGuidanceCounselorSessionAwareness({
    memberName: "Sean Gatewood",
    now,
    previousReviewAt: "2026-07-27T14:00:00",
    previousConversationSummary: "we discussed your IT career direction",
  });
  assert.equal(returning.firstVisit, false);
  assert.equal(returning.elapsedSinceReview, "2 days");
  assert.match(returning.opening, /Last time, we discussed your IT career direction/);
});

test("BE-401 learns the planning profile only from member conversation evidence", () => {
  let profile = guidanceDiscoveryProfileFromRow(null);
  for (const answer of [
    "My educational journey includes an associate degree from Central Community College.",
    "My military training included network operations school in the Air Force.",
    "I worked in infrastructure support and my skills include networking and troubleshooting.",
    "My education budget is $4,000 per year.",
    "I have the GI Bill and I am eligible for VR&E.",
    "My employer offers tuition reimbursement and I am interested in scholarships.",
    "My timeline is to make a career change within 18 months.",
  ]) {
    profile = learnFromDiscoveryTurn(answer, profile);
  }

  assert.ok(profile.educationHistory.length);
  assert.ok(profile.schools.length);
  assert.ok(profile.degrees.length);
  assert.ok(profile.militaryTraining.length);
  assert.ok(profile.experience.length);
  assert.ok(profile.skills.length);
  assert.match(profile.educationBudget, /\$4,000/);
  assert.equal(profile.giBill, true);
  assert.equal(profile.vre, true);
  assert.equal(profile.employerReimbursement, true);
  assert.equal(profile.scholarshipInterest, true);
  assert.match(profile.targetTimeline, /18 months/);

  const persisted = discoveryProfileUpdate(profile);
  assert.deepEqual(
    persisted.discovery_answers.guidance_military_training,
    profile.militaryTraining
  );
  assert.equal(persisted.discovery_answers.guidance_gi_bill, true);
  assert.equal(
    persisted.discovery_answers.guidance_employer_reimbursement,
    true
  );
});

test("BE-401 knowledge-card conversations can add and correct structured context", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  const added = learnFromGuidanceKnowledgeAnswer(
    "I earned a bachelor's degree in information systems.",
    "degrees",
    blank
  );
  assert.deepEqual(added.degrees, [
    "I earned a bachelor's degree in information systems.",
  ]);

  const corrected = learnFromGuidanceKnowledgeAnswer(
    "Actually, my goal is cloud security architecture.",
    "career-goals",
    { ...added, goal: "network support", careerInterests: ["network support"] }
  );
  assert.equal(
    corrected.goal,
    "Actually, my goal is cloud security architecture."
  );
  assert.deepEqual(corrected.careerInterests, [
    "Actually, my goal is cloud security architecture.",
  ]);
});

test("BE-401 keeps conversation primary and reuses shared professional infrastructure", () => {
  assert.match(conversation, /ProfessionalExperienceFramework/);
  assert.match(conversation, /ProfessionalKnowledgeWorkspace/);
  assert.match(conversation, /ProfessionalConversationHistory/);
  assert.match(conversation, /ProfessionalTimeAwareness/);
  assert.match(conversation, /ProfessionalMemoryTimeline/);
  assert.match(conversation, /learnFromGuidanceKnowledgeAnswer/);
  assert.match(conversation, /SupabaseAgentMemoryStore/);
  assert.match(conversation, /SupabaseExecutionHistoryStore/);
  assert.match(conversation, /Recommendation history/);
  assert.match(conversation, /What worked for you/);
  assert.match(experience, /recommendation=\{recommendation\}/);
  assert.doesNotMatch(experience, /\.from\("learning_courses"\)/);
});

test("BE-401 live Generation 1 surfaces remain planning-only", () => {
  const liveSources = [conversation, experience, workflow, reasoning].join("\n");
  for (const legacyPhrase of [
    "Starter Lesson",
    "Begin Lesson",
    "Continue Lesson",
    "Grade-level recommendation",
    "Lesson suggestions",
    "Study Activities",
    "Learning Activities",
    "Tutor Handoff",
    "Hand off to Tutor",
  ]) {
    assert.doesNotMatch(liveSources, new RegExp(legacyPhrase, "i"));
  }
  assert.match(
    liveSources,
    /Career Planning|schools|certifications|scholarships|roadmap|GI Bill|VR&E/i
  );
});
