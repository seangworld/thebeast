import type { RuntimeContext, RuntimePlan } from "./types";

export type DigitalStaffInteractionPolicy = {
  mode: "answer" | "consequential_action";
  canonicalContextAvailable: boolean;
  clarificationRule: string;
  confirmationRule: string;
};

const consequentialAction = /\b(?:pay|purchase|buy|delete|send|submit|save|update|change|create|schedule|cancel|transfer|move|withdraw|apply|enroll)\b/i;
const executionRequest = /\b(?:please|can you|could you|will you|go ahead|i authorize|i want you to|do it|for me)\b/i;
const imperativeExecution = /^\s*(?:pay|purchase|buy|delete|send|submit|save|update|change|create|schedule|cancel|transfer|move|withdraw|apply|enroll)\b/i;
const permissionQuestion = /\b(?:may i|can i|do i have (?:your )?permission|would you like me to|do you want me to)\b.{0,100}\b(?:read|look|check|review|inspect|access|use|analy[sz]e)\b/i;

function normalizedQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function requestsConsequentialAction(text: string) {
  return consequentialAction.test(text)
    && (executionRequest.test(text) || imperativeExecution.test(text));
}

export function buildDigitalStaffInteractionPolicy(
  context: Pick<RuntimeContext, "message" | "recentMessages" | "memories" | "structuredRecords">
): DigitalStaffInteractionPolicy {
  const mode = requestsConsequentialAction(context.message.text)
    ? "consequential_action"
    : "answer";
  return {
    mode,
    canonicalContextAvailable:
      context.structuredRecords.length > 0
      || context.memories.length > 0
      || context.recentMessages.length > 0,
    clarificationRule:
      "Ask exactly one concise clarification only when the missing fact is required to avoid a materially wrong answer. Otherwise answer now and state any material assumption.",
    confirmationRule: mode === "consequential_action"
      ? "Do not execute or claim success. Prepare only an allowed proposal or confirmation-required tool action."
      : "Do not ask permission to read or analyze already-authorized Beast context. Answer directly.",
  };
}

export function applyDigitalStaffInteractionPolicy(
  context: RuntimeContext,
  plan: RuntimePlan
) {
  const policy = buildDigitalStaffInteractionPolicy(context);
  const proposedQuestion = plan.nextQuestion?.trim() || "";
  if (!proposedQuestion) return { ...plan, policyFailures: [] as string[] };

  const normalized = normalizedQuestion(proposedQuestion);
  const priorQuestions = [
    context.state.lastProfessionalQuestion,
    ...context.state.unresolvedQuestions,
    ...context.recentMessages
      .filter((message) => message.role === "assistant")
      .map((message) => message.text),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizedQuestion);
  const repeated = Boolean(normalized) && priorQuestions.some((question) =>
    question === normalized || question.includes(normalized) || normalized.includes(question)
  );
  const unnecessaryPermission = policy.mode === "answer"
    && policy.canonicalContextAvailable
    && permissionQuestion.test(proposedQuestion);

  if (!repeated && !unnecessaryPermission) {
    return { ...plan, policyFailures: [] as string[] };
  }

  const policyFailures = [
    repeated ? "Suppressed a repeated clarification question." : "",
    unnecessaryPermission ? "Suppressed an unnecessary permission request for already-authorized context." : "",
  ].filter(Boolean);
  return {
    ...plan,
    intent: plan.intent === "clarification" ? "answer" as const : plan.intent,
    nextQuestion: null,
    state: {
      ...plan.state,
      lastProfessionalQuestion: null,
      unresolvedQuestions: plan.state.unresolvedQuestions.filter(
        (question) => normalizedQuestion(question) !== normalized
      ),
    },
    policyFailures,
  };
}
