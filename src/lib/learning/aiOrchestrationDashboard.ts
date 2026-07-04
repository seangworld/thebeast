import { aiSpecialistRegistry, getAISpecialistById } from "./aiRegistry";
import { createMockAISession } from "./aiSessionManager";
import { buildLearningAIContext } from "./contextBuilder";
import { mockConversationMemory } from "./conversationMemory";
import { getHomeworkPolicyForRequest } from "./homeworkPolicy";
import { conversationTypeFromIntent, detectLearningIntent } from "./intentDetection";
import { routeLearningAI } from "./router";
import type { AIOrchestrationDashboard, MasteryProfile } from "./types";

export function buildAIOrchestrationDashboard({
  learnerName,
  mastery,
}: {
  learnerName: string;
  mastery: MasteryProfile;
}): AIOrchestrationDashboard {
  const request = "Help me understand this Security+ access control homework without giving me the answer first.";
  const intent = detectLearningIntent(request);
  const context = buildLearningAIContext({
    learnerName,
    mastery,
    weakAreas: mastery.weakConcepts,
    currentLesson: "Access Control",
  });
  const routerResult = routeLearningAI({
    userRequest: request,
    context,
    goal: "homework help",
    subject: "Cybersecurity",
    currentLesson: context.currentLesson,
    mastery: "Needs Review",
    conversationType: conversationTypeFromIntent(intent),
  });
  const selectedSpecialistId = routerResult.selectedSpecialistIds[0] || "tutor";
  const selectedSpecialist = getAISpecialistById(selectedSpecialistId);

  return {
    registry: aiSpecialistRegistry,
    context,
    intent,
    routerResult,
    memory: mockConversationMemory,
    homeworkPolicy: getHomeworkPolicyForRequest(request),
    session: createMockAISession({
      specialistId: selectedSpecialistId,
      topic: context.currentLesson,
      learningObjective: "Use guided reasoning to understand access control.",
    }),
    availableSpecialists: aiSpecialistRegistry,
    requiredContext: selectedSpecialist?.requiredContext || [],
    futureAIStatus: "OpenAI adapter is available when credentials are configured. Specialist routing, context, memory, and homework policies remain deterministic.",
  };
}
