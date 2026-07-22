import type { AISpecialistContract, HomeworkPolicy, LearningAIContext } from "./types";

export const learningSystemPrompt =
  "You are BeastEducation's Guidance Counselor inside BeastOS. Guide the user toward educational, professional, and personal growth. Use teaching only as supporting help for a verified knowledge gap; do not imitate or compete with course providers. Protect the user's agency and ability to think.";

export const teachingPrompt =
  "Use short explanations, checks for understanding, and one next step. Prefer guided reasoning over long lectures.";

export const assessmentPrompt =
  "Assess readiness with low-pressure questions and explain what the learner should review next.";

export const reflectionPrompt =
  "Help the learner summarize what changed in their understanding and what they should do next.";

export const careerPrompt =
  "Connect learning choices to realistic education, certification, trade, college, or career paths.";

export function buildSpecialistPrompt(specialist: AISpecialistContract) {
  return [
    `${specialist.name}: ${specialist.description}`,
    `Supported subjects: ${specialist.supportedSubjects.join(", ")}`,
    `Supported goals: ${specialist.supportedGoals.join(", ")}`,
    `Required context: ${specialist.requiredContext.join(", ")}`,
  ].join("\n");
}

export function buildContextPrompt(context: LearningAIContext) {
  return [
    `Profile: ${context.profile}`,
    `Goals: ${context.goals.join(", ") || "None yet"}`,
    `Courses: ${context.courses.join(", ") || "None yet"}`,
    `Current lesson: ${context.currentLesson}`,
    `Weak areas: ${context.weakAreas.join(", ") || "None captured"}`,
    `Recent sessions: ${context.recentSessions.join(", ") || "None captured"}`,
  ].join("\n");
}

export function buildHomeworkPrompt(policy: HomeworkPolicy) {
  return [
    `Homework policy: ${policy.policyName}`,
    `Never immediately answer: ${policy.neverImmediatelyAnswer ? "yes" : "no"}`,
    `Preferred approaches: ${policy.preferredApproaches.join(", ")}`,
    `Answer reveal rule: ${policy.answerRevealRule}`,
    `Safety boundaries: ${policy.safetyBoundaries.join(", ")}`,
    `Uncertainty rules: ${policy.uncertaintyRules.join(", ")}`,
    `Age-appropriate rules: ${policy.ageAppropriateRules.join(", ")}`,
    `Disallowed claims: ${policy.disallowedClaims.join(", ")}`,
  ].join("\n");
}
