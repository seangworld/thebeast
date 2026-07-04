import type { LearningConversationType, LearningIntent } from "./types";

export function detectLearningIntent(request: string): LearningIntent {
  const value = request.toLowerCase();

  if (value.includes("homework")) return "Homework help";
  if (value.includes("quiz")) return "Quiz me";
  if (value.includes("practice")) return "Practice";
  if (value.includes("review")) return "Review";
  if (value.includes("career") || value.includes("job")) return "Career advice";
  if (value.includes("certification") || value.includes("security+")) return "Certification";
  if (value.includes("summarize") || value.includes("summary")) return "Summarize";
  if (value.includes("research")) return "Research";
  if (value.includes("explain")) return "Explain";
  if (value.includes("understand")) return "Help me understand";

  return "Teach me";
}

export function conversationTypeFromIntent(intent: LearningIntent): LearningConversationType {
  const map: Record<LearningIntent, LearningConversationType> = {
    "Teach me": "Lesson",
    "Help me understand": "Explanation",
    Review: "Review",
    Practice: "Practice",
    "Quiz me": "Assessment",
    Explain: "Explanation",
    "Career advice": "Career Advice",
    Certification: "Planning",
    "Homework help": "Question",
    Summarize: "Review",
    Research: "Planning",
  };

  return map[intent];
}
