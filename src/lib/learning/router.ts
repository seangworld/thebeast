import { aiSpecialistRegistry } from "./aiRegistry";
import { detectLearningIntent } from "./intentDetection";
import type { AIRouterInput, AIRouterResult, AISpecialistContract } from "./types";

function scoreSpecialist(input: AIRouterInput, specialist: AISpecialistContract) {
  const request = input.userRequest.toLowerCase();
  const goal = input.goal.toLowerCase();
  const subject = input.subject.toLowerCase();
  let score = 0;

  if (
    specialist.supportedSubjects.some(
      (item) => item.toLowerCase() === "all" || item.toLowerCase() === subject
    )
  ) {
    score += 3;
  }
  if (specialist.supportedGoals.some((item) => goal.includes(item.toLowerCase()))) {
    score += 3;
  }
  if (request.includes("homework") && specialist.id === "homework-coach") score += 10;
  if (request.includes("career") && specialist.id === "career-mentor") score += 6;
  if ((request.includes("certification") || request.includes("security+")) && specialist.id === "certification-coach") score += 6;
  if (request.includes("motivat") && specialist.id === "motivation-coach") score += 6;
  if (request.includes("math") && specialist.id === "math-coach") score += 6;
  if (request.includes("code") && specialist.id === "coding-coach") score += 6;
  if (input.conversationType === "Assessment" && specialist.supportedOutputTypes.includes("assessment")) score += 2;
  if (input.mastery.toLowerCase().includes("needs review") && specialist.supportedOutputTypes.includes("review")) score += 2;

  return score;
}

export function routeLearningAI(input: AIRouterInput): AIRouterResult {
  const intent = detectLearningIntent(input.userRequest);
  const ranked = aiSpecialistRegistry
    .map((specialist) => ({ specialist, score: scoreSpecialist(input, specialist) }))
    .sort((a, b) => b.score - a.score || a.specialist.name.localeCompare(b.specialist.name));
  const bestScore = ranked[0]?.score || 0;
  const selected =
    bestScore > 0
      ? ranked.filter((item) => item.score === bestScore).slice(0, 2).map((item) => item.specialist)
      : [aiSpecialistRegistry.find((item) => item.id === "tutor") || aiSpecialistRegistry[0]];

  return {
    selectedSpecialistIds: selected.map((specialist) => specialist.id),
    selectedSpecialistNames: selected.map((specialist) => specialist.name),
    reasonSelected: `Matched ${intent} intent for ${input.subject} and ${input.conversationType}.`,
    confidence: "reserved",
  };
}
