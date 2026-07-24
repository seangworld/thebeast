import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  guidanceDiscoveryProfileFromRow,
  learnFromDiscoveryTurn,
  nextDiscoveryQuestion,
} from "../src/lib/education/discoveryConversation";

const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260724000300_add_guidance_discovery_profile_fields.sql",
  "utf8"
);

test("BE-216 begins with the Guidance Counselor instead of a profile form", () => {
  assert.match(conversation, /greeting=\{`Hi\$\{memberName/);
  assert.match(conversation, /I’m your Guidance Counselor/);
  assert.match(conversation, /How can I help you today/);
  assert.doesNotMatch(page, /<EducationCommandCenter/);
});

test("BE-216 asks one logical discovery question at a time", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  assert.equal(
    nextDiscoveryQuestion(blank),
    "What would you like education or career guidance to help you change?"
  );
  const afterGoal = learnFromDiscoveryTurn(
    "I want a career in cybersecurity",
    blank
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
    "I am a veteran considering college and a Security+ certification",
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
  assert.match(page, /guidanceDiscoveryProfileFromRow/);
  assert.match(page, /initialProfile=\{guidanceDiscoveryProfile\}/);
  assert.match(conversation, /What I’ve learned about you/);
  assert.match(conversation, /router\.refresh\(\)/);
  assert.match(conversation, /I’ll remember this for future guidance/);
});
