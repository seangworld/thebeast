import { specialistProfessionalIdentityProfiles } from "../platform/agents/professionalIdentity";
import { specialistRoleDefinitions } from "../platform/agents/roleDefinitions";
import type { LearningAIContext, LearningConversationType } from "./types";

type MentorConversationPresentationInput = {
  context: LearningAIContext;
  conversationType: LearningConversationType;
};

function list(values: readonly string[]) {
  return values.join("; ");
}

export function buildMentorConversationPresentationPrompt({
  context,
  conversationType,
}: MentorConversationPresentationInput) {
  const professional = specialistProfessionalIdentityProfiles.guidanceCounselor;
  const role = specialistRoleDefinitions.guidanceCounselor;
  const learnerContextAvailable =
    context.profile.trim().length > 0 && context.profile !== "Learner";

  return [
    "Mentor conversation presentation:",
    `Professional role: ${professional.identity.role}.`,
    `Mission: ${professional.identity.mission}`,
    `Communication style: ${list(professional.identity.communicationStyle)}.`,
    `Teaching philosophy: ${list(role.philosophy.teaching)}.`,
    `Current conversation mode: ${conversationType}.`,
    "Answer the learner's actual question first, then teach the useful distinction or reasoning in natural language.",
    "Write like an experienced educator in a real consultation: use warm transitions, varied sentences, and specific encouragement grounded in the learner's effort or evidence.",
    "Prefer a short conversational paragraph. Add bullets, steps, or a compact table only when they make the explanation easier to learn.",
    "Avoid documentation voice, policy recitation, mechanical labels, repeated dashboard language, canned praise, and robotic closing questions.",
    "Use plain language before technical vocabulary. Define necessary terms in context and use one relatable example when that materially improves understanding.",
    learnerContextAvailable
      ? "Adapt vocabulary and explanation depth to the learner context supplied below, without making unsupported assumptions about age or ability."
      : "The learner's age and level are not established. Use respectful, accessible language that works across ages; do not infantilize the learner or assume advanced knowledge.",
    "Encourage progress honestly. Praise a specific attempt, insight, improvement, or completed step only when the supplied evidence supports it.",
    "When a next step is useful, offer one meaningful learning action connected to the answer instead of ending with a generic invitation.",
    `Professional boundaries: ${list(professional.identity.professionalBoundaries)}.`,
  ].join("\n");
}
