import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuidanceCounselorUnderstanding,
  guidanceDiscoveryProfileFromRow,
  learnFromDiscoveryTurn,
} from "../src/lib/education";

test("BE-228 learns only the career direction from a career statement", () => {
  const learned = learnFromDiscoveryTurn(
    "I want to be an IT professional.",
    guidanceDiscoveryProfileFromRow(null)
  );
  const understanding = buildGuidanceCounselorUnderstanding(learned);

  assert.equal(learned.goal, "IT professional");
  assert.deepEqual(learned.careerInterests, ["IT professional"]);
  assert.equal(learned.currentSituation, "");
  assert.equal(learned.otherEducationalContext, "");
  assert.deepEqual(learned.certifications, []);
  assert.deepEqual(learned.educationalGoals, []);
  assert.deepEqual(learned.learningPreferences, []);
  assert.equal(learned.strengths, "");
  assert.equal(learned.availableStudyTimeKnown, false);
  assert.equal(learned.constraints, "");
  assert.deepEqual(
    understanding.whatIKnow.map((item) => item.area),
    ["career-goals"]
  );
});

test("BE-228 does not treat questions or topic mentions as personal evidence", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  const learned = [
    "Would college be worth it for this career?",
    "Does military experience count?",
    "Should I get an IT certification?",
    "Are videos or hands-on projects better?",
    "Could this take 10 hours a week?",
    "What if cost becomes a problem?",
  ].reduce(
    (profile, message) => learnFromDiscoveryTurn(message, profile),
    blank
  );

  assert.equal(learned.collegeInterest, null);
  assert.equal(learned.militaryExperience, "");
  assert.deepEqual(learned.certifications, []);
  assert.deepEqual(learned.learningPreferences, []);
  assert.equal(learned.availableStudyTimeKnown, false);
  assert.equal(learned.constraints, "");
  assert.equal(learned.currentSituation, "");
  assert.equal(learned.otherEducationalContext, "");
});

test("BE-228 accepts direct evidence for each supported profile area", () => {
  const blank = guidanceDiscoveryProfileFromRow(null);
  const messages = [
    "I currently work as an operations specialist.",
    "I completed technical training in the Army.",
    "I am good at troubleshooting.",
    "I struggle with networking.",
    "I prefer hands-on projects.",
    "I can study 6 hours a week.",
    "My schedule is my main constraint.",
    "I am considering college.",
    "I hold a CompTIA Security+ certification.",
  ];
  const learned = messages.reduce(
    (profile, message) => learnFromDiscoveryTurn(message, profile),
    blank
  );

  assert.equal(learned.currentEmployment, "operations specialist");
  assert.match(learned.otherEducationalContext, /technical training/i);
  assert.equal(learned.strengths, "troubleshooting");
  assert.equal(learned.growthAreas, "networking");
  assert.deepEqual(learned.learningPreferences, ["hands-on"]);
  assert.equal(learned.weeklyHours, 6);
  assert.equal(learned.availableStudyTimeKnown, true);
  assert.match(learned.constraints, /schedule/i);
  assert.equal(learned.collegeInterest, true);
  assert.equal(learned.certifications.length, 1);
});

test("BE-228 preserves previously learned evidence when a later turn is unrelated", () => {
  const saved = guidanceDiscoveryProfileFromRow({
    current_employment: "operations specialist",
    weekly_hours: 6,
    available_study_time_known: true,
  });
  const learned = learnFromDiscoveryTurn(
    "What kinds of certification paths exist?",
    saved
  );

  assert.equal(learned.currentEmployment, "operations specialist");
  assert.equal(learned.weeklyHours, 6);
  assert.equal(learned.availableStudyTimeKnown, true);
  assert.deepEqual(learned.certifications, []);
});
