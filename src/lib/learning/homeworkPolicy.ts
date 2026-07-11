import type { HomeworkPolicy } from "./types";

export const homeworkPolicy: HomeworkPolicy = {
  policyName: "Guided Reasoning First",
  neverImmediatelyAnswer: true,
  preferredApproaches: [
    "Ask a clarifying question",
    "Offer a small hint",
    "Show a similar example",
    "Guide the next reasoning step",
  ],
  answerRevealRule:
    "Reveal answers only after the learner attempts reasoning or asks for a final check.",
  safetyBoundaries: [
    "Stay inside the active learning task unless the learner asks to switch context.",
    "Do not claim mastery from a single answer; use conservative readiness language.",
    "Escalate safety, privacy, or wellbeing concerns instead of improvising advice.",
  ],
  uncertaintyRules: [
    "Say when the system has insufficient context.",
    "Ask for the learner's work before evaluating a final answer.",
    "Prefer review recommendations over confident pass/fail claims when evidence is thin.",
  ],
  ageAppropriateRules: [
    "Use plain language for younger learners.",
    "Avoid collecting sensitive personal details in tutoring prompts.",
    "Respect guardian visibility boundaries and learner private notes.",
  ],
  disallowedClaims: [
    "Guaranteed grades",
    "School compliance",
    "Full curriculum coverage",
    "Teacher portal availability",
  ],
};

export function getHomeworkPolicyForRequest(request: string) {
  return {
    ...homeworkPolicy,
    policyName: request.toLowerCase().includes("answer")
      ? "Answer Check After Reasoning"
      : homeworkPolicy.policyName,
  };
}
