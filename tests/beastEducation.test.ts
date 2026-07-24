import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildEducationGuidancePlan,
  buildAdaptiveEducationInterview,
  buildGuidanceCounselorIntelligence,
  beastEducationAgentManifest,
  connectEducationIntelligenceEvents,
  educationMemoryRecords,
  educationDiscoveryQuestions,
  guidanceCounselorPromptFramework,
  reasonAboutCareerPaths,
  sequenceCertifications,
  summarizeEducationProgress,
  type EducationProfile,
} from "../src/lib/education";
import { BeastAgentsPlatform } from "../src/lib/platform/agents";
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
  assert.deepEqual(complete.resources.map((resource) => resource.providerName), profile.preferredFormats.map((provider) => provider === "Certifications" ? "Certification providers" : provider));
  assert.ok(complete.schoolPlan.length > 0);
});

test("Guidance Counselor owns lifelong guidance while specialists own teaching", () => {
  assert.match(guidanceCounselorPromptFramework.role, /not primary teaching/i);
  assert.match(guidanceCounselorPromptFramework.responsibilities.join(" "), /career, certification, school, book/);
  assert.match(guidanceCounselorPromptFramework.boundaries.join(" "), /hand off/);
  const schoolsProfile = { ...profile, preferredFormats: ["Schools"] as const };
  const plan = buildEducationGuidancePlan({ profile: schoolsProfile, goalKind: "education", goal: "Computer science degree" });
  assert.equal(plan.resources[0].providerName, "Schools");
  assert.match(plan.resources[0].verificationNote || "", /accreditation/);
});

test("G2.3 discovery starts without a fabricated destination and supports the full provider ecosystem", () => {
  const commandCenter = readFileSync("src/app/dashboard/learning/EducationCommandCenter.tsx", "utf8");
  assert.match(commandCenter, /useState\(initialProfile\.goal\)/);
  assert.match(commandCenter, /initialProfile/);
  assert.doesNotMatch(commandCenter, /useState\(\"Cybersecurity analyst\"\)/);
  assert.match(educationDiscoveryQuestions[0].prompt, /Tell me about yourself/i);

  const providerProfile: EducationProfile = {
    ...profile,
    certifications: ["Existing credential"],
    employmentHistory: ["Operations specialist"],
    militaryExperience: ["Prior service"],
    skills: ["facilitation"],
    weaknesses: ["technical portfolio evidence"],
    preferredLearningStyle: "project based",
    careerAspirations: ["security leadership"],
    longTermGoals: ["mentor career changers"],
    preferredFormats: ["LinkedIn Learning", "edX", "Professional organizations"],
  };
  const plan = buildEducationGuidancePlan({ profile: providerProfile, goalKind: "career", goal: "Security leader" });
  assert.deepEqual(plan.resources.map((resource) => resource.providerName), providerProfile.preferredFormats);
  assert.ok(plan.resources.every((resource) => Boolean(resource.verificationNote?.length)));
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

test("G2.3.1 interviews for the highest-value missing education context", () => {
  const questions = buildAdaptiveEducationInterview({
    ...profile,
    currentSituation: "",
    strengths: [],
    constraints: [],
    educationHistory: [],
  }, "career");
  assert.equal(questions.length, 3);
  assert.match(questions.join(" "), /current education, work, and life situation/i);
  assert.match(questions.join(" "), /rely on you/i);
  assert.match(questions.join(" "), /constraints|limits/i);
});

test("G2.3.1 explains personalized next steps and detects cross-module opportunities", () => {
  const plan = buildEducationGuidancePlan({
    profile,
    goalKind: "career",
    goal: "Cybersecurity analyst",
    discoveryAnswers: educationDiscoveryQuestions.map((question) => ({ questionId: question.id, answer: "Known" })),
  });
  const snapshot = buildGuidanceCounselorIntelligence({
    profile,
    plan,
    signals: [
      { id: "progress-1", ownerId: profile.ownerId, source: "progress", occurredAt: "2026-07-21T10:00:00Z", kind: "progress", value: "Completed a network fundamentals project", confidence: "observed" },
      { id: "calendar-1", ownerId: profile.ownerId, source: "calendar", occurredAt: "2026-07-21T11:00:00Z", kind: "opportunity", value: "Local cybersecurity career fair", confidence: "stated" },
      { id: "money-1", ownerId: profile.ownerId, source: "money", occurredAt: "2026-07-21T12:00:00Z", kind: "constraint", value: "Training budget is limited this quarter", confidence: "stated" },
    ],
  });
  assert.equal(snapshot.whereTheyWantToGo, "Cybersecurity analyst");
  assert.match(snapshot.bestNextStep.reason, /earliest incomplete roadmap step/i);
  assert.ok(snapshot.bestNextStep.explanation.some((item) => /Constraints considered/i.test(item)));
  assert.ok(snapshot.recommendations.some((item) => item.opportunity === "Local cybersecurity career fair"));
  assert.ok(snapshot.profileRefinements.some((item) => item.field === "constraints"));
  assert.ok(snapshot.bestNextStep.evidenceIds.includes("progress-1"));
});

test("G2.3.1 sequences certifications from verified prerequisites", () => {
  const sequence = sequenceCertifications([
    { id: "advanced", title: "Advanced credential", prerequisiteIds: ["foundation"], relevance: "Target role", status: "not-started" },
    { id: "foundation", title: "Foundation credential", prerequisiteIds: [], relevance: "Baseline", status: "complete" },
    { id: "specialist", title: "Specialist credential", prerequisiteIds: ["advanced"], relevance: "Optional specialization", status: "not-started" },
  ]);
  assert.deepEqual(sequence.map((item) => item.id), ["advanced", "specialist"]);
});

test("G2.3.1 career reasoning explains alignment gaps and uncertainty", () => {
  const reasoning = reasonAboutCareerPaths(profile, [{
    id: "security-analyst",
    title: "Cybersecurity analyst",
    requiredSkills: ["professional communication", "network analysis"],
    typicalOutcomes: ["entry-level security operations work"],
    evidenceSources: ["current employer role description"],
  }]);
  assert.deepEqual(reasoning[0].alignedStrengths, ["professional communication"]);
  assert.deepEqual(reasoning[0].skillGaps, ["network analysis"]);
  assert.match(reasoning[0].reasonsToExplore.join(" "), /aligns/i);
  assert.match(reasoning[0].uncertainties.join(" "), /require verification/i);
});

test("G2.3.1 uses optional playbooks without requiring them", () => {
  const plan = buildEducationGuidancePlan({ profile, goalKind: "career", goal: "Cybersecurity analyst" });
  const withoutPlaybook = buildGuidanceCounselorIntelligence({ profile, plan });
  const withPlaybook = buildGuidanceCounselorIntelligence({
    profile,
    plan,
    playbook: {
      id: "career-transition",
      version: "1",
      recommend: () => [{
        id: "playbook-review",
        title: "Review transferable evidence",
        action: "Map one existing project to a target-role requirement",
        reason: "The approved playbook prioritizes evidence reuse.",
        explanation: ["This avoids unnecessary retraining."],
        priority: 110,
        confidence: "medium",
        evidenceIds: [],
      }],
    },
  });
  assert.equal(withoutPlaybook.bestNextStep.id, "guidance-next-action");
  assert.equal(withPlaybook.bestNextStep.id, "playbook-review");
});

test("G2.3.1 registers with BeastAgents and preserves owner-scoped long-term memory", async () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(beastEducationAgentManifest);
  assert.equal(platform.registry.require("beasteducation.guidance-counselor").displayName, "Guidance Counselor");

  connectEducationIntelligenceEvents({ events: platform.events, memory: platform.memory });
  await platform.events.publish({
    id: "event-1",
    type: "beasteducation.profile-signal",
    source: "beasteducation",
    timestamp: "2026-07-21T12:00:00.000Z",
    payload: { id: "signal-1", ownerId: profile.ownerId, source: "document", occurredAt: "2026-07-21T12:00:00.000Z", kind: "progress", value: "Added certification evidence", confidence: "observed" } as const,
  });
  const stored = await platform.memory.query({ agentId: "beasteducation.guidance-counselor", ownerId: profile.ownerId, scope: "user" });
  assert.equal(stored.length, 1);
  assert.equal(stored[0].key, "profile-signal:progress");

  const plan = buildEducationGuidancePlan({ profile, goalKind: "career", goal: "Cybersecurity analyst" });
  const snapshot = buildGuidanceCounselorIntelligence({ profile, plan });
  const records = educationMemoryRecords({ ownerId: profile.ownerId, snapshot, now: "2026-07-21T12:00:00.000Z" });
  assert.deepEqual(records.map((record) => record.key), ["user-story", "guidance-continuity", "recognized-milestones"]);
  assert.ok(records.every((record) => record.scope === "user" && record.ownerId === profile.ownerId));
});

test("BeastEducation is canonical while legacy learning routes remain compatible", () => {
  assert.equal(beastLearningNavigation.label, "BeastEducation");
  assert.equal(beastLearningNavigation.href, "/dashboard/education");
  assert.equal(memberBeastEducationNavigation.children?.[0]?.label, "Guidance Counselor");
  assert.equal(beastModuleRegistry.find((module) => module.identifier === "learning")?.name, "BeastEducation");
  assert.match(readFileSync("src/app/dashboard/education/page.tsx", "utf8"), /learning\/page/);
  assert.match(readFileSync("src/app/dashboard/education/goals/page.tsx", "utf8"), /learning\/goals\/page/);
  assert.match(readFileSync("src/app/dashboard/education/activities\/[activityId]\/page.tsx", "utf8"), /learning\/activities\/\[activityId\]\/page/);
  assert.match(readFileSync("src/app/dashboard/learning/page.tsx", "utf8"), /guidanceDiscoveryProfileFromRow/);
});
