import type { RuntimeContext } from "./types";

const secondaryTheory = /\bsecondary(?:\s+(?:service[- ]?connection|service[- ]connected\s+(?:condition|disability)|condition|claim|to))\b|\bsecondarily\b.{0,120}\b(?:caus\w*|aggravat\w*)\b/i;
const explicitSecondaryRequest = /\b(?:explain|define|describe|compare|discuss|what\s+(?:is|does)|can|could|would|should)\b.{0,80}\bsecondary\b/i;
const rejectsSecondaryDiscussion = /\b(?:do\s+not|don't|never|avoid|without)\b.{0,50}\bsecondary\b/i;

const theoryDetail = /\bsecondary\b|\bsecondarily\b|\baltered[- ]gait\b|\b(?:another|other|existing|already)[ -]+service[- ]connected\b/i;
const withheldNotice = "I withheld part of this answer because it introduced a claim theory outside your request. The remaining text may be incomplete; it is not a complete review of the decision.";

/**
 * Remove whole contaminated paragraphs/list blocks, never splice fragments
 * into a new medical assertion. A contaminated heading removes its section,
 * including dependent prose, until a peer or higher-level heading. Retained
 * text is still model output and MUST pass the normal output safety checks.
 * This is not a source-verification or complete-answer certification.
 */
function retainScopedContent(response: string): string {
  let withheldSectionLevel: number | null = null;
  const retained: string[] = [];
  for (const block of response.split(/\n\s*\n/)) {
    const heading = /^(#{1,6})\s+([^\n]+)/.exec(block.trim());
    if (heading && withheldSectionLevel !== null && heading[1].length <= withheldSectionLevel) withheldSectionLevel = null;
    if (theoryDetail.test(block)) withheldSectionLevel = Math.min(withheldSectionLevel ?? 6, heading?.[1].length ?? 6);
    if (withheldSectionLevel !== null) continue;
    if (block.trim()) retained.push(block.trim());
  }
  return retained.length ? `${retained.join("\n\n")}\n\n${withheldNotice}` : withheldNotice;
}

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
  const currentUserAskedAboutSecondary = explicitSecondaryRequest.test(context.message.text)
    && !rejectsSecondaryDiscussion.test(context.message.text);

  if (!isVaDecisionReview || currentUserAskedAboutSecondary || !secondaryTheory.test(response)) {
    return { safe: true as const, response, failures: [] as string[] };
  }

  return {
    safe: false as const,
    response: retainScopedContent(response),
    failures: ["unrequested-secondary-veterans-theory"],
  };
}
