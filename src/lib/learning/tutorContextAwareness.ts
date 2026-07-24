import {
  SharedConsultationIntelligence,
  recognizeConversationIntent,
} from "../platform/agents";

export type TutorMemberIntentContext =
  | "learning"
  | "platform-test"
  | "product-evaluation"
  | "demonstration"
  | "product-development";

export type TutorContextUnderstanding = {
  context: TutorMemberIntentContext;
  explicit: boolean;
  acknowledgement?: string;
  consultationFactCount: number;
  signals: readonly string[];
};

const contextPatterns: ReadonlyArray<{
  context: Exclude<TutorMemberIntentContext, "learning">;
  pattern: RegExp;
  signal: string;
}> = [
  {
    context: "product-development",
    pattern:
      /\b(i(?:'m| am)|we(?:'re| are))\s+(?:building|developing|working on|implementing|debugging)\s+(?:the\s+)?(?:beast|beasteducation|platform|product)\b/i,
    signal: "explicit-product-development",
  },
  {
    context: "product-evaluation",
    pattern:
      /\b(i(?:'m| am)|we(?:'re| are))\s+(?:evaluating|reviewing|assessing)\s+(?:the\s+)?(?:beast|beasteducation|platform|product|tutor)\b/i,
    signal: "explicit-product-evaluation",
  },
  {
    context: "demonstration",
    pattern:
      /\b(i(?:'m| am)|we(?:'re| are))\s+(?:demoing|demonstrating|showing)\s+(?:the\s+)?(?:beast|beasteducation|platform|product|tutor|functionality)\b/i,
    signal: "explicit-demonstration",
  },
  {
    context: "platform-test",
    pattern:
      /\b(i(?:'m| am)|we(?:'re| are)|just)\s+(?:only\s+|just\s+)?testing\s+(?:the\s+)?(?:beast|beasteducation|platform|product|tutor|functionality|experience)\b/i,
    signal: "explicit-platform-test",
  },
  {
    context: "platform-test",
    pattern: /^(?:test|testing|test message|does this work|is this working)[?!. ]*$/i,
    signal: "common-test-message",
  },
];

function acknowledgement(context: TutorMemberIntentContext) {
  if (context === "product-development") {
    return "Understood—you’re working on Beast, not presenting this as ordinary course work. I’ll treat this as a product-development check and be direct about what the Tutor is doing.";
  }
  if (context === "product-evaluation") {
    return "Understood—you’re evaluating BeastEducation rather than taking this lesson as a typical learner. I’ll respond in evaluation mode and make the Tutor behavior visible.";
  }
  if (context === "demonstration") {
    return "Understood—you’re demonstrating the Tutor experience. I’ll help the demonstration without pretending this turn is evidence of course mastery.";
  }
  if (context === "platform-test") {
    return "Understood—you’re testing the Tutor experience. I’ll treat this as a platform check, not as evidence that you completed or understood the lesson.";
  }
  return undefined;
}

export function understandTutorMemberIntent(
  message: string,
  current: TutorMemberIntentContext = "learning"
): TutorContextUnderstanding {
  const consultation = new SharedConsultationIntelligence().understand(message);
  const commonIntent = recognizeConversationIntent(message);
  if (
    /\b(i(?:'m| am)|we(?:'re| are))\s+(?:actually\s+)?(?:taking|studying|learning|completing)\s+(?:this|the)\s+(?:course|lesson|material)\b/i.test(
      message
    )
  ) {
    return {
      context: "learning",
      explicit: true,
      consultationFactCount: consultation.explicitFacts.length,
      signals: ["explicit-learning-context"],
    };
  }

  const matched = contextPatterns.find(({ pattern }) => pattern.test(message));
  const nextContext =
    matched?.context ||
    (commonIntent.kind === "testing" ? "platform-test" : current);
  const explicit = Boolean(matched) || commonIntent.kind === "testing";
  return {
    context: nextContext,
    explicit,
    acknowledgement: explicit ? acknowledgement(nextContext) : undefined,
    consultationFactCount: consultation.explicitFacts.length,
    signals: matched
      ? [matched.signal, ...commonIntent.signals]
      : commonIntent.signals,
  };
}

export function buildTutorContextualResponse(
  understanding: TutorContextUnderstanding
) {
  const acknowledgementText =
    understanding.acknowledgement || acknowledgement(understanding.context);
  if (!acknowledgementText) return undefined;
  if (understanding.context === "product-development") {
    return `${acknowledgementText} You can ask me to exercise explanation, hinting, knowledge checks, lesson-state updates, scrolling, or the Guidance Counselor handoff.`;
  }
  if (understanding.context === "product-evaluation") {
    return `${acknowledgementText} I can show how I explain a concept, adapt after confusion, check understanding, or hand progress back to the Guidance Counselor.`;
  }
  if (understanding.context === "demonstration") {
    return `${acknowledgementText} Tell me which behavior you want to demonstrate—teaching, hints, a knowledge check, adaptation, or handoff—and I’ll continue in that mode.`;
  }
  return `${acknowledgementText} Tell me which behavior you want to test—response quality, hints, knowledge checks, scrolling, saved history, or handoff—and I’ll continue in that context.`;
}
