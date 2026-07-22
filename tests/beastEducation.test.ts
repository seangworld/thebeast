import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildEducationGuidancePlan,
  educationDiscoveryQuestions,
  summarizeEducationProgress,
  type EducationProfile,
} from "../src/lib/education";
import { beastLearningNavigation, memberBeastEducationNavigation } from "../src/lib/moduleNavigation";
import { beastModuleRegistry } from "../src/lib/moduleRegistry";

const profile: EducationProfile = {
  id: "education-profile-1",
  ownerId: "user-1",
  currentSituation: "Working full time",
  interests: ["cybersecurity"],
  strengths: ["professional communication"],
  goals: ["Become a cybersecurity analyst"],
  constraints: ["five hours per week"],
  preferredFormats: ["YouTube", "Khan Academy", "Coursera", "Microsoft Learn", "Books", "Certifications"],
  weeklyHours: 5,
};

test("BeastEducation discovery progressively assembles a guidance-first plan", () => {
  const initial = buildEducationGuidancePlan({ profile, goalKind: "career", goal: "Cybersecurity analyst" });
  assert.equal(initial.discoveryComplete, false);
  assert.equal(initial.nextAction, educationDiscoveryQuestions[0].prompt);
  assert.match(initial.teachingSupport, /supporting tools/i);
  assert.ok(initial.boundaries.some((boundary) => /does not compete/i.test(boundary)));

  const complete = buildEducationGuidancePlan({
    profile,
    goalKind: "career",
    goal: "Cybersecurity analyst",
    discoveryAnswers: educationDiscoveryQuestions.map((question) => ({ questionId: question.id, answer: "Known" })),
  });
  assert.equal(complete.discoveryComplete, true);
  assert.equal(complete.unansweredQuestions.length, 0);
  assert.ok(complete.careerPlan.length > 0);
  assert.ok(complete.educationPlan.length > 0);
  assert.ok(complete.certificationPlan.length > 0);
  assert.deepEqual(complete.resources.map((resource) => resource.provider), profile.preferredFormats);
});

test("BeastEducation tracks meaningful long-term roadmap progress", () => {
  const plan = buildEducationGuidancePlan({ profile, goalKind: "certification", goal: "Security certification" });
  const progress = summarizeEducationProgress(plan.roadmap, [{
    id: "event-1",
    profileId: profile.id,
    milestoneId: "verify",
    occurredAt: "2026-07-21T12:00:00.000Z",
    kind: "completed",
    summary: "Verified current official objectives.",
  }]);
  assert.equal(progress.totalMilestones, 4);
  assert.equal(progress.completedMilestones, 1);
  assert.equal(progress.percent, 25);
  assert.equal(progress.latestMeaningfulUpdate?.summary, "Verified current official objectives.");
});

test("BeastEducation is canonical while legacy learning routes remain compatible", () => {
  assert.equal(beastLearningNavigation.label, "BeastEducation");
  assert.equal(beastLearningNavigation.href, "/dashboard/education");
  assert.equal(memberBeastEducationNavigation.children?.[0]?.label, "Guidance Counselor");
  assert.equal(beastModuleRegistry.find((module) => module.identifier === "learning")?.name, "BeastEducation");
  assert.match(readFileSync("src/app/dashboard/education/page.tsx", "utf8"), /learning\/page/);
  assert.match(readFileSync("src/app/dashboard/learning/page.tsx", "utf8"), /EducationCommandCenter/);
});
