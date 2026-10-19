import type { RuntimeContext } from "./types";

const secondaryTheory = /\bsecondary(?:\s+(?:service[- ]?connection|service[- ]connected\s+(?:condition|disability)|condition|claim))\b|\bsecondarily\b.{0,120}\b(?:caus\w*|aggravat\w*)\b/i;
const explicitSecondaryRequest = /\bsecondary\b/i;

const directServicePreparationFallback = "For a direct service-connection claim, VA generally looks for a current condition, an in-service event or injury, and a connection between them. To prepare, gather service records or first-hand statements relevant to the condition described in the decision, then ask a clinician to independently assess whether the available evidence supports a connection, including uncertainty and contrary evidence. See VA’s official evidence guidance: https://www.va.gov/disability/how-to-file-claim/evidence-needed/.";

/**
 * Keep decision-letter answers scoped to the user's request. The model must not
 * add an unrequested secondary-service theory to an evidence review. Prior
 * assistant prose is intentionally excluded when deciding what the user asked.
 */
export function guardUnrequestedVeteransSecondaryTheory(context: RuntimeContext, response: string) {
  if (context.professionalId !== "beasthealth.health-advisor") {
    return { safe: true as const, response, failures: [] as string[] };
  }

  const userMessages = [
    ...context.recentMessages.filter((message) => message.role === "user").map((message) => message.text),
    context.message.text,
  ];
  const userText = userMessages.join("\n");
  const documentTitles = (context.documents || []).map((document) => document.title).join("\n");
  const isVaDecisionReview = /\b(?:decision(?:\s+letter)?|denial)\b/i.test(userText)
    && (/\b(?:VA|veteran|claim)\b/i.test(userText) || /\bVA\b/i.test(documentTitles))
    && /\b(?:requirements?|relat(?:e|es|ed)|apply|evidence|explain|prepar\w*)\b/i.test(userText);

  if (!isVaDecisionReview || explicitSecondaryRequest.test(userText) || !secondaryTheory.test(response)) {
    return { safe: true as const, response, failures: [] as string[] };
  }

  return {
    safe: false as const,
    response: directServicePreparationFallback,
    failures: ["unrequested-secondary-veterans-theory"],
  };
}
