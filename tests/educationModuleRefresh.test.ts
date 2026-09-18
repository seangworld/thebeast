import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLearningAIContext } from "../src/lib/learning/contextBuilder";
import { buildContextPrompt } from "../src/lib/learning/promptLibrary";
import { buildMentorConversationPresentationPrompt } from "../src/lib/learning/mentorConversationPresentation";
import { buildEducationGuidancePlan } from "../src/lib/education/guidance";
import { beastEducationAgentManifest } from "../src/lib/education/agentManifest";
import type { EducationProfile } from "../src/lib/education/types";

const context = buildLearningAIContext({ learnerName: "Learner", currentLesson: "Fractions", weakAreas: [], mastery: { overallMasteryPercent: 0, confidence: "low", concepts: [], weakConcepts: [], strongestConcepts: [], suggestedReviewTopics: [] } });

test("Tutor context has no invented career or assessed mastery and includes saved learning style/pace", () => {
  assert.equal(context.career, "");
  const prompt = buildContextPrompt({ ...context, learningStyle: "Visual; preferred pace: relaxed" });
  assert.match(prompt, /Visual; preferred pace: relaxed/);
  assert.match(prompt, /Career direction: Not provided; do not assume one/);
  assert.match(prompt, /Mastery evidence: Not assessed/);
  assert.doesNotMatch(prompt, /Security Analyst/);
});

test("Tutor presentation no longer asserts the Guidance Counselor identity", () => {
  const tutor = buildMentorConversationPresentationPrompt({ context, conversationType: "Explanation", outwardPersona: "tutor" });
  assert.match(tutor, /Professional role: Riley Chen, AI Tutor/);
  assert.doesNotMatch(tutor, /Professional role: Guidance Counselor/);
  assert.match(buildMentorConversationPresentationPrompt({ context, conversationType: "Explanation" }), /Professional role: Guidance Counselor/);
  assert.match(readFileSync("src/lib/learning/openai.ts", "utf8"), /outwardPersona: request\.outwardPersona/);
});

test("planning preserves a member's explicit zero study-hour budget", () => {
  const profile = { id: "p", ownerId: "m", currentSituation: "Working", interests: [], strengths: [], goals: [], constraints: [], preferredFormats: [], weeklyHours: 0 } as EducationProfile;
  const result = buildEducationGuidancePlan({ profile, goalKind: "education", goal: "Explore schools" });
  assert.match(result.summary, /0 weekly hours/);
});

test("Education manifest recognizes the released bounded Tutor without enabling dormant courses", () => {
  assert.equal(beastEducationAgentManifest.agents![0].metadata?.teachingPosition, "bounded-tutor-available");
  assert.match(beastEducationAgentManifest.promptTemplates![0].constraints!.join(" "), /released AI Tutor at \/dashboard\/education\/tutor/);
  assert.match(beastEducationAgentManifest.promptTemplates![0].constraints!.join(" "), /course and lesson delivery remains on hold/);
});
