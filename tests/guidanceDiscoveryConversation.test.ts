import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  discoveryProfileUpdate,
  guidanceDiscoveryProfileFromRow,
  learnFromDiscoveryTurn,
  nextDiscoveryQuestion,
} from "../src/lib/education/discoveryConversation";

const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const page = readFileSync(
  "src/app/dashboard/learning/BeastEducationExperience.tsx",
  "utf8"
);
const liveExperience = readFileSync(
  "src/lib/education/guidanceCounselorLive.ts",
  "utf8"
);
const migration = readFileSync(
  "supabase/migrations/20260724000300_add_guidance_discovery_profile_fields.sql",
  "utf8"
);

test("BE-216 begins with the Guidance Counselor instead of a profile form", () => {
  assert.match(conversation, /sessionAwareness\.greeting/);
  assert.match(liveExperience, /I’m your Guidance Counselor/);
  assert.match(liveExperience, /Tell me about your educational journey/);
  assert.doesNotMatch(page, /<EducationCommandCenter/);
});

test("BE-216 asks one logical discovery question at a time", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  assert.equal(
    nextDiscoveryQuestion(blank),
    "Tell me about your educational journey."
  );
  const afterJourney = learnFromDiscoveryTurn(
    "I earned an associate degree at a community college.",
    blank
  );
  assert.equal(
    nextDiscoveryQuestion(afterJourney),
    "What would you like education or career guidance to help you change?"
  );
  const afterGoal = learnFromDiscoveryTurn(
    "I want a career in cybersecurity",
    afterJourney
  );
  assert.equal(
    nextDiscoveryQuestion(afterGoal),
    "What does your current work, school, or military situation look like?"
  );
  assert.equal((nextDiscoveryQuestion(afterGoal).match(/\?/g) || []).length, 1);
});

test("BE-216 learns profile context naturally from member turns", () => {
  let profile = guidanceDiscoveryProfileFromRow(null);
  profile = learnFromDiscoveryTurn(
    "I currently work as an operations specialist and want a career in cybersecurity",
    profile
  );
  profile = learnFromDiscoveryTurn(
    "I am good at troubleshooting, prefer hands-on projects, and can study 6 hours a week",
    profile
  );
  profile = learnFromDiscoveryTurn(
    "I am a veteran considering college, and I hold a Security+ certification",
    profile
  );

  assert.deepEqual(profile.careerInterests, ["cybersecurity"]);
  assert.match(profile.currentEmployment, /operations specialist/);
  assert.match(profile.strengths, /troubleshooting/);
  assert.deepEqual(profile.learningPreferences, ["hands-on"]);
  assert.equal(profile.weeklyHours, 6);
  assert.equal(profile.availableStudyTimeKnown, true);
  assert.equal(profile.collegeInterest, true);
  assert.match(profile.militaryExperience, /veteran/);
  assert.equal(profile.certifications.length > 0, true);
});

test("BE-216 persists discovery behind the conversation with owner isolation", () => {
  assert.match(conversation, /\.from\("education_profiles"\)/);
  assert.match(conversation, /owner_id: memberId/);
  assert.match(conversation, /onConflict: "owner_id"/);
  assert.match(migration, /alter table public\.education_profiles/);
  for (const field of [
    "career_interests",
    "educational_goals",
    "learning_preferences",
    "certifications",
    "available_study_time_known",
    "college_interest",
    "trade_interest",
    "current_employment",
    "military_experience",
    "other_educational_context",
  ]) {
    assert.match(migration, new RegExp(field));
  }
});

test("BE-216 reuses saved discovery context in conversation and guidance", () => {
  const knowledgeWorkspace = readFileSync(
    "src/app/components/agents/ProfessionalKnowledgeWorkspace.tsx",
    "utf8"
  );
  assert.match(page, /guidanceDiscoveryProfileFromRow/);
  assert.match(page, /initialProfile=\{profile\}/);
  assert.match(conversation, /ProfessionalKnowledgeWorkspace/);
  assert.match(knowledgeWorkspace, /What I Know/);
  assert.match(knowledgeWorkspace, /What I Think/);
  assert.match(knowledgeWorkspace, /What I Still Need/);
  assert.match(conversation, /router\.refresh\(\)/);
  assert.match(conversation, /I’ll remember this for future guidance/);
});

test("BE-201 learns work and life context gradually and persists it as counselor memory", () => {
  const learned = [
    "My income goal is $95,000 within three years.",
    "Long term, I want to build a stable career that leaves room for my family.",
    "I have technical experience with network systems and IT support.",
    "I am interested in leadership and management.",
    "I prefer remote work on practical problems and projects.",
    "I am open to government and private sector roles.",
    "I cannot travel because of family caregiving responsibilities.",
  ].reduce(
    (profile, message) => learnFromDiscoveryTurn(message, profile),
    guidanceDiscoveryProfileFromRow(null)
  );

  assert.match(learned.incomeGoal, /95,000/);
  assert.match(learned.longTermGoals, /stable career/i);
  assert.equal(learned.technicalExperience.length, 1);
  assert.equal(learned.leadershipInterest, true);
  assert.equal(learned.workLocationPreference, "remote");
  assert.match(learned.sectorPreference, /government and private/i);
  assert.match(learned.travelWillingness, /cannot travel/i);
  assert.match(learned.familyConsiderations, /caregiving/i);

  const update = discoveryProfileUpdate(learned);
  assert.equal(
    update.discovery_answers.guidance_income_goal,
    learned.incomeGoal
  );
  assert.deepEqual(
    update.discovery_answers.guidance_technical_experience,
    learned.technicalExperience
  );
  assert.equal(
    update.discovery_answers.guidance_family_considerations,
    learned.familyConsiderations
  );
});
