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
};

export function getHomeworkPolicyForRequest(request: string) {
  return {
    ...homeworkPolicy,
    policyName: request.toLowerCase().includes("answer")
      ? "Answer Check After Reasoning"
      : homeworkPolicy.policyName,
  };
}
