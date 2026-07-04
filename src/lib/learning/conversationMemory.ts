import type { LearningConversationMemory } from "./types";

export const mockConversationMemory: LearningConversationMemory = {
  activeTopic: "Access Control",
  lastConcept: "role-based-access-control",
  currentLesson: "Access Control",
  openQuestions: [
    "When should direct permissions be avoided?",
    "How does least privilege change a role design?",
  ],
  reviewRequests: ["Review RBAC with a practical example"],
  conversationSummary:
    "Learner is working through identity and access concepts and benefits from guided examples.",
};

export function updateMockConversationMemory({
  topic,
  question,
}: {
  topic: string;
  question: string;
}): LearningConversationMemory {
  return {
    ...mockConversationMemory,
    activeTopic: topic,
    openQuestions: [...mockConversationMemory.openQuestions, question],
  };
}
