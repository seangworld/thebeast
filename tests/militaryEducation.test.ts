import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMilitaryEducationPlan,
  militaryEducationBoundaries,
  militaryEducationConcepts,
  validateMilitaryEducationCatalog,
} from "../src/lib/learning/militaryEducation";

test("BL-57 catalog covers required military education concepts with official sources", () => {
  assert.deepEqual(
    militaryEducationConcepts.map(({ id }) => id),
    ["asvab", "cool", "tuition_assistance", "gi_bill", "skillbridge"]
  );
  assert.equal(validateMilitaryEducationCatalog().length, 0);
  for (const concept of militaryEducationConcepts) {
    assert.match(concept.officialSource.url, /^https:\/\//);
    assert.equal(concept.informationalOnly, true);
    assert.equal(concept.eligibilityDetermination, false);
    assert.ok(concept.questionsToVerify.length >= 2);
  }
});

test("BL-57 plan preserves learner choice and does not rank or determine eligibility", () => {
  const plan = buildMilitaryEducationPlan({
    learnerGoal: "Compare credential and transition paths",
    serviceContext: "Transition planning",
    conceptIds: ["cool", "skillbridge", "cool"],
  });

  assert.equal(plan.learnerGoal, "Compare credential and transition paths");
  assert.equal(plan.serviceContext, "Transition planning");
  assert.deepEqual(plan.concepts.map(({ id }) => id), ["cool", "skillbridge"]);
  assert.equal(plan.ranked, false);
  assert.equal(plan.eligibilityDetermined, false);
  assert.match(plan.nextSteps[0], /official source/);
  assert.ok(militaryEducationBoundaries.some((boundary) => /does not rank/.test(boundary)));
});

test("BL-57 catalog validation rejects unsafe or nonofficial metadata", () => {
  const unsafe = [{
    ...militaryEducationConcepts[0],
    officialSource: { ...militaryEducationConcepts[0].officialSource, url: "http://example.com/asvab" },
    informationalOnly: false,
    eligibilityDetermination: true,
  }] as unknown as typeof militaryEducationConcepts;

  const issues = validateMilitaryEducationCatalog(unsafe);
  assert.ok(issues.some((issue) => /approved HTTPS/.test(issue)));
  assert.ok(issues.some((issue) => /may not determine eligibility/.test(issue)));
  assert.ok(issues.some((issue) => /Missing required military education concept/.test(issue)));
});
