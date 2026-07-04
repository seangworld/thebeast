import type { AISessionState } from "./types";

export function createMockAISession({
  specialistId,
  topic,
  learningObjective,
}: {
  specialistId: string;
  topic: string;
  learningObjective: string;
}): AISessionState {
  return {
    conversationId: `mock-session-${specialistId}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    specialistId,
    durationPlaceholder: "15 min planning block",
    topic,
    learningObjective,
    completed: false,
  };
}
