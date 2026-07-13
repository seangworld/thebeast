export const learnerReflectionOptions = [
  "Easy",
  "Okay",
  "Hard",
  "I guessed",
  "I'm frustrated",
] as const;

export type LearnerReflectionOption = (typeof learnerReflectionOptions)[number];

export type LearnerReflectionInput = {
  option?: LearnerReflectionOption | "";
  note?: string;
  mastered: boolean;
  recommendedReview: boolean;
  nextRecommendation: string;
};

export type LearnerReflectionOutcome = {
  confidenceAdjustment: "advance" | "continue" | "reinforce" | "lower-confidence" | "reduce-pressure";
  mentorResponse: string;
  nextAction: string;
  recommendationReason: string;
};

function sanitizeNote(value = "") {
  return value.trim().slice(0, 500);
}

export function buildLearnerReflectionOutcome(
  input: LearnerReflectionInput
): LearnerReflectionOutcome {
  const option = input.option || "Okay";

  if (option === "Easy") {
    return {
      confidenceAdjustment: "advance",
      mentorResponse:
        "That felt manageable, so I can consider moving faster or shortening repeated review.",
      nextAction: input.mastered
        ? `Continue toward ${input.nextRecommendation}.`
        : "Do one quick confirmation check before advancing.",
      recommendationReason:
        "The learner reported the session felt easy, so the Mentor can reduce repetition if mastery evidence agrees.",
    };
  }

  if (option === "Hard") {
    return {
      confidenceAdjustment: "reinforce",
      mentorResponse:
        "That took effort. I will reinforce the weak concept before stacking more on top.",
      nextAction: "Use a smaller review step before the next full lesson.",
      recommendationReason:
        "The learner reported difficulty, so the Mentor should prioritize reinforcement or remediation.",
    };
  }

  if (option === "I guessed") {
    return {
      confidenceAdjustment: "lower-confidence",
      mentorResponse:
        "Thanks for saying that. I will treat the result as lower-confidence evidence, even if an answer was correct.",
      nextAction: "Repeat the idea with a different example before counting it as stable.",
      recommendationReason:
        "Guessing lowers confidence because correctness alone may not show durable understanding.",
    };
  }

  if (option === "I'm frustrated") {
    return {
      confidenceAdjustment: "reduce-pressure",
      mentorResponse:
        "We can lower the pressure. I will choose a smaller next step or pause instead of pushing ahead.",
      nextAction: "Take a short reset, then try one smaller guided step.",
      recommendationReason:
        "Frustration changes the immediate recommendation toward lower pressure and smaller steps.",
    };
  }

  return {
    confidenceAdjustment: "continue",
    mentorResponse:
      "Okay is useful signal. I will keep the current progression and watch the next result.",
    nextAction: input.recommendedReview
      ? "Review the current concept once more."
      : `Continue toward ${input.nextRecommendation}.`,
    recommendationReason:
      "The learner reported an okay fit, so the Mentor can continue the current progression.",
  };
}

export function buildLearnerReflectionStorage(input: LearnerReflectionInput) {
  const outcome = buildLearnerReflectionOutcome(input);

  return {
    reflection_option: input.option || null,
    reflection_note: sanitizeNote(input.note),
    reflection_confidence_adjustment: outcome.confidenceAdjustment,
    reflection_next_action: outcome.nextAction,
  };
}
