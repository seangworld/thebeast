export type AnswerValidationRule =
  | "exact"
  | "case-insensitive"
  | "ignore-spacing"
  | "ignore-punctuation"
  | "numeric-equivalence"
  | "accepted-answer";

export type AnswerValidationResult = {
  correct: boolean;
  matchedRule: AnswerValidationRule | null;
  normalizedLearnerAnswer: string;
  normalizedAcceptedAnswers: string[];
};

export function normalizeAnswerForValidation(value: string, rules: AnswerValidationRule[] = []) {
  let normalized = value.trim();

  if (rules.includes("case-insensitive") || rules.includes("accepted-answer")) {
    normalized = normalized.toLowerCase();
  }
  if (rules.includes("ignore-punctuation")) {
    normalized = normalized.replace(/[^a-zA-Z0-9\s=+\-*/.]/g, "");
  }
  if (rules.includes("ignore-spacing") || rules.includes("accepted-answer")) {
    normalized = normalized.replace(/\s+/g, "");
  }
  if (rules.includes("numeric-equivalence")) {
    const numeric = Number(normalized.replace(/,/g, ""));
    if (Number.isFinite(numeric)) return String(numeric);
  }

  return normalized;
}

export function validateAnswer({
  learnerAnswer,
  expectedAnswer,
  acceptedAnswers = [],
  rules = ["accepted-answer", "case-insensitive", "ignore-spacing"],
}: {
  learnerAnswer: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
  rules?: AnswerValidationRule[];
}): AnswerValidationResult {
  const candidates = acceptedAnswers.length ? acceptedAnswers : [expectedAnswer];
  const normalizedLearnerAnswer = normalizeAnswerForValidation(learnerAnswer, rules);
  const normalizedAcceptedAnswers = candidates.map((answer) =>
    normalizeAnswerForValidation(answer, rules)
  );
  const matched = normalizedAcceptedAnswers.includes(normalizedLearnerAnswer);

  if (matched) {
    return {
      correct: true,
      matchedRule: rules.includes("numeric-equivalence")
        ? "numeric-equivalence"
        : rules.includes("accepted-answer")
          ? "accepted-answer"
          : rules[0] || "exact",
      normalizedLearnerAnswer,
      normalizedAcceptedAnswers,
    };
  }

  return {
    correct: false,
    matchedRule: null,
    normalizedLearnerAnswer,
    normalizedAcceptedAnswers,
  };
}
