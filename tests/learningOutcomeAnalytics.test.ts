import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLearningOutcomeAnalytics,
  validateLearningOutcomeEvidence,
  type LearningOutcomeEvidence,
} from "../src/lib/learning/learningOutcomeAnalytics";

const coherentEvidence: LearningOutcomeEvidence[] = [
  { id: "mentor", kind: "mentor_continuity", occurredOn: "2026-07-01", status: "completed", evidenceRef: "mentor-session-1" },
  { id: "guidance", kind: "guidance_goal", occurredOn: "2026-07-02", status: "completed", evidenceRef: "guidance-goal-1" },
  { id: "milestone", kind: "education_milestone", occurredOn: "2026-07-03", status: "in_progress", evidenceRef: "education-plan-1" },
  { id: "cadence", kind: "planner_cadence", occurredOn: "2026-07-04", status: "stalled", evidenceRef: "learning-plan-1" },
  { id: "tutor", kind: "tutor_activity", occurredOn: "2026-07-05", status: "completed", evidenceRef: "tutor-session-1", tutorQuality: 4 },
  { id: "assessment", kind: "assessment", occurredOn: "2026-07-06", status: "completed", evidenceRef: "assessment-1", score: 82 },
];

test("BL-65 reviews guidance planning completion mastery drop-off and tutor quality", () => {
  const analytics = buildLearningOutcomeAnalytics(coherentEvidence);

  assert.equal(analytics.coverage.complete, true);
  assert.deepEqual(analytics.coverage.missingKinds, []);
  assert.equal(analytics.guidance.completionRate, 100);
  assert.equal(analytics.planning.completionRate, 0);
  assert.equal(analytics.learning.completionRate, 67);
  assert.equal(analytics.learning.masteryScore, 82);
  assert.equal(analytics.learning.dropOffCount, 1);
  assert.equal(analytics.learning.tutorQuality, 4);
});

test("BL-65 reports missing evidence honestly and keeps analytics supporting the learner experience", () => {
  const analytics = buildLearningOutcomeAnalytics([coherentEvidence[0]]);

  assert.equal(analytics.coverage.complete, false);
  assert.ok(analytics.coverage.missingKinds.includes("assessment"));
  assert.equal(analytics.planning.completionRate, null);
  assert.equal(analytics.learning.masteryScore, null);
  assert.equal(analytics.learning.tutorQuality, null);
  assert.deepEqual(analytics.boundaries, {
    analyticsAreSupportingContext: true,
    analyticsAreProductCenter: false,
    predictsOutcome: false,
    determinesEligibility: false,
    missingEvidenceIsNotEstimated: true,
  });
});

test("BL-65 validates source integrity and metric ownership", () => {
  const issues = validateLearningOutcomeEvidence([
    { id: "duplicate", kind: "guidance_goal", occurredOn: "not-a-date", status: "completed", evidenceRef: "", score: 101 },
    { id: "duplicate", kind: "assessment", occurredOn: "2026-07-18", status: "completed", evidenceRef: "assessment", tutorQuality: 6 },
  ]);

  assert.ok(issues.some((issue) => /Duplicate/.test(issue)));
  assert.ok(issues.some((issue) => /invalid date/.test(issue)));
  assert.ok(issues.some((issue) => /score must be between/.test(issue)));
  assert.ok(issues.some((issue) => /mastery score only from assessment/.test(issue)));
  assert.ok(issues.some((issue) => /tutor quality only from tutor activity/.test(issue)));
});
